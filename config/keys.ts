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
        modelUri: 'models/items/key.gltf',
        displayName: 'Dungeon Key',
        category: 'key',
        maxStackSize: 16,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/dungeon-key.png'
    }
};

// Helper function to get key item by type
export function getKeyItem(itemType: string): KeyItemProperties | undefined {
    return keyItems[itemType];
} 