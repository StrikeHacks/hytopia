import { getItemConfig, getItemsByCategory } from '../config/items';

// This file is just for testing and should be removed in production

// Test function to verify item retrieval works correctly
export function testItemSystem(): void {
    
    // Test getting different item types
    const stoneSword = getItemConfig('sword-stone');

    const stonePickaxe = getItemConfig('pickaxe-stone');
 
    
    const ironIngot = getItemConfig('iron-ingot');
   
    // Test getting items by category
    const weapons = getItemsByCategory('weapons');
    
    const tools = getItemsByCategory('tools');
    
    const resources = getItemsByCategory('resources');
    
} 