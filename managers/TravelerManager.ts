import { World } from 'hytopia';
import { getTradesByCategory, formatTradeForUI, getAvailableTradeCategories, getTradeById } from '../config/travelerTrades';
import { GameManager } from './GameManager';

export class TravelerManager {
    private isTravelerOpen: boolean = false;

    constructor(
        private world: World,
        private gameManager: GameManager
    ) {
        console.log("[TravelerManager] Initialized");
    }

    public toggleTraveler(playerManager: any): void {
        this.isTravelerOpen = !this.isTravelerOpen;
        
        if (!playerManager) {
            console.error(`[TravelerManager] Invalid player manager`);
            return;
        }
        
        // Get the player
        const player = playerManager.player;
        if (!player || !player.ui) {
            console.error(`[TravelerManager] Could not access player UI`);
            return;
        }
        
        console.log(`[TravelerManager] Toggle traveler UI: ${this.isTravelerOpen ? 'OPEN' : 'CLOSE'}`);
        
        // Send data to the UI
        try {
            const categories = this.isTravelerOpen ? getAvailableTradeCategories() : [];
            const initialCategory = categories.length > 0 ? categories[0] : 'special';
            const trades = this.isTravelerOpen ? getTradesByCategory(initialCategory).map(formatTradeForUI) : [];
            
            console.log(`[TravelerManager] Sending UI data with ${categories.length} categories and ${trades.length} trades`);
            
            player.ui.sendData({
                travelerToggle: {
                    isOpen: this.isTravelerOpen,
                    categories: categories,
                    initialCategory: initialCategory,
                    trades: trades
                }
            });
            
            // If we're opening the traveler, unlock the pointer
            if (this.isTravelerOpen) {
                player.ui.lockPointer(false);
                console.log('[TravelerManager] Disabled pointer lock for traveler UI');
            } else {
                player.ui.lockPointer(true);
                console.log('[TravelerManager] Re-enabled pointer lock after closing traveler UI');
            }
            
            console.log(`[TravelerManager] Traveler ${this.isTravelerOpen ? 'opened' : 'closed'} for player`);
        } catch (error) {
            console.error('[TravelerManager] Error toggling traveler UI:', error);
        }
    }
    
    public isOpen(): boolean {
        return this.isTravelerOpen;
    }
    
    public handleTradeRequest(playerId: string, tradeId: string): void {
        console.log(`[TravelerManager] Trade requested: ${tradeId} by player ${playerId}`);
        
        try {
            // Get the player manager
            const playerManager = this.gameManager.getPlayerManagerById(playerId);
            if (!playerManager) {
                console.error(`[TravelerManager] Could not find player manager for player ${playerId}`);
                return;
            }
            
            // Get the trade details
            const trade = getTradeById(tradeId);
            if (!trade) {
                console.error(`[TravelerManager] Trade with ID ${tradeId} not found`);
                this.sendTradeResult(playerManager, false, `Trade not found: ${tradeId}`);
                return;
            }
            
            // Get player inventory
            const playerInventory = playerManager.getPlayerInventory();
            if (!playerInventory) {
                console.error(`[TravelerManager] Could not access inventory for player ${playerId}`);
                this.sendTradeResult(playerManager, false, "Could not access inventory");
                return;
            }
            
            // Check if player has the required items and level
            const checkResult = this.checkTradeRequirements(trade, playerInventory, playerManager);
            if (!checkResult.canTrade) {
                console.log(`[TravelerManager] Player ${playerId} does not meet requirements for trade ${tradeId}: ${checkResult.message}`);
                this.sendTradeResult(playerManager, false, checkResult.message);
                return;
            }
            
            // Process the trade - remove required items
            const requirementsMet = this.removeRequiredItems(trade, playerInventory);
            if (!requirementsMet) {
                console.error(`[TravelerManager] Failed to remove required items for trade ${tradeId}`);
                this.sendTradeResult(playerManager, false, "Failed to process trade");
                return;
            }
            
            // Add the result item
            this.addResultItem(trade, playerInventory);
            
            // Send success notification
            this.sendTradeResult(playerManager, true, `Successfully traded for ${trade.name}`);
            
            console.log(`[TravelerManager] Trade ${tradeId} completed successfully for player ${playerId}`);
        } catch (error) {
            console.error(`[TravelerManager] Error processing trade request:`, error);
            
            // Try to send error message to player if possible
            try {
                const playerManager = this.gameManager.getPlayerManagerById(playerId);
                if (playerManager && playerManager.player && playerManager.player.ui) {
                    this.sendTradeResult(playerManager, false, "An error occurred while processing the trade");
                }
            } catch (e) {
                console.error(`[TravelerManager] Could not send error message to player:`, e);
            }
        }
    }
    
    private sendTradeResult(playerManager: any, success: boolean, message: string): void {
        if (!playerManager || !playerManager.player || !playerManager.player.ui) {
            console.error(`[TravelerManager] Cannot send trade result: invalid player manager`);
            return;
        }
        
        try {
            playerManager.player.ui.sendData({
                tradeResult: {
                    success,
                    message
                }
            });
        } catch (error) {
            console.error(`[TravelerManager] Error sending trade result:`, error);
        }
    }
    
    private checkTradeRequirements(trade: any, playerInventory: any, playerManager: any): { canTrade: boolean, message: string } {
        // Check player level if required
        if (trade.level && trade.level > 1) {
            const playerLevel = playerManager.getPlayerLevel ? playerManager.getPlayerLevel() : 1;
            if (playerLevel < trade.level) {
                return { 
                    canTrade: false, 
                    message: `You need to be level ${trade.level} to make this trade (current: ${playerLevel})`
                };
            }
        }
        
        // Check all required items
        const missingItems: string[] = [];
        
        for (const requirement of trade.requirements) {
            const itemCount = playerInventory.getItemCount(requirement.type);
            
            if (itemCount < requirement.count) {
                const itemDisplayName = requirement.type; // Ideally get display name from config
                missingItems.push(`${requirement.count - itemCount}x ${itemDisplayName}`);
            }
        }
        
        if (missingItems.length > 0) {
            return { 
                canTrade: false, 
                message: `Missing items: ${missingItems.join(", ")}`
            };
        }
        
        return { canTrade: true, message: "All requirements met" };
    }
    
    private removeRequiredItems(trade: any, playerInventory: any): boolean {
        // Attempt to remove each required item
        for (const requirement of trade.requirements) {
            const success = playerInventory.removeItem(requirement.type, requirement.count);
            if (!success) {
                console.error(`[TravelerManager] Failed to remove ${requirement.count}x ${requirement.type}`);
                return false;
            }
        }
        
        return true;
    }
    
    private addResultItem(trade: any, playerInventory: any): boolean {
        // Add the result item to the player's inventory
        const { type, count } = trade.result;
        
        try {
            // Get first available slot or use existing slot with same item type
            const addSuccess = playerInventory.addItem(type, count);
            
            if (!addSuccess) {
                console.error(`[TravelerManager] Failed to add ${count}x ${type} to inventory`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error(`[TravelerManager] Error adding result item:`, error);
            return false;
        }
    }
} 