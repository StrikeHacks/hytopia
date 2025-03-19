import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup, BlockType } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { ItemSpawner } from './ItemSpawner';
import { toolConfigs, blockConfigs, getBlockConfig } from '../config/tools';

export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    damage: number;  // Damage per click
}

export class ToolManager {
    private blockDamages: Map<string, { totalDamage: number; lastDamageTime: number }> = new Map();
    private lastHitBlock: string | null = null;
    private resetTimer: NodeJS.Timer | null = null;
    private readonly RESET_DELAY = 500; // 500ms delay before resetting damage

    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner
    ) {
        console.log('[ToolManager] Initialized with tool configs:', {
            tools: Array.from(toolConfigs.entries()),
            blocks: Array.from(blockConfigs.entries())
        });
    }

    private resetBlockDamage(inventory: PlayerInventory, blockKey: string | null = null) {
        if (blockKey) {
            // Reset specific block
            this.blockDamages.delete(blockKey);
            console.log('[Mining] Reset damage for block:', blockKey);
        } else {
            // Reset all blocks
            this.blockDamages.clear();
            console.log('[Mining] Reset all block damage');
        }
        
        // Reset UI progress
        inventory.updateMiningProgressUI(0);
        this.lastHitBlock = null;
    }

    private scheduleReset(inventory: PlayerInventory, blockKey: string) {
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
        console.log('[ToolManager] Checking if tool can break block:', { toolType, blockId });
        const toolConfig = toolConfigs.get(toolType);
        if (!toolConfig) {
            console.log('[ToolManager] No tool config found for:', toolType);
            return false;
        }
        const canBreak = toolConfig.canBreak.includes(blockId);
        console.log('[ToolManager] Can break block?', canBreak);
        return canBreak;
    }

    public tryMineBlock(playerEntity: PlayerEntity): void {
        const playerId = String(playerEntity.player.id);
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            console.log('[Mining] No inventory found for player:', playerId);
            return;
        }

        const selectedSlot = inventory.getSelectedSlot();
        const heldItem = inventory.getItem(selectedSlot);
        if (!heldItem) {
            console.log('[Mining] No item held in selected slot');
            return;
        }
        console.log('[Mining] Player trying to mine with:', heldItem);

        // Get tool configuration
        const toolConfig = toolConfigs.get(heldItem);
        if (!toolConfig) {
            console.log('[Mining] No tool config found for:', heldItem);
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
        
        console.log('[Mining] Hit block:', {
            position: hitPos,
            blockId
        });

        // Check if player is looking at a different block
        if (this.lastHitBlock && this.lastHitBlock !== currentBlockKey) {
            this.resetBlockDamage(inventory, this.lastHitBlock);
        }

        if (!blockId) {
            console.log('[Mining] No block ID found at position');
            return;
        }

        // Get block configuration
        const blockConfig = getBlockConfig(blockId);
        if (!blockConfig) {
            console.log('[Mining] No block config found for ID:', blockId);
            return;
        }

        if (!this.canBreakBlock(heldItem, blockId)) {
            console.log('[Mining] Cannot break block ID', blockId, 'with item:', heldItem);
            return;
        }

        let blockDamage = this.blockDamages.get(currentBlockKey);

        // Initialize damage tracking if this is a new block
        if (!blockDamage) {
            blockDamage = {
                totalDamage: 0,
                lastDamageTime: Date.now()
            };
            this.blockDamages.set(currentBlockKey, blockDamage);
            console.log('[Mining] Started mining new block at:', currentBlockKey);
        }

        // Apply damage
        const previousDamage = blockDamage.totalDamage;
        blockDamage.totalDamage += toolConfig.damage;
        blockDamage.lastDamageTime = Date.now();

        console.log('[Mining] Applied damage:', {
            damage: toolConfig.damage,
            previousTotal: previousDamage,
            newTotal: blockDamage.totalDamage,
            blockHP: blockConfig.hp
        });

        // Update UI with progress based on block's max HP
        const progress = (blockDamage.totalDamage / blockConfig.hp) * 100;
        inventory.updateMiningProgressUI(Math.min(100, Math.max(0, progress)));

        // Schedule a reset if the player stops mining
        this.scheduleReset(inventory, currentBlockKey);

        // Update last hit block
        this.lastHitBlock = currentBlockKey;

        // Check if block should break
        if (blockDamage.totalDamage >= blockConfig.hp) {
            console.log('[Mining] Block broken!', {
                position: hitPos,
                blockId,
                drops: blockConfig.drops
            });
            
            // Handle drops if specified in block config
            if (blockConfig.drops) {
                this.itemSpawner.handleBlockDrop(blockConfig.drops, hitPos);
            }

            this.world.chunkLattice.setBlock(hitPos, 0); // Set to air
            this.blockDamages.delete(currentBlockKey);
            inventory.updateMiningProgressUI(0);
            this.lastHitBlock = null;

            // Clear reset timer when block is broken
            if (this.resetTimer) {
                clearTimeout(this.resetTimer);
                this.resetTimer = null;
            }
        }
    }

    private coordinateToKey(coordinate: { x: number; y: number; z: number }): string {
        return `${coordinate.x},${coordinate.y},${coordinate.z}`;
    }
} 