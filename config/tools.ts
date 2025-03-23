import type { ToolItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_HAND_OFFSET, 
    DEFAULT_HAND_ROTATION,
    HEAVY_DROP_FORCE,
    HEAVY_COLLIDER_HEIGHT,
    TOOLS_HAND_OFFSET,
    TOOLS_HAND_ROTATION,
    SIDEWAYS_HAND_ROTATION,
    DEFAULT_DROP_FORCE,
    DEFAULT_COLLIDER_SIZE
} from './constants';

// Tool item configurations
export const toolItems: Record<string, ToolItemProperties> = {
    'pickaxe-stone': {
        type: 'pickaxe-stone',
        modelUri: 'models/items/pickaxe-stone.gltf',
        displayName: 'Stone Pickaxe',
        category: 'tool',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: TOOLS_HAND_OFFSET,
        handRotation: TOOLS_HAND_ROTATION,
        imageUrl: 'items/pickaxe-stone.png',
        durability: 800,
        maxDurability: 800,
        damage: 0.5,  // Damage per click
        canBreak: ['1', '21']  // Stone and iron ore block IDs
    },
    'axe-stone': {
        type: 'axe-stone',
        modelUri: 'models/items/axe-stone.gltf',
        displayName: 'Stone Axe',
        category: 'tool',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: TOOLS_HAND_OFFSET,
        handRotation: TOOLS_HAND_ROTATION,
        imageUrl: 'items/axe-stone.png',
        durability: 10,
        maxDurability: 10,
        damage: 0.5,  // Damage per click
        canBreak: ['23']  // Log blocks
    },
    'fishing-rod': {
        type: 'fishing-rod',
        modelUri: 'models/items/fishing-rod.gltf',
        displayName: 'Fishing Rod',
        category: 'tool',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: SIDEWAYS_HAND_ROTATION,
        imageUrl: 'items/fishing-rod.png',
        durability: 500,
        maxDurability: 500,
        damage: 1,
        canBreak: []
    }
};

// Helper function to get tool item by type
export function getToolItem(itemType: string): ToolItemProperties | undefined {
    return toolItems[itemType];
} 