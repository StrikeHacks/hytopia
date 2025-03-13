import type { Position3D } from '../types/items';

// Default values for item properties
export const DEFAULT_ITEM_SCALE = 0.5;
export const DEFAULT_COLLIDER_SIZE = { x: 0.2, y: 0.2, z: 0.2 };
export const DEFAULT_DROP_FORCE = { horizontal: 0.4, vertical: 0.1 };
export const PICKUP_COOLDOWN = 500; // ms
export const HEAVY_DROP_FORCE = { horizontal: 1, vertical: 0.15 };
export const HEAVY_COLLIDER_HEIGHT = 0.55;
export const MID_COLLIDER_HEIGHT = 0.4;
export const MAX_STACK_SIZE = 64;

// Item properties configuration
export const itemConfigs = {
    'sword-diamond': {
        type: 'sword-diamond',
        modelUri: 'models/items/sword-diamond.gltf',
        displayName: 'Diamond Sword',
        category: 'weapons',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    },
    'sword-stone': {
        type: 'sword-stone',
        modelUri: 'models/items/sword-stone.gltf',
        displayName: 'Stone Sword',
        category: 'weapons',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    },
    'sword-golden': {
        type: 'sword-golden',
        modelUri: 'models/items/sword-golden.gltf',
        displayName: 'Golden Sword',
        category: 'weapons',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    },
    'clock': {
        type: 'clock',
        modelUri: 'models/items/clock.gltf',
        displayName: 'Clock',
        category: 'tools',
        maxStackSize: 16,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE
    },
    'paper': {
        type: 'paper',
        modelUri: 'models/items/paper.gltf',
        displayName: 'Paper',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE
    },
    'bread': {
        type: 'bread',
        modelUri: 'models/items/bread.gltf',
        displayName: 'Bread',
        category: 'consumables',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE
    },
    'book': {
        type: 'book',
        modelUri: 'models/items/book.gltf',
        displayName: 'Book',
        category: 'miscellaneous',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE
    },
    'fishing-rod': {
        type: 'fishing-rod',
        modelUri: 'models/items/fishing-rod.gltf',
        displayName: 'Fishing Rod',
        category: 'tools',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    },
    'shears': {
        type: 'shears',
        modelUri: 'models/items/.optimized/shears/shears.gltf',
        displayName: 'Axe',
        category: 'tools',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    },
    'stick': {
        type: 'stick',
        modelUri: 'models/items/stick.gltf',
        displayName: 'Stick',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: {
            x: 0.3,
            y: 0.37,
            z: 0.3
        }    
    },
    'iron-ingot': {
        type: 'iron-ingot',
        modelUri: 'models/items/iron-ingot.gltf',
        displayName: 'Iron Ingot',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: {
            x: 0.3,
            y: 0.37,
            z: 0.3
        },
        imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/019/527/051/small_2x/an-8-bit-retro-styled-pixel-art-illustration-of-an-iron-bar-ingot-free-png.png'
    },
    'cookie': {
        type: 'cookie',
        modelUri: 'models/items/cookie.gltf',
        displayName: 'Stone Pickaxe',
        category: 'tools',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        }
    }
} as const;

// Helper function to get item config
export function getItemConfig(itemType: string) {
    const config = itemConfigs[itemType as keyof typeof itemConfigs];
    if (!config) {
        throw new Error(`No configuration found for item type: ${itemType}`);
    }
    return config;
}

// Calculate NON_STACKABLE_TYPES from itemConfigs
export const NON_STACKABLE_TYPES = Object.values(itemConfigs)
    .filter(config => config.maxStackSize === 1)
    .map(config => config.type);

// Helper function to get items by category
export function getItemsByCategory(category: string) {
    return Object.values(itemConfigs)
        .filter(config => config.category === category)
        .map(config => config.type);
} 