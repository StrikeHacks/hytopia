import type { ToolConfig } from '../managers/ToolManager';

// Tool configurations
export const toolConfigs: Map<string, ToolConfig> = new Map([
    ['shears', {
        name: 'Shears',
        canBreak: [23], // Log blocks
        damage: 0.5 // Damage per click
    }],
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

// Block IDs reference:
// 1 = Stone
// 21 = Iron Ore  
// 23 = Log 