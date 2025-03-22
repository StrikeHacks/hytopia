import { getItemConfig, getItemsByCategory } from '../config/items';

// This file is just for testing and should be removed in production

// Test function to verify item retrieval works correctly
export function testItemSystem(): void {
    console.log('==== TESTING ITEM SYSTEM ====');
    
    // Test getting different item types
    const stoneSword = getItemConfig('sword-stone');
    console.log('Stone Sword:', stoneSword);
    console.log('Stone Sword Category:', stoneSword.category);
    console.log('Stone Sword Stack Size:', stoneSword.maxStackSize);
    
    const stonePickaxe = getItemConfig('pickaxe-stone');
    console.log('Stone Pickaxe:', stonePickaxe);
    console.log('Stone Pickaxe Category:', stonePickaxe.category);
    console.log('Stone Pickaxe Stack Size:', stonePickaxe.maxStackSize);
    
    const ironIngot = getItemConfig('iron-ingot');
    console.log('Iron Ingot:', ironIngot);
    console.log('Iron Ingot Category:', ironIngot.category);
    console.log('Iron Ingot Stack Size:', ironIngot.maxStackSize);
    
    // Test getting items by category
    const weapons = getItemsByCategory('weapons');
    console.log('Weapons:', weapons);
    
    const tools = getItemsByCategory('tools');
    console.log('Tools:', tools);
    
    const resources = getItemsByCategory('resources');
    console.log('Resources:', resources);
    
    console.log('==== TEST COMPLETE ====');
} 