import type { ToolConfig } from '../managers/ToolManager';

// Block configurations
export interface BlockConfig {
    id: number;
    name: string;
    hp: number;
    drops?: string;
}

export const blockConfigs: Map<number, BlockConfig> = new Map([
    [1, {
        id: 1,
        name: 'Stone',
        hp: 5, // Takes 10 clicks with pickaxe
        drops: 'cobblestone'
    }],
    [21, {
        id: 21,
        name: 'Iron Ore',
        hp: 7.5, // Takes 15 clicks with pickaxe
        drops: 'iron-ingot'
    }],
    [23, {
        id: 23,
        name: 'Oak Log',
        hp: 4, // Takes 8 clicks with axe
        drops: 'stick'
    }]
]);

// Tool configurations
export const toolConfigs: Map<string, ToolConfig> = new Map([
    ['axe-stone', {
        name: 'Stone Axe',
        canBreak: [23], // Log blocks
        damage: 0.5 // Damage per click
    }],
    ['pickaxe-stone', {
        name: 'Stone Pickaxe',
        canBreak: [1, 21], // Stone and iron ore
        damage: 0.5 // Damage per click
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