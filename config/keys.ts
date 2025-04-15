import type { ItemProperties, KeyItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_COLLIDER_SIZE, 
    DEFAULT_DROP_FORCE, 
    DEFAULT_HAND_OFFSET, 
    DEFAULT_HAND_ROTATION
} from './constants';

// Keys item configurations
export const keyItems: Record<string, KeyItemProperties> = {
    'dungeon-key': {
        type: 'dungeon-key',
        modelUri: 'models/items/dungeon-key.gltf',
        displayName: 'Dungeon Key',
        category: 'key',
        maxStackSize: 16,
        scale: 0.01,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/dungeon-key.png',
        rarity: 'epic',
        soulbound: true
    },
    'bronze-key': {
        type: 'bronze-key',
        modelUri: 'models/crates/key_bronze.gltf',
        displayName: 'Bronze Key',
        category: 'key',
        maxStackSize: 16,
        scale: 1.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/key-bronze.png',
        rarity: 'uncommon',
        soulbound: true
    },
    'iron-key': {
        type: 'iron-key',
        modelUri: 'models/crates/key_iron.gltf',
        displayName: 'Iron Key',
        category: 'key',
        maxStackSize: 16,
        scale: 1.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/key-iron.png',
        rarity: 'common',
        soulbound: true
    },
    'gold-key': {
        type: 'gold-key',
        modelUri: 'models/crates/key_gold.gltf',
        displayName: 'Gold Key',
        category: 'key',
        maxStackSize: 16,
        scale: 1.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/key-gold.png',
        rarity: 'rare',
        soulbound: true
    }
};

// Helper function to get key item by type
export function getKeyItem(itemType: string): KeyItemProperties | undefined {
    return keyItems[itemType];
} 