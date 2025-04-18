// Block configurations
export interface BlockConfig {
    id: number;
    name: string;
    hp: number;
    drops?: string[]; // Changed to array of strings
    xpReward?: number; // XP awarded when the block is mined
}

// Block respawn configuration
export interface BlockRespawnConfig {
    enabled: boolean;
    delay: number; // Delay in milliseconds
}

// Block configurations - Updated drops to be arrays
export const blockConfigs: Map<number, BlockConfig> = new Map([
    [37, {
        id: 37,
        name: 'Stone',
        hp: 5, // Takes 10 clicks with pickaxe
        drops: ['stone'], // Changed to array
        xpReward: 5 // Basic XP reward
    }],
    [21, {
        id: 21,
        name: 'Iron Ore',
        hp: 7.5, // Takes 15 clicks with pickaxe
        drops: ['iron-ore'], // Changed to array
        xpReward: 15 // Higher XP reward for valuable resource
    }],
    [23, {
        id: 23,
        name: 'Oak Log',
        hp: 5, // Takes 8 clicks with axe
        drops: ['log'], // Changed to array
        xpReward: 8 // Medium XP reward
    }]
]);

// Helper function to get block config
export function getBlockConfig(blockId: number): BlockConfig | undefined {
    return blockConfigs.get(blockId);
}

// Block IDs reference:
// 1 = Stone (HP: 5)
// 21 = Iron Ore (HP: 7.5)
// 23 = Oak Log (HP: 4)

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