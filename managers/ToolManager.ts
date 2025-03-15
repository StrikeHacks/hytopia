import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup } from 'hytopia';
import { toolConfigs, blockConfigs } from '../config/tools';
import { BaseItem } from '../items/BaseItem';
import type { PlayerInventory } from '../player/PlayerInventory';
import { ItemSpawner } from './ItemSpawner';

// Define types for our configuration
export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    miningSpeed: number;  // How fast this tool mines blocks (in seconds)
}

export interface BlockConfig {
    id: number;
    name: string;
    hardness: number;  // How hard the block is to break
    drops?: string;    // What item it drops when broken
}

interface MiningProgress {
    blockId: number;
    progress: number;
    startTime: number;
    lastUpdateTime: number;
    blockPos: any;
}

export class ToolManager {
    private toolConfigs: Map<string, ToolConfig> = toolConfigs;
    private blockConfigs: Map<number, BlockConfig> = blockConfigs;
    private miningProgress: Map<string, MiningProgress> = new Map(); // playerId -> progress
    private readonly MINING_INTERVAL = 200; // Update mining every 200ms
    private playerInventories: Map<string, PlayerInventory>;

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

    public startMining(playerEntity: PlayerEntity, toolId: string): void {
        const playerId = String(playerEntity.player.id);
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) {
            playerEntity.player.ui.sendData({
                showItemName: {
                    name: `Error: No tool config for ${toolId}`
                }
            });
            return;
        }

        const direction = playerEntity.player.camera.facingDirection;
        const origin = {
            x: playerEntity.position.x,
            y: playerEntity.position.y + playerEntity.player.camera.offset.y + 0.33,
            z: playerEntity.position.z
        };

        const raycastResult = this.world.simulation.raycast(origin, direction, 50, {
            filterExcludeRigidBody: playerEntity.rawRigidBody
        });

        if (raycastResult?.hitBlock) {
            const hitPos = raycastResult.hitBlock.globalCoordinate;
            const distance = Math.sqrt(
                Math.pow(hitPos.x - origin.x, 2) +
                Math.pow(hitPos.y - (origin.y - 0.8), 2) +
                Math.pow(hitPos.z - origin.z, 2)
            );

            const breakDistance = 4; // Fixed break distance of 4
            if (distance <= breakDistance) {
                const blockTypeId = this.world.chunkLattice.getBlockId(raycastResult.hitBlock.globalCoordinate);
                
                if (this.canBreakBlock(toolId, blockTypeId)) {
                    // Start continuous mining on this block
                    const blockConfig = this.blockConfigs.get(blockTypeId);
                    if (blockConfig) {
                        // Initialize mining progress
                        const now = Date.now();
                        this.miningProgress.set(playerId, {
                            blockId: blockTypeId,
                            progress: 0,
                            startTime: now,
                            lastUpdateTime: now,
                            blockPos: raycastResult.hitBlock.globalCoordinate
                        });
                        
                        // Send initial progress to UI
                        playerEntity.player.ui.sendData({
                            miningProgress: {
                                progress: 0
                            }
                        });
                        
                        // Start the continuous mining process
                        this.startContinuousMining(playerEntity, toolId);
                        return;
                    }
                }
            }
        }
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

    public stopMining(playerId: string): void {
        const progress = this.miningProgress.get(playerId);
        if (progress) {
            // Simply remove the mining progress - the UI will be updated by the PlayerManager
            this.miningProgress.delete(playerId);
        }
    }

    private startContinuousMining(playerEntity: PlayerEntity, toolId: string): void {
        const playerId = String(playerEntity.player.id);
        const progress = this.miningProgress.get(playerId);
        if (!progress) return;

        const toolConfig = this.toolConfigs.get(toolId);
        const blockConfig = this.blockConfigs.get(progress.blockId);
        if (!toolConfig || !blockConfig) return;

        // Check if player is still looking at the same block - but only every few updates
        // to reduce the number of raycasts
        const now = Date.now();
        const timeSinceStart = now - progress.startTime;
        const shouldCheckLooking = timeSinceStart % 500 < this.MINING_INTERVAL; // Check roughly every 500ms
        
        if (shouldCheckLooking) {
            const isStillLookingAtBlock = this.isPlayerLookingAtBlock(playerEntity, progress.blockPos);
            if (!isStillLookingAtBlock) {
                // Player is no longer looking at the block
                this.stopMining(playerId);
                return;
            }
        }

        const timeDiff = (now - progress.lastUpdateTime) / 1000; // Convert to seconds
        const miningSpeed = toolConfig.miningSpeed;
        const blockHardness = blockConfig.hardness;
        
        // Calculate progress based on tool speed and block hardness
        progress.progress += (timeDiff / (miningSpeed * blockHardness)) * 100;
        progress.lastUpdateTime = now;

        // Send progress to UI
        const progressValue = Math.min(100, progress.progress);
        playerEntity.player.ui.sendData({
            miningProgress: {
                progress: progressValue
            }
        });

        // Check if block is fully mined
        if (progress.progress >= 100) {
            // Break the block
            this.world.chunkLattice.setBlock(progress.blockPos, 0);

            // Handle drops
            if (blockConfig.drops) {
                this.handleBlockDrop(blockConfig, progress.blockPos);
            }

            // Reset progress
            this.miningProgress.delete(playerId);
            
            // Clear progress bar
            playerEntity.player.ui.sendData({
                miningProgress: {
                    progress: 0
                }
            });
        } else {
            // Schedule next mining update
            setTimeout(() => {
                this.startContinuousMining(playerEntity, toolId);
            }, this.MINING_INTERVAL);
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