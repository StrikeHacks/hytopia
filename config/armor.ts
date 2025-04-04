import type { ArmorItemProperties } from '../types/items';
import { 
    DEFAULT_ITEM_SCALE, 
    DEFAULT_HAND_OFFSET, 
    DEFAULT_HAND_ROTATION,
    HEAVY_DROP_FORCE,
    HEAVY_COLLIDER_HEIGHT
} from './constants';

// Armor item configurations (placeholder for now)
export const armorItems: Record<string, ArmorItemProperties> = {
    // This is just a placeholder, as mentioned we don't have actual armor items yet
    'helmet-iron': {
        type: 'helmet-iron',
        modelUri: 'models/items/helmet-iron.gltf', // This would need to be created
        displayName: 'Iron Helmet',
        category: 'armor',
        maxStackSize: 1,
        scale: 0.5,
        dropForce: HEAVY_DROP_FORCE,
        colliderSize: {
            x: 0.2,
            y: HEAVY_COLLIDER_HEIGHT,
            z: 0.2
        },
        handOffset: DEFAULT_HAND_OFFSET,
        handRotation: DEFAULT_HAND_ROTATION,
        imageUrl: 'items/helmet-iron.png', // This would need to be created
        durability: 1000,
        maxDurability: 1000,
        armorPoints: 3,
        rarity: 'rare'
    }
};

// Helper function to get armor item by type
export function getArmorItem(itemType: string): ArmorItemProperties | undefined {
    return armorItems[itemType];
} 