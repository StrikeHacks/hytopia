import type { WeaponItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_HAND_ROTATION, 
    DEFAULT_HAND_OFFSET,
    HEAVY_DROP_FORCE,
    HEAVY_COLLIDER_HEIGHT,
    WEAPONS_HAND_OFFSET
} from './constants';

// Weapon item configurations
export const weaponItems: Record<string, WeaponItemProperties> = {
    'sword-diamond': {
        type: 'sword-diamond',
        modelUri: 'models/items/sword-diamond.gltf',
        displayName: 'Diamond Sword',
        category: 'weapon',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/sword-diamond.png',
        durability: 1500,
        maxDurability: 1500,
        damage: 7
    },
    'sword-stone': {
        type: 'sword-stone',
        modelUri: 'models/items/sword-stone.gltf',
        displayName: 'Stone Sword',
        category: 'weapon',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/sword-stone.png',
        durability: 800,
        maxDurability: 800,
        damage: 5
    },
    'sword-golden': {
        type: 'sword-golden',
        modelUri: 'models/items/sword-golden.gltf',
        displayName: 'Golden Sword',
        category: 'weapon',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: WEAPONS_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/sword-golden.png',
        durability: 300,
        maxDurability: 300,
        damage: 4
    }
};

// Helper function to get weapon item by type
export function getWeaponItem(itemType: string): WeaponItemProperties | undefined {
    return weaponItems[itemType];
} 