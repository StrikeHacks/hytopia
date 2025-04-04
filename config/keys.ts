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
        rarity: 'epic'
    },
    'common-key': {
        type: 'common-key',
        modelUri: 'models/crates/common-key.gltf',
        displayName: 'Common Key',
        category: 'key',
        maxStackSize: 16,
        scale: 1.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/common-key.png',
        rarity: 'uncommon'
    }
};

// Helper function to get key item by type
export function getKeyItem(itemType: string): KeyItemProperties | undefined {
    return keyItems[itemType];
} 