import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup } from 'hytopia';
import { toolConfigs, blockConfigs } from '../config/tools';
import { BaseItem } from '../items/BaseItem';
import type { PlayerInventory } from '../player/PlayerInventory';
import { ItemSpawner } from './ItemSpawner';

// Define types for our configuration
export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    breakAnimation?: string;  // Optional animation to play when breaking
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
    private readonly MINING_INTERVAL = 50; // Update mining every 50ms
    private playerInventories: Map<string, PlayerInventory>;

    constructor(
        private world: World,
        playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner
    ) {
        this.playerInventories = playerInventories;
        this.logToolConfigs();
    }

    private logToolConfigs(): void {
        console.log('[ToolManager] Loaded tool configurations:');
        this.toolConfigs.forEach((config, id) => {
            console.log(`[ToolManager] Tool ID: ${id}, Name: ${config.name}, Can break: ${config.canBreak.join(', ')}`);
        });
    }

    public registerTool(toolId: string, config: ToolConfig) {
        this.toolConfigs.set(toolId, config);
    }

    public registerBlock(blockId: number, config: BlockConfig) {
        this.blockConfigs.set(blockId, config);
    }

    public canBreakBlock(toolId: string, blockId: number): boolean {
        console.log(`[ToolManager] Checking if tool ${toolId} can break block ${blockId}`);
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) {
            console.log(`[ToolManager] No tool config found for ${toolId}`);
            return false;
        }
        const canBreak = toolConfig.canBreak.includes(blockId);
        console.log(`[ToolManager] Tool ${toolId} ${canBreak ? 'can' : 'cannot'} break block ${blockId}`);
        return canBreak;
    }

    public getBreakDistance(toolId: string): number {
        return 4; // Always return 4 as the break distance
    }

    public getBreakAnimation(toolId: string): string | undefined {
        const toolConfig = this.toolConfigs.get(toolId);
        return toolConfig?.breakAnimation;
    }

    public startMining(playerEntity: PlayerEntity, toolId: string): void {
        const playerId = String(playerEntity.player.id);
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) {
            console.log(`[ToolManager] No tool config found for ${toolId}`);
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
                console.log(`[ToolManager] Block at position ${JSON.stringify(raycastResult.hitBlock.globalCoordinate)} has ID ${blockTypeId}`);
                
                // Log block config if available
                const blockConfig = this.blockConfigs.get(blockTypeId);
                if (blockConfig) {
                    console.log(`[ToolManager] Block config found: ${blockConfig.name} (ID: ${blockConfig.id})`);
                } else {
                    console.log(`[ToolManager] No block config found for ID ${blockTypeId}`);
                }
                
                if (this.canBreakBlock(toolId, blockTypeId)) {
                    // Check if we're already mining this exact block
                    const currentProgress = this.miningProgress.get(playerId);
                    if (currentProgress) {
                        const currentBlockPos = currentProgress.blockPos;
                        const newBlockPos = raycastResult.hitBlock.globalCoordinate;
                        
                        // If we're already mining this exact block, just continue
                        if (currentBlockPos.x === newBlockPos.x && 
                            currentBlockPos.y === newBlockPos.y && 
                            currentBlockPos.z === newBlockPos.z) {
                            return;
                        }
                        
                        // If we're mining a different block, stop mining the old one and start on the new one
                        this.miningProgress.delete(playerId);
                    }
                    
                    // Play mining animation if configured
                    if (toolConfig.breakAnimation) {
                        // Speel de animatie één keer af bij het begin van het minen van een nieuw blok
                        playerEntity.startModelOneshotAnimations([toolConfig.breakAnimation]);
                    }

                    // Start continuous mining on this block
                    const blockConfig = this.blockConfigs.get(blockTypeId);
                    if (blockConfig) {
                        console.log(`[ToolManager] Started mining ${blockConfig.name} with ${toolId}`);
                        
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
                    }
                }
            }
        }
    }

    private handleBlockDrop(blockConfig: BlockConfig, blockPos: any): void {
        if (!blockConfig.drops) {
            console.log(`[ToolManager] Block ${blockConfig.name} has no drops configured`);
            return;
        }
        
        console.log(`[ToolManager] Block ${blockConfig.name} dropped ${blockConfig.drops}`);
        
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
            console.error('[ToolManager] Error spawning dropped item:', error, 'Block config:', blockConfig);
        }
    }

    public stopMining(playerId: string): void {
        const progress = this.miningProgress.get(playerId);
        if (progress) {
            console.log(`[ToolManager] Stopped mining at ${progress.progress.toFixed(1)}% progress`);
            
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

        // Check if player is still looking at the same block
        const isStillLookingAtBlock = this.isPlayerLookingAtBlock(playerEntity, progress.blockPos);
        if (!isStillLookingAtBlock) {
            // Player is no longer looking at the block, stop mining
            console.log(`[ToolManager] Player stopped looking at block, stopping mining`);
            this.stopMining(playerId);
            return;
        }

        const now = Date.now();
        const timeDiff = (now - progress.lastUpdateTime) / 1000; // Convert to seconds
        const miningSpeed = toolConfig.miningSpeed;
        const blockHardness = blockConfig.hardness;
        
        // Calculate progress based on tool speed and block hardness
        progress.progress += (timeDiff / (miningSpeed * blockHardness)) * 100;
        progress.lastUpdateTime = now;

        // Play mining animation periodiek, maar veel minder frequent
        // Alleen afspelen bij het begin (al gedaan) en halverwege (50%)
        const previousProgress = progress.progress - ((timeDiff / (miningSpeed * blockHardness)) * 100);
        if (toolConfig.breakAnimation) {
            // Check of we de 50% mijlpaal hebben gepasseerd
            const passedMilestone = (previousProgress < 50 && progress.progress >= 50);
                
            if (passedMilestone) {
                // Speel de animatie af
                playerEntity.startModelOneshotAnimations([toolConfig.breakAnimation]);
            }
        }

        // Send progress to UI
        const progressValue = Math.min(100, progress.progress);
        playerEntity.player.ui.sendData({
            miningProgress: {
                progress: progressValue
            }
        });

        // Log progress at certain thresholds
        if (progress.progress >= 25 && progress.progress < 26) {
            console.log(`[ToolManager] Mining ${blockConfig.name}: 25% complete`);
        } else if (progress.progress >= 50 && progress.progress < 51) {
            console.log(`[ToolManager] Mining ${blockConfig.name}: 50% complete`);
        } else if (progress.progress >= 75 && progress.progress < 76) {
            console.log(`[ToolManager] Mining ${blockConfig.name}: 75% complete`);
        }

        // Check if block is fully mined
        if (progress.progress >= 100) {
            console.log(`[ToolManager] Mining ${blockConfig.name}: 100% complete - Block broken!`);
            
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
            
            // Check for next block to mine (if player is still holding the button)
            this.findAndMineNextBlock(playerEntity, toolId);
        } else {
            // Schedule next mining update
            setTimeout(() => {
                this.startContinuousMining(playerEntity, toolId);
            }, this.MINING_INTERVAL);
        }
    }
    
    private findAndMineNextBlock(playerEntity: PlayerEntity, toolId: string): void {
        // Check if the tool can break blocks
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) return;
        
        // Cast a ray to find the next block
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
                    // Found a new block to mine - start mining it
                    const blockConfig = this.blockConfigs.get(blockTypeId);
                    if (blockConfig) {
                        console.log(`[ToolManager] Found next block to mine: ${blockConfig.name}`);
                        
                        // Play mining animation if configured
                        if (toolConfig.breakAnimation) {
                            // Speel de animatie één keer af bij het begin van het minen van een nieuw blok
                            playerEntity.startModelOneshotAnimations([toolConfig.breakAnimation]);
                        }
                        
                        // Initialize mining progress for the new block
                        const playerId = String(playerEntity.player.id);
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
                        
                        // Start the continuous mining process for the new block
                        this.startContinuousMining(playerEntity, toolId);
                    }
                }
            }
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