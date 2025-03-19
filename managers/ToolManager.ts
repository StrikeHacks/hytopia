import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup } from 'hytopia';
import { toolConfigs, blockConfigs } from '../config/tools';
import { BaseItem } from '../items/BaseItem';
import type { PlayerInventory } from '../player/PlayerInventory';
import { ItemSpawner } from './ItemSpawner';

// Define types for our configuration
export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    damage: number;  // How fast this tool mines blocks (in seconds)
}

export interface BlockConfig {
    id: number;
    name: string;
    hp: number;  // How hard the block is to break
    drops?: string;    // What item it drops when broken
}

interface MiningProgress {
    blockId: number;
    progress: number;
    startTime: number;
    lastUpdateTime: number;
    blockPos: any;
}

interface BlockDamage {
    blockId: number;
    totalDamage: number;
    lastDamageTime: number;
}

export class ToolManager {
    private toolConfigs: Map<string, ToolConfig> = toolConfigs;
    private blockConfigs: Map<number, BlockConfig> = blockConfigs;
    private miningProgress: Map<string, MiningProgress> = new Map(); // playerId -> progress
    private readonly MINING_INTERVAL = 500; // Mining interval in ms
    private playerInventories: Map<string, PlayerInventory>;
    private blockDamages: Map<string, BlockDamage> = new Map();

    constructor(
        private world: World,
        playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner
    ) {
        this.playerInventories = playerInventories;
    }

    public registerTool(toolId: string, config: ToolConfig) {
        this.toolConfigs.set(toolId, config);
    }

    public registerBlock(blockId: number, config: BlockConfig) {
        this.blockConfigs.set(blockId, config);
    }

    public canBreakBlock(toolId: string, blockId: number): boolean {
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) {
            return false;
        }
        return toolConfig.canBreak.includes(blockId);
    }

    public getBreakDistance(toolId: string): number {
        return 4; // Always return 4 as the break distance
    }

    public tryMineBlock(playerEntity: PlayerEntity): void {
        const playerId = String(playerEntity.player.id);
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) return;

        const selectedSlot = inventory.getSelectedSlot();
        const heldItem = inventory.getItem(selectedSlot);
        if (!heldItem) return;

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
            this.stopMining(playerId);
            return;
        }

        const hitPos = raycastResult.hitBlock.globalCoordinate;
        const blockTypeId = this.world.chunkLattice.getBlockId(hitPos);
        const blockConfig = this.blockConfigs.get(blockTypeId);
        
        if (!blockConfig || !this.canBreakBlock(heldItem, blockTypeId)) {
            this.stopMining(playerId);
            return;
        }

        // Get tool config for damage calculation
        const toolConfig = this.toolConfigs.get(heldItem);
        if (!toolConfig) return;

        const now = Date.now();
        const coordinateKey = this.coordinateToKey(hitPos);
        let blockDamage = this.blockDamages.get(coordinateKey);

        // If we're not mining this block yet, initialize damage tracking
        if (!blockDamage) {
            blockDamage = {
                blockId: blockTypeId,
                totalDamage: 0,
                lastDamageTime: 0
            };
            this.blockDamages.set(coordinateKey, blockDamage);
        }

        // Check if enough time has passed since last damage
        if (now - blockDamage.lastDamageTime >= this.MINING_INTERVAL) {
            // Apply damage
            blockDamage.totalDamage += toolConfig.damage;
            blockDamage.lastDamageTime = now;

            // Update UI with progress
            const progress = (blockDamage.totalDamage / blockConfig.hp) * 100;
            inventory.updateMiningProgressUI(Math.min(100, Math.max(0, progress)));

            // Check if block should break
            if (blockDamage.totalDamage >= blockConfig.hp) {
                console.log(`[Mining] Successfully broke block!`);
                this.breakBlock(hitPos, blockConfig);
                this.blockDamages.delete(coordinateKey);
                this.stopMining(playerId);
            }
        }
    }

    public stopMining(playerId: string): void {
        const inventory = this.playerInventories.get(playerId);
        if (inventory) {
            inventory.updateMiningProgressUI(0);
        }
    }

    private breakBlock(blockPos: any, blockConfig: any): void {
        // Set block to air (0 is air block ID)
        this.world.chunkLattice.setBlock(blockPos, 0);

        // Handle drops if specified
        if (blockConfig.drops) {
            const dropPos = {
                x: blockPos.x + 0.5,
                y: blockPos.y + 0.5,
                z: blockPos.z + 0.5
            };
            this.itemSpawner.handleBlockDrop(blockConfig.drops, dropPos);
        }
    }

    private coordinateToKey(coordinate: { x: number; y: number; z: number }): string {
        return `${coordinate.x},${coordinate.y},${coordinate.z}`;
    }

    private handleBlockDrop(blockConfig: BlockConfig, blockPos: any): void {
        if (!blockConfig.drops) {
            return;
        }
        
        // Create drop position at the center of where the block was
        const dropPosition = {
            x: blockPos.x + 0.5,
            y: blockPos.y + 0.5,
            z: blockPos.z + 0.5
        };

        try {
            // Use the ItemSpawner to handle the block drop
            this.itemSpawner.handleBlockDrop(blockConfig.drops as string, dropPosition);
        } catch (error) {
            console.error('[ToolManager] Error spawning dropped item:', error);
        }
    }

    private isPlayerLookingAtBlock(playerEntity: PlayerEntity, blockPos: any): boolean {
        // Cast a ray from the player's position in the direction they're looking
        const direction = playerEntity.player.camera.facingDirection;
        const origin = {
            x: playerEntity.position.x,
            y: playerEntity.position.y + playerEntity.player.camera.offset.y + 0.33,
            z: playerEntity.position.z
        };

        // Calculate the distance to the block center
        const blockCenter = {
            x: Math.floor(blockPos.x) + 0.5,
            y: Math.floor(blockPos.y) + 0.5,
            z: Math.floor(blockPos.z) + 0.5
        };
        
        const distance = Math.sqrt(
            Math.pow(blockCenter.x - origin.x, 2) +
            Math.pow(blockCenter.y - origin.y, 2) +
            Math.pow(blockCenter.z - origin.z, 2)
        );
        
        // If the block is too far away, don't even bother with a raycast
        if (distance > 5) {
            return false;
        }

        const raycastResult = this.world.simulation.raycast(origin, direction, 50, {
            filterExcludeRigidBody: playerEntity.rawRigidBody
        });

        // Check if the raycast hit a block and if it's the same block we're mining
        if (raycastResult?.hitBlock) {
            const hitPos = raycastResult.hitBlock.globalCoordinate;
            return (
                Math.floor(hitPos.x) === Math.floor(blockPos.x) &&
                Math.floor(hitPos.y) === Math.floor(blockPos.y) &&
                Math.floor(hitPos.z) === Math.floor(blockPos.z)
            );
        }
        
        // No block hit by the raycast
        return false;
    }
} 