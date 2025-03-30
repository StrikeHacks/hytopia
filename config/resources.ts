import type { ResourceItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_COLLIDER_SIZE, 
    DEFAULT_DROP_FORCE, 
    DEFAULT_HAND_OFFSET, 
    DEFAULT_HAND_ROTATION,
    GIGA_DROP_FORCE,
    SIDEWAYS_HAND_ROTATION,
    MID_DROP_FORCE,
    HEAVY_DROP_FORCE
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
    },
    'bone': {
        type: 'bone',
        modelUri: 'models/items/bone.gltf',
        displayName: 'Bone',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.5,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/bone.png'
    },
    'log' : {
        type: 'log',
        modelUri: 'models/items/log.gltf',
        displayName: 'Log',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/log.png'
    },
    'nails' : {
        type: 'nails',
        modelUri: 'models/items/nails.gltf',
        displayName: 'Nails',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/nails.png'
    },
    'iron-plate' : {
        type: 'iron-plate',
        modelUri: 'models/items/iron-plate.gltf',
        displayName: 'Iron Plate',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/iron-plate.png'
    },
    'iron-ore' : {
        type: 'iron-ore',
        modelUri: 'models/items/iron-ore.gltf',
        displayName: 'Iron Ore',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/iron-ore.png'
    },
    'stone' : {
        type: 'stone',
        modelUri: 'models/items/stone.gltf',
        displayName: 'Stone',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/stone.png'
    },
    'rope' : {
        type: 'rope',
        modelUri: 'models/items/rope.gltf',
        displayName: 'Rope',
        category: 'resource',
        maxStackSize: 64,
        scale: 0.7,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.25,
            y: 0.3,
            z: 0.25
        },        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/rope.png'
    },

};

// Helper function to get resource item by type
export function getResourceItem(itemType: string): ResourceItemProperties | undefined {
    return resourceItems[itemType];
} 