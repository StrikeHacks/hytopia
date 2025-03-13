import { World, PlayerEntity } from 'hytopia';
import { toolConfigs, blockConfigs } from '../config/tools';

// Define types for our configuration
export interface ToolConfig {
    name: string;
    canBreak: number[];  // Array of block IDs this tool can break
    breakDistance: number;  // Maximum distance for breaking blocks
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
}

export class ToolManager {
    private toolConfigs: Map<string, ToolConfig> = toolConfigs;
    private blockConfigs: Map<number, BlockConfig> = blockConfigs;
    private miningProgress: Map<string, MiningProgress> = new Map(); // playerId -> progress

    constructor(private world: World) {}

    public registerTool(toolId: string, config: ToolConfig) {
        this.toolConfigs.set(toolId, config);
    }

    public registerBlock(blockId: number, config: BlockConfig) {
        this.blockConfigs.set(blockId, config);
    }

    public canBreakBlock(toolId: string, blockId: number): boolean {
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) return false;
        return toolConfig.canBreak.includes(blockId);
    }

    public getBreakDistance(toolId: string): number {
        const toolConfig = this.toolConfigs.get(toolId);
        return toolConfig?.breakDistance || 4;
    }

    public getBreakAnimation(toolId: string): string | undefined {
        const toolConfig = this.toolConfigs.get(toolId);
        return toolConfig?.breakAnimation;
    }

    public startMining(playerEntity: PlayerEntity, toolId: string): void {
        const playerId = String(playerEntity.player.id);
        const toolConfig = this.toolConfigs.get(toolId);
        if (!toolConfig) return;

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

            if (distance <= toolConfig.breakDistance) {
                const blockTypeId = this.world.chunkLattice.getBlockId(raycastResult.hitBlock.globalCoordinate);
                
                if (this.canBreakBlock(toolId, blockTypeId)) {
                    // Start or continue mining progress
                    const now = Date.now();
                    const progress = this.miningProgress.get(playerId);
                    
                    if (!progress || progress.blockId !== blockTypeId) {
                        // Start new mining progress
                        this.miningProgress.set(playerId, {
                            blockId: blockTypeId,
                            progress: 0,
                            startTime: now,
                            lastUpdateTime: now
                        });
                    }

                    // Play mining animation
                    if (toolConfig.breakAnimation) {
                        playerEntity.startModelOneshotAnimations([toolConfig.breakAnimation]);
                    }

                    // Update mining progress
                    this.updateMiningProgress(playerEntity, toolId, blockTypeId, raycastResult.hitBlock.globalCoordinate);
                }
            }
        }
    }

    public stopMining(playerId: string): void {
        this.miningProgress.delete(playerId);
    }

    private updateMiningProgress(playerEntity: PlayerEntity, toolId: string, blockId: number, blockPos: any): void {
        const playerId = String(playerEntity.player.id);
        const progress = this.miningProgress.get(playerId);
        if (!progress) return;

        const toolConfig = this.toolConfigs.get(toolId);
        const blockConfig = this.blockConfigs.get(blockId);
        if (!toolConfig || !blockConfig) return;

        const now = Date.now();
        const timeDiff = (now - progress.lastUpdateTime) / 1000; // Convert to seconds
        const miningSpeed = toolConfig.miningSpeed;
        const blockHardness = blockConfig.hardness;
        
        // Calculate progress based on tool speed and block hardness
        progress.progress += (timeDiff / (miningSpeed * blockHardness)) * 100;
        progress.lastUpdateTime = now;

        // Send progress to UI
        playerEntity.player.ui.sendData({
            miningProgress: {
                progress: Math.min(100, progress.progress)
            }
        });

        // Check if block is fully mined
        if (progress.progress >= 100) {
            // Break the block
            this.world.chunkLattice.setBlock(blockPos, 0);

            // Handle drops
            if (blockConfig.drops) {
                console.log(`[ToolManager] Block ${blockConfig.name} dropped ${blockConfig.drops}`);
                // TODO: Implement item drop logic
            }

            // Reset progress
            this.miningProgress.delete(playerId);
        }
    }
} 