import type { CrateConfig } from '../types/crates';
import { getItemConfig } from './items';
import { getKeyItem } from './keys';
import { CRATE_ANIMATIONS } from './crateAnimations';

// Crate configurations
export const CRATES: Record<string, CrateConfig> = {
    'common-crate': {
        id: 'common-crate',
        name: 'Common Crate',
        modelUri: 'models/crates/crate_bronze.gltf',
        modelScale: 0.7,
        requiredKey: {
            type: 'bronze-key',
            displayName: 'Bronze Key'
        },
        animation: CRATE_ANIMATIONS['scatter'],
        lootTable: [
            { item: getItemConfig('rope'), count: 2, dropChance: 20 },
            { item: getItemConfig('log'), count: 2, dropChance: 15 },
            { item: getItemConfig('nails'), count: 3, dropChance: 15 },
            { item: getItemConfig('stone'), count: 3, dropChance: 12 },
            { item: getItemConfig('leather'), count: 1, dropChance: 10 },
            { item: getItemConfig('iron-ore'), count: 1, dropChance: 10 },
            { item: getItemConfig('book'), count: 2, dropChance: 8 },
            { item: getItemConfig('sword-stone'), count: 1, dropChance: 5 },
            { item: getItemConfig('pickaxe-stone'), count: 1, dropChance: 5 }
        ]
    },
    'epic-crate': {
        id: 'epic-crate',
        name: 'Epic Crate',
        modelUri: 'models/crates/crate_iron.gltf',
        modelScale: 0.7,
        requiredKey: {
            type: 'iron-key',
            displayName: 'Iron Key'
        },
        animation: CRATE_ANIMATIONS['standard-arch'],
        lootTable: [
            { item: getItemConfig('sword-diamond'), count: 1, dropChance: 75 },
            { item: getItemConfig('iron-ore'), count: 1, dropChance: 5 },
            { item: getItemConfig('book'), count: 1, dropChance: 5 },
            { item: getItemConfig('log'), count: 1, dropChance: 5 },
            { item: getItemConfig('stone'), count: 1, dropChance: 5 },
            { item: getItemConfig('leather'), count: 1, dropChance: 5 },
        ]
    },
    'legendary-crate': {
        id: 'legendary-crate',
        name: 'Legendary Crate',
        modelUri: 'models/crates/crate_gold.gltf',
        modelScale: 0.7,
        requiredKey: {
            type: 'gold-key',
            displayName: 'Gold Key'
        },
        animation: CRATE_ANIMATIONS['fast-spin'],
        lootTable: [
            { item: getItemConfig('rope'), count: 2, dropChance: 20 },
            { item: getItemConfig('log'), count: 2, dropChance: 15 },
            { item: getItemConfig('nails'), count: 3, dropChance: 15 },
            { item: getItemConfig('stone'), count: 3, dropChance: 12 },
            { item: getItemConfig('leather'), count: 1, dropChance: 10 },
            { item: getItemConfig('iron-ore'), count: 1, dropChance: 10 },
            { item: getItemConfig('book'), count: 2, dropChance: 8 },
            { item: getItemConfig('sword-stone'), count: 1, dropChance: 5 },
            { item: getItemConfig('pickaxe-stone'), count: 1, dropChance: 5 }
        ]
    },


} as const;

// Helper functions
export function getCrateById(id: string): CrateConfig | undefined {
    return CRATES[id];
}

export function getLootChanceForItem(crateId: string, itemId: string): number {
    const crate = getCrateById(crateId);
    if (!crate) return 0;
    
    const lootEntry = crate.lootTable.find(entry => entry.item.type === itemId);
    return lootEntry?.dropChance ?? 0;
}

// Helper to get a predefined animation config
export function getCrateAnimation(animationId: string) {
    return CRATE_ANIMATIONS[animationId];
} 