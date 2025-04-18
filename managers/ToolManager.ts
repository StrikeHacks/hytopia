import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup, BlockType } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { ItemSpawner } from './ItemSpawner';
import { getToolItem } from '../config/tools';
import { blockConfigs, getBlockConfig, getBlockRespawnConfig } from '../config/blocks';
import { ItemInstanceManager } from '../items/ItemInstanceManager';
import { GameManager } from './GameManager';
import { BaseItem } from '../items/BaseItem';

export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    damage: number;  // Damage per click
}

export interface BlockConfig {
    hp: number;
    drops?: string[];
}

export class ToolManager {
    private blockDamages: Map<string, { totalDamage: number; lastDamageTime: number }> = new Map();
    private lastHitBlock: string | null = null;
    private resetTimer: NodeJS.Timer | null = null;
    private readonly RESET_DELAY = 1000; // Delay before resetting block damage
    private readonly CLICK_PENALTY_THRESHOLD = 200; // Time threshold in ms to detect rapid clicking
    private respawnTimers: Map<string, NodeJS.Timer> = new Map();

    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner,
        private gameManager: GameManager
    ) {
        console.log('[ToolManager] Initialized');
        
        // Ensure ItemInstanceManager is initialized
        ItemInstanceManager.getInstance();
    }

    public isTool(item: string): boolean {
        const toolItem = getToolItem(item);
        return !!toolItem;
    }

    private resetBlockDamage(inventory: PlayerInventory, blockKey: string | null = null): void {
        if (blockKey) {
            // Reset specific block
            this.blockDamages.delete(blockKey);
        } else {
            // Reset all blocks
            this.blockDamages.clear();
        }
        
        // Reset UI progress
        inventory.updateMiningProgressUI(0);
        this.lastHitBlock = null;
    }

    private scheduleReset(inventory: PlayerInventory, blockKey: string): void {
        // Clear any existing timer
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
        }

        // Set new timer
        this.resetTimer = setTimeout(() => {
            this.resetBlockDamage(inventory, blockKey);
        }, this.RESET_DELAY);
    }

    public canBreakBlock(toolType: string, blockId: number): boolean {
        const toolItem = getToolItem(toolType);
        if (!toolItem) {
            return false;
        }
        const canBreak = toolItem.canBreak.includes(blockId.toString());
        return canBreak;
    }

    private scheduleBlockRespawn(blockId: number, position: { x: number; y: number; z: number }): void {
        const blockKey = this.coordinateToKey(position);
        const respawnConfig = getBlockRespawnConfig(blockId);

        if (!respawnConfig?.enabled) {
            return;
        }

        // Clear any existing respawn timer for this block
        if (this.respawnTimers.has(blockKey)) {
            clearTimeout(this.respawnTimers.get(blockKey)!);
        }

        // Schedule block respawn
        const timer = setTimeout(() => {
            this.world.chunkLattice.setBlock(position, blockId);
            this.respawnTimers.delete(blockKey);
        }, respawnConfig.delay);

        this.respawnTimers.set(blockKey, timer);
    }

    public tryMineBlock(playerEntity: PlayerEntity): void {
        const playerId = String(playerEntity.player.id);
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            return;
        }

        const selectedSlot = inventory.getSelectedSlot();
        const heldItem = inventory.getItem(selectedSlot);
        if (!heldItem) {
            return;
        }

        // Get tool configuration
        const toolItem = getToolItem(heldItem);
        if (!toolItem) {
            return;
        }
        
        // Check if tool is broken
        if (inventory.isItemBroken(selectedSlot)) {
            return;
        }

        const direction = playerEntity.player.camera.facingDirection;
        const origin = {
            x: playerEntity.position.x,
            y: playerEntity.position.y + playerEntity.player.camera.offset.y + 0.33,
            z: playerEntity.position.z
        };

        const raycastResult = this.world.simulation.raycast(origin, direction, 4, {
            filterExcludeRigidBody: playerEntity.rawRigidBody
        });

        if (!raycastResult?.hitBlock) {
            // Player is not looking at any block, reset damage
            if (this.lastHitBlock) {
                this.resetBlockDamage(inventory, this.lastHitBlock);
            }
            return;
        }

        const hitPos = raycastResult.hitBlock.globalCoordinate;
        const blockId = this.world.chunkLattice.getBlockId(hitPos);
        const currentBlockKey = this.coordinateToKey(hitPos);
        


        // Check if player is looking at a different block
        if (this.lastHitBlock && this.lastHitBlock !== currentBlockKey) {
            this.resetBlockDamage(inventory, this.lastHitBlock);
        }

        if (!blockId) {
            return;
        }

        // Get block configuration
        const blockConfig = getBlockConfig(blockId);
        if (!blockConfig) {
            return;
        }

        if (!this.canBreakBlock(heldItem, blockId)) {
            return;
        }

        // Get existing damage or create new damage tracker
        let blockDamage = this.blockDamages.get(currentBlockKey);
        if (!blockDamage) {
            blockDamage = {
                totalDamage: 0,
                lastDamageTime: Date.now()
            };
            this.blockDamages.set(currentBlockKey, blockDamage);
        }

        const currentTime = Date.now();
        const timeSinceLastHit = currentTime - blockDamage.lastDamageTime;
        
        // Apply damage with a penalty for rapid clicking
        let damageToApply = toolItem.damage;
        if (timeSinceLastHit < this.CLICK_PENALTY_THRESHOLD) {
            // Reduce damage for rapid clicking
            damageToApply = toolItem.damage * 0.5;
        }
        
        blockDamage.totalDamage += damageToApply;
        blockDamage.lastDamageTime = currentTime;



        // Update UI with progress
        const progress = (blockDamage.totalDamage / blockConfig.hp) * 100;
        inventory.updateMiningProgressUI(Math.min(100, Math.max(0, progress)));

        // Schedule reset and update last hit block
        this.scheduleReset(inventory, currentBlockKey);
        this.lastHitBlock = currentBlockKey;

        // Check if block should break
        if (blockDamage.totalDamage >= blockConfig.hp) {
            
            // Decrease tool durability when a block is broken
            const itemStillUsable = inventory.decreaseItemDurability(selectedSlot, 1);
            
            // Handle drops if specified in block config
            if (blockConfig.drops) {
                const itemType = blockConfig.drops[0];
                
                // Try to add to inventory first
                const addResult = inventory.addItem(itemType, 1);
                
                // Check if item was successfully added
                if (addResult.success) {
                    console.log(`[ToolManager] Successfully added ${itemType} to player inventory`);
                } else {
                    // If inventory is full, drop the item on the ground
                    const dropPosition = {
                        x: playerEntity.position.x,
                        y: playerEntity.position.y + 1.5,
                        z: playerEntity.position.z
                    };
                    
                    // Drop the item
                    this.itemSpawner.handleBlockDrop(itemType, dropPosition, 1);
                    console.log(`[ToolManager] Inventory full, dropping ${itemType} on ground`);
                }
            }

            this.world.chunkLattice.setBlock(hitPos, 0); // Set to air
            this.blockDamages.delete(currentBlockKey);
            inventory.updateMiningProgressUI(0);
            this.lastHitBlock = null;

            // Schedule block respawn
            this.scheduleBlockRespawn(blockId, hitPos);

            // Clear reset timer when block is broken
            if (this.resetTimer) {
                clearTimeout(this.resetTimer);
                this.resetTimer = null;
            }

            // Award XP to the player if block has XP reward
            if (blockConfig.xpReward) {
                const levelManager = this.gameManager.getLevelManager();
                if (levelManager) {
                    levelManager.addPlayerXP(playerId, blockConfig.xpReward);
                    console.log(`[ToolManager] Awarded ${blockConfig.xpReward} XP to player ${playerId} for mining ${blockConfig.name}`);
                }
            }
        }
    }

    public cleanup(): void {
        // Clear all respawn timers
        this.respawnTimers.forEach(timer => clearTimeout(timer));
        this.respawnTimers.clear();

        // Clear reset timer
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    private coordinateToKey(coordinate: { x: number; y: number; z: number }): string {
        return `${coordinate.x},${coordinate.y},${coordinate.z}`;
    }
    
    /**
     * Repair a tool for a player
     */
    public repairTool(playerId: string, slot: number): boolean {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            return false;
        }
        
        return inventory.repairItem(slot);
    }
    
    /**
     * Get the current durability of a tool
     */
    public getToolDurability(playerId: string, slot: number): { current: number; max: number } | null {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            return null;
        }
        
        return inventory.getItemDurability(slot);
    }
    
    /**
     * Check if a tool is broken
     */
    public isToolBroken(playerId: string, slot: number): boolean {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            return false;
        }
        
        return inventory.isItemBroken(slot);
    }
} 