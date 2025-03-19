import type { BlockConfig } from '../managers/ToolManager';

// Block respawn configuration
export interface BlockRespawnConfig {
    enabled: boolean;
    delay: number; // Delay in milliseconds
}

export const blockRespawnConfigs: Map<number, BlockRespawnConfig> = new Map([
    [1, { // Stone
        enabled: true,
        delay: 10000 // 10 seconds
    }],
    [21, { // Iron Ore
        enabled: true,
        delay: 15000 // 15 seconds
    }],
    [23, { // Oak Log
        enabled: true,
        delay: 20000 // 20 seconds
    }]
]);

// Helper function to get block respawn config
export function getBlockRespawnConfig(blockId: number): BlockRespawnConfig | undefined {
    return blockRespawnConfigs.get(blockId);
} 