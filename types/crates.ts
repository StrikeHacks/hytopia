import type { ItemProperties } from './items';

// Loot entry in the loot table
export interface CrateLootConfig {
    item: ItemProperties;
    count: number;
    dropChance: number; // 0-100 percentage chance of dropping
}

export interface CrateAnimationConfig {
    type: 'arch' | 'spin' | 'bounce' | 'scatter';
    duration: {
        cycle: number;      // Duration of each item cycle
        total: number;      // Total animation time
        final: number;      // How long to show final item
    };
    scale: number;         // Scale for preview items
    params: {
        width?: number;    // Width for arch/spin animations
        height?: number;   // Height for arch/bounce/scatter animations
        speed?: number;    // Speed multiplier for animations
        radius?: number;   // Radius for scatter animation
        itemDuration?: number; // Duration of each item animation in scatter
    };
}

// Crate configuration
export interface CrateConfig {
    id: string;
    name: string;
    modelUri: string;
    modelScale: number;
    requiredKey: {
        type: string;
        displayName: string;
    };
    lootTable: CrateLootConfig[];
    animation: CrateAnimationConfig;  // Animation configuration
}

export type CrateType = keyof typeof import('../config/crates').CRATES; 