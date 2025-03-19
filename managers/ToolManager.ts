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
            console.log('[Mining] No block in range');
            return;
        }

        const hitPos = raycastResult.hitBlock.globalCoordinate;
        const blockId = this.world.chunkLattice.getBlockId(hitPos);
        
        console.log('[Mining] Hit block:', {
            position: hitPos,
            blockId
        });

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

        const coordinateKey = this.coordinateToKey(hitPos);
        let blockDamage = this.blockDamages.get(coordinateKey);

        // Initialize damage tracking if this is a new block
        if (!blockDamage) {
            blockDamage = {
                totalDamage: 0,
                lastDamageTime: 0
            };
            this.blockDamages.set(coordinateKey, blockDamage);
            console.log('[Mining] Started mining new block at:', coordinateKey);
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
            this.blockDamages.delete(coordinateKey);
            inventory.updateMiningProgressUI(0);
        }
    }

    private coordinateToKey(coordinate: { x: number; y: number; z: number }): string {
        return `${coordinate.x},${coordinate.y},${coordinate.z}`;
    }

    private blockDamages: Map<string, { totalDamage: number; lastDamageTime: number }> = new Map();
} 