import type { ToolConfig, BlockConfig } from '../managers/ToolManager';

// Tool configurations
export const toolConfigs: Map<string, ToolConfig> = new Map([
    ['shears', {
        name: 'Shears',
        canBreak: [23], // Log blocks
        breakDistance: 4,
        breakAnimation: 'attack',
        miningSpeed: 1.5 // Takes 1.5 seconds to break a log
    }],
    ['stone_axe', {
        name: 'Stone Axe',
        canBreak: [23], // Log blocks
        breakDistance: 4,
        breakAnimation: 'attack',
        miningSpeed: 2.0 // Takes 2 seconds to break a log
    }],
    ['stone_pickaxe', {
        name: 'Stone Pickaxe',
        canBreak: [1, 2, 3], // Stone, dirt, grass
        breakDistance: 4,
        breakAnimation: 'attack',
        miningSpeed: 2.5 // Takes 2.5 seconds to break stone
    }],
    ['iron_pickaxe', {
        name: 'Iron Pickaxe',
        canBreak: [1, 2, 3, 4], // Stone, dirt, grass, iron ore
        breakDistance: 4,
        breakAnimation: 'attack',
        miningSpeed: 1.5 // Takes 1.5 seconds to break stone
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
    [4, { // Iron Ore
        id: 4,
        name: 'Iron Ore',
        hardness: 3,
        drops: 'iron_ore'
    }],
    [23, { // Log
        id: 23,
        name: 'Log',
        hardness: 1,
        drops: 'log'
    }]
]); 