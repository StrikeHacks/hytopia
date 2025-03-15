import type { Position3D } from '../types/items';

// Default values for item properties
export const DEFAULT_ITEM_SCALE = 0.5;
export const DEFAULT_COLLIDER_SIZE = { x: 0.2, y: 0.2, z: 0.2 };
export const DEFAULT_DROP_FORCE = { horizontal: 0.4, vertical: 0.1 };
export const PICKUP_COOLDOWN = 500; // ms
export const HEAVY_DROP_FORCE = { horizontal: 1, vertical: 0.15 };
export const GIGA_DROP_FORCE = { horizontal: 1.5, vertical: 0.2 };

export const HEAVY_COLLIDER_HEIGHT = 0.55;
export const MID_COLLIDER_HEIGHT = 0.4;
export const MAX_STACK_SIZE = 64;

// Default hand offset for items
export const DEFAULT_HAND_OFFSET = { x: 0.0, y: 0.07, z: 0.3 };
export const TOOLS_HAND_OFFSET = { x: -0.48, y: 0.5, z: 0.4 };
export const WEAPONS_HAND_OFFSET = { x: 0, y: 0.07, z: 0.6 };

// Default hand rotation for items (x: pitch, y: yaw, z: roll, w: scalar)
// Standard downward tilt
export const DEFAULT_HAND_ROTATION = { x: -Math.PI / 3, y: 0, z: 0, w: 1 };
export const SIDEWAYS_HAND_ROTATION = { x: -Math.PI / 3, y: Math.PI / 2, z: 0, w: 1 };

export const TOOLS_HAND_ROTATION = { x: -Math.PI / 6, y:Math.PI / 3 , z: -0.5, w: 1 };

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
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
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
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
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
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
    },
    'clock': {
        type: 'clock',
        modelUri: 'models/items/clock.gltf',
        displayName: 'Clock',
        category: 'tools',
        maxStackSize: 16,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
    },
    'paper': {
        type: 'paper',
        modelUri: 'models/items/paper.gltf',
        displayName: 'Paper',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
    },
    'bread': {
        type: 'bread',
        modelUri: 'models/items/bread.gltf',
        displayName: 'Bread',
        category: 'consumables',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
    },
    'book': {
        type: 'book',
        modelUri: 'models/items/book.gltf',
        displayName: 'Book',
        category: 'miscellaneous',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION
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
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: SIDEWAYS_HAND_ROTATION
    },
    'stick': {
        type: 'stick',
        modelUri: 'models/items/stick.gltf',
        displayName: 'Stick',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: GIGA_DROP_FORCE,
        colliderSize: {
            x: 0.3,
            y: 0.37,
            z: 0.3
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: SIDEWAYS_HAND_ROTATION
    },
    'iron-ingot': {
        type: 'iron-ingot',
        modelUri: 'models/items/iron-ingot.gltf',
        displayName: 'Iron Ingot',
        category: 'materials',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: GIGA_DROP_FORCE,
        colliderSize: {
            x: 0.3,
            y: 0.37,
            z: 0.3
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'https://static.vecteezy.com/system/resources/thumbnails/019/527/051/small_2x/an-8-bit-retro-styled-pixel-art-illustration-of-an-iron-bar-ingot-free-png.png'
    },
    'axe-stone': {
        type: 'axe-stone',
        modelUri: 'models/items/axe-stone.gltf',
        displayName: 'Axe',
        category: 'tools',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: TOOLS_HAND_OFFSET,
        handRotation: TOOLS_HAND_ROTATION
    },
    'pickaxe-stone': {
        type: 'pickaxe-stone',
        modelUri: 'models/items/pickaxe-stone.gltf',
        displayName: 'Stone Pickaxe',
        category: 'tools',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: TOOLS_HAND_OFFSET,
        handRotation: TOOLS_HAND_ROTATION
    }
} as const;

// Helper function to get item config
export function getItemConfig(itemType: string) {
    const config = itemConfigs[itemType as keyof typeof itemConfigs];
    if (!config) {
        throw new Error(`No configuration found for item type: ${itemType}`);
    }
    return config as typeof config & { 
        handOffset?: { x: number; y: number; z: number },
        handRotation?: { x: number; y: number; z: number; w: number }
    };
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