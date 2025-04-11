import { World, Player, PlayerEvent, PlayerUIEvent, PlayerUI } from "hytopia";
import { DUNGEONS } from "../config/dungeons";
import { GameManager } from "./GameManager";

export class DungeonManager {
    private playerDungeonStates: Map<string, boolean> = new Map();
    private gameManager: GameManager;

    constructor(private world: World, gameManager: GameManager) {
        this.gameManager = gameManager;
        this.setupUI();
    }

    private setupUI() {
        // Listen for player join/leave events
        this.world.on(PlayerEvent.JOINED_WORLD, ({ player }: { player: Player }) => {
            this.playerDungeonStates.set(player.id, false);
        });

        this.world.on(PlayerEvent.LEFT_WORLD, ({ player }: { player: Player }) => {
            this.playerDungeonStates.delete(player.id);
        });

        // Listen for UI events
        this.world.on(PlayerUIEvent.DATA, ({ playerUI, data }: { playerUI: PlayerUI; data: Record<string, any> }) => {
            if (data.dungeonToggle?.action === 'close') {
                console.log('[DungeonManager] Received close action');
                this.toggleDungeon(playerUI.player, false);
            }
            
            // Handle dungeon action requests (fight button)
            if (data.dungeonAction) {
                this.handleDungeonAction(playerUI.player, data.dungeonAction);
            }
        });
    }
    
    // Handle dungeon action requests from the UI
    private handleDungeonAction(player: Player, action: any): void {
        if (action.action !== 'fight') {
            console.warn(`[DungeonManager] Unknown dungeon action: ${action.action}`);
            return;
        }
        
        const dungeonId = action.dungeonId;
        if (!dungeonId) {
            console.error('[DungeonManager] No dungeon ID provided for fight action');
            return;
        }
        
        // Find the dungeon in our config
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) {
            console.error(`[DungeonManager] Dungeon with ID ${dungeonId} not found`);
            player.ui.sendData({
                dungeonError: {
                    message: `Dungeon not found`
                }
            });
            return;
        }
        
        console.log(`[DungeonManager] Player ${player.id} attempting to fight dungeon: ${dungeon.name}`);
        
        // Get player level from LevelManager (preferred) or PlayerManager
        let playerLevel = 1;
        
        // Try to get level from LevelManager first
        const levelManager = this.gameManager.getLevelManager();
        if (levelManager) {
            playerLevel = levelManager.getPlayerLevel(player.id);
            console.log(`[DungeonManager] Got player level from LevelManager: ${playerLevel}`);
        } else {
            // Fallback to PlayerManager if needed
            const playerManager = this.getPlayerManager(player.id);
            if (playerManager && typeof playerManager.getPlayerLevel === 'function') {
                playerLevel = playerManager.getPlayerLevel();
                console.log(`[DungeonManager] Got player level from PlayerManager: ${playerLevel}`);
            }
        }
        
        console.log(`[DungeonManager] Player level: ${playerLevel}, Required level: ${dungeon.minLevel}`);
        
        // Check level requirement
        if (playerLevel < dungeon.minLevel) {
            console.log(`[DungeonManager] Player level too low: ${playerLevel} < ${dungeon.minLevel}`);
            player.ui.sendData({
                dungeonError: {
                    message: `You need to be level ${dungeon.minLevel} to enter this dungeon`,
                    type: 'level'
                }
            });
            return;
        }
        
        // Check if player has required key if needed
        if (dungeon.requiredKey) {
            console.log(`[DungeonManager] Checking for required key:`, dungeon.requiredKey);
            
            // Get the player's inventory manager
            const playerManager = this.getPlayerManager(player.id);
            if (!playerManager) {
                console.error(`[DungeonManager] Could not access player manager for player ${player.id}`);
                player.ui.sendData({
                    dungeonError: {
                        message: `Error accessing inventory`
                    }
                });
                return;
            }
            
            // Get player inventory using the standard method
            const playerInventory = playerManager.getPlayerInventory();
            if (!playerInventory) {
                console.error(`[DungeonManager] Could not find inventory for player ${player.id}`);
                player.ui.sendData({
                    dungeonError: {
                        message: `Error accessing inventory`
                    }
                });
                return;
            }
            
            // Get the key type from the dungeon config
            const keyType = dungeon.requiredKey.type || 'dungeon-key';
            const keyName = dungeon.requiredKey.displayName || "Dungeon Key";
            console.log(`[DungeonManager] Checking for key: ${keyType} (${keyName})`);
            
            // Check all inventory slots for the key
            let hasKey = false;
            for (let slot = 0; slot < 20; slot++) {
                const itemInSlot = playerInventory.getItem(slot);
                if (itemInSlot === keyType) {
                    const count = playerInventory.getItemCount(slot);
                    if (count > 0) {
                        hasKey = true;
                        console.log(`[DungeonManager] Found key in slot ${slot} with count ${count}`);
                        break;
                    }
                }
            }
            
            if (!hasKey) {
                console.log(`[DungeonManager] Player does not have required key: ${keyType}`);
                player.ui.sendData({
                    dungeonError: {
                        message: `You need a ${keyName} to enter this dungeon`,
                        type: 'key',
                        keyName: keyName,
                        keyType: keyType
                    }
                });
                return;
            } else {
                console.log(`[DungeonManager] Key check passed for player ${player.id} - has ${keyType}`);
            }
        }
        
        // All checks passed, start the dungeon fight
        console.log(`[DungeonManager] Starting dungeon fight for player ${player.id} in dungeon ${dungeon.name}`);
        
        // Success response
        player.ui.sendData({
            dungeonFightResult: {
                success: true,
                dungeonId: dungeonId,
                message: `Entering ${dungeon.name}...`
            }
        });
        
        // TODO: Start actual dungeon fight mechanics
        // This would be implemented based on your game's specific dungeon system
        
        // Close the dungeon UI
        this.toggleDungeon(player, false);
    }
    
    // Helper method to get player manager
    private getPlayerManager(playerId: string): any | null {
        return this.gameManager.getPlayerManagerById(playerId);
    }
    
    // Helper method to get player inventory
    private getPlayerInventory(playerId: string): any | null {
        // Try to get from player manager
        const playerManager = this.getPlayerManager(playerId);
        if (playerManager && typeof playerManager.getPlayerInventory === 'function') {
            return playerManager.getPlayerInventory();
        }
        
        return null;
    }

    public toggleDungeon(player: Player, shouldOpen?: boolean) {
        const currentState = this.playerDungeonStates.get(player.id) || false;
        const newState = shouldOpen ?? !currentState;
        
        console.log(`[DungeonManager] Toggling dungeon UI for player ${player.id} to ${newState}`);
        
        // Update state
        this.playerDungeonStates.set(player.id, newState);
        
        // Only proceed with data if we're opening the UI
        if (newState) {
            // Get player manager to update player stats in UI
            const playerManager = this.getPlayerManager(player.id);
            if (playerManager && typeof playerManager.sendPlayerStatsToUI === 'function') {
                playerManager.sendPlayerStatsToUI();
            }
            
            // Get dungeon data from config
            const dungeonData = Object.values(DUNGEONS).map(dungeon => {
                // Check if player has the required key for this dungeon
                let hasRequiredKey = false;
                if (dungeon.requiredKey && playerManager) {
                    const playerInventory = playerManager.getPlayerInventory();
                    if (playerInventory) {
                        // Check all inventory slots for the key
                        for (let slot = 0; slot < 20; slot++) {
                            const itemInSlot = playerInventory.getItem(slot);
                            if (itemInSlot === dungeon.requiredKey.type && playerInventory.getItemCount(slot) > 0) {
                                hasRequiredKey = true;
                                break;
                            }
                        }
                    }
                }
                
                // Create object for sending to client
                return {
                    id: dungeon.id,
                    name: dungeon.name,
                    imageUrl: dungeon.imageUrl,
                    minLevel: dungeon.minLevel,
                    requiredKey: dungeon.requiredKey ? {
                        type: dungeon.requiredKey.type || 'dungeon-key',
                        displayName: dungeon.requiredKey.displayName || 'Dungeon Key',
                        hasKey: hasRequiredKey
                    } : null,
                    bosses: dungeon.bosses.map(bossEntry => ({
                        name: bossEntry.boss.name,
                        count: bossEntry.count,
                    })),
                    loot: dungeon.lootTable.map(lootEntry => ({
                        item: lootEntry.item.type,
                        count: lootEntry.count,
                        dropChance: lootEntry.dropChance,
                    })),
                };
            });
            
            // Send UI update with data
            player.ui.sendData({
                dungeonToggle: {
                    isOpen: true,
                    dungeons: dungeonData
                },
                inventoryToggle: {
                    isOpen: true,
                    closeButtonEnabled: false
                }
            });
        } else {
            // Just send close command if closing
            player.ui.sendData({
                dungeonToggle: {
                    isOpen: false,
                    dungeons: null
                },
                inventoryToggle: {
                    isOpen: false,
                    closeButtonEnabled: true
                }
            });
        }

        // Update pointer lock
        player.ui.lockPointer(!newState);
    }

    public isDungeonUIOpen(player: Player): boolean {
        return this.playerDungeonStates.get(player.id) || false;
    }

    // Add methods for dungeon management here
} 