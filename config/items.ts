import type { Position3D, ItemProperties, ItemType } from '../types/items';
import { getResourceItem } from './resources';
import { getWeaponItem } from './weapons';
import { getToolItem } from './tools';
import { getArmorItem } from './armor';
import {
    DEFAULT_ITEM_SCALE,
    PICKUP_COOLDOWN,
    MAX_STACK_SIZE,
    DEFAULT_DROP_FORCE,
    DEFAULT_COLLIDER_SIZE,
    DEFAULT_HAND_OFFSET,
    DEFAULT_HAND_ROTATION
} from './constants';

// Re-export constants for backwards compatibility
export { 
    DEFAULT_ITEM_SCALE,
    PICKUP_COOLDOWN,
    MAX_STACK_SIZE,
    DEFAULT_DROP_FORCE,
    HEAVY_DROP_FORCE,
    GIGA_DROP_FORCE,
    DEFAULT_COLLIDER_SIZE,
    HEAVY_COLLIDER_HEIGHT,
    MID_COLLIDER_HEIGHT,
    DEFAULT_HAND_OFFSET,
    TOOLS_HAND_OFFSET,
    WEAPONS_HAND_OFFSET,
    DEFAULT_HAND_ROTATION,
    SIDEWAYS_HAND_ROTATION,
    TOOLS_HAND_ROTATION
} from './constants';

// Helper function to get item config from the appropriate category
export function getItemConfig(itemType: string): ItemProperties {
    if (!itemType) {
        console.error('[Items] Attempted to get config for null or undefined item type');
        throw new Error('Item type is null or undefined');
    }
    
    console.log(`[Items] Getting config for item type: "${itemType}"`);
    
    // Try to find item in the different categories
    const resourceItem = getResourceItem(itemType);
    if (resourceItem) return resourceItem;
    
    const weaponItem = getWeaponItem(itemType);
    if (weaponItem) return weaponItem;
    
    const toolItem = getToolItem(itemType);
    if (toolItem) return toolItem;
    
    const armorItem = getArmorItem(itemType);
    if (armorItem) return armorItem;
    
    console.error(`[Items] No configuration found for item type: "${itemType}"`);
    // Return a default config instead of throwing an error
    return getFallbackItem(itemType);
}

// Calculate NON_STACKABLE_TYPES based on all items
export const NON_STACKABLE_TYPES = [
    ...Object.keys(getWeaponItem('sword-stone') ? require('./weapons').weaponItems : {}),
    ...Object.keys(getToolItem('pickaxe-stone') ? require('./tools').toolItems : {}),
    ...Object.keys(getArmorItem('helmet-iron') ? require('./armor').armorItems : {})
].filter(type => {
    const config = getItemConfig(type);
    return config && config.maxStackSize === 1;
});

// Helper function to get items by category
export function getItemsByCategory(category: string): string[] {
    let result: string[] = [];
    
    if (category === 'resource' || category === 'resources') {
        result = Object.keys(require('./resources').resourceItems);
    } else if (category === 'weapon' || category === 'weapons') {
        result = Object.keys(require('./weapons').weaponItems);
    } else if (category === 'tool' || category === 'tools') {
        result = Object.keys(require('./tools').toolItems);
    } else if (category === 'armor') {
        result = Object.keys(require('./armor').armorItems);
    }
    
    return result;
}

// Fallback item for unknown item types
export function getFallbackItem(itemType: string): ItemProperties {
    return {
        type: itemType,
        modelUri: 'models/items/fallback.gltf',
        displayName: itemType,
        category: 'misc',
        maxStackSize: MAX_STACK_SIZE,
        scale: DEFAULT_ITEM_SCALE,
        dropForce: DEFAULT_DROP_FORCE,
        colliderSize: DEFAULT_COLLIDER_SIZE,
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/fallback.png'
    };
} 