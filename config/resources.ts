import type { ResourceItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_COLLIDER_SIZE, 
    DEFAULT_DROP_FORCE, 
    DEFAULT_HAND_OFFSET, 
    DEFAULT_HAND_ROTATION,
    GIGA_DROP_FORCE,
    SIDEWAYS_HAND_ROTATION
} from './constants';

// Resource item configurations
export const resourceItems: Record<string, ResourceItemProperties> = {
    'stick': {
        type: 'stick',
        modelUri: 'models/items/stick.gltf',
        displayName: 'Stick',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: GIGA_DROP_FORCE, 
        colliderSize: {
            x: 0.3,
            y: 0.37,
            z: 0.3
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: SIDEWAYS_HAND_ROTATION,
        imageUrl: 'items/log-oak.png'
    },
    'iron-ingot': {
        type: 'iron-ingot',
        modelUri: 'models/items/iron-ingot.gltf',
        displayName: 'Iron Ingot',
        category: 'resource',
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
        imageUrl: 'items/iron-ingot.png'
    },
    'paper': {
        type: 'paper',
        modelUri: 'models/items/paper.gltf',
        displayName: 'Paper',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/paper.png'
    },
    'book': {
        type: 'book',
        modelUri: 'models/items/book.gltf',
        displayName: 'Book',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/book.png'
    },
    'bread': {
        type: 'bread',
        modelUri: 'models/items/bread.gltf',
        displayName: 'Bread',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/bread.png'
    },
    'clock': {
        type: 'clock',
        modelUri: 'models/items/clock.gltf',
        displayName: 'Clock',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/clock.png'
    }

};

// Helper function to get resource item by type
export function getResourceItem(itemType: string): ResourceItemProperties | undefined {
    return resourceItems[itemType];
} 