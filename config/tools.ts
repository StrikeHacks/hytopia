import type { ToolConfig, BlockConfig } from '../managers/ToolManager';

// Tool configurations
export const toolConfigs: Map<string, ToolConfig> = new Map([
    ['shears', {
        name: 'Shears',
        canBreak: [23], // Log blocks
        miningSpeed: 1.5 // Takes 1.5 seconds to break a log
    }],
    ['axe-stone', {
        name: 'Stone Axe',
        canBreak: [23], // Log blocks
        miningSpeed: 1 // Takes 2 seconds to break a log
    }],
    ['pickaxe-stone', {
        name: 'Stone Pickaxe',
        canBreak: [1, 2, 3, 4, 21], // Stone, dirt, grass, iron ore
        miningSpeed: 1 // Takes 2.5 seconds to break stone
    }]
]);

// Block configurations
export const blockConfigs: Map<number, BlockConfig> = new Map([
    [1, { // Stone
        id: 1,
        name: 'Stone',
        hardness: 2,
        drops: 'cobblestone'
    }],
    [2, { // Dirt
        id: 2,
        name: 'Dirt',
        hardness: 1,
        drops: 'dirt'
    }],
    [3, { // Grass
        id: 3,
        name: 'Grass',
        hardness: 1,
        drops: 'dirt'
    }],
    [21, { // Iron Ore
        id: 21,
        name: 'Iron Ore',
        hardness: 2,
        drops: 'iron-ingot'
    }],
    [23, { // Log
        id: 23,
        name: 'Log',
        hardness: 1.5,
        drops: 'stick'
    }]
]); 