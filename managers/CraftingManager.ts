import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { 
    getRecipesByCategory, 
    getAvailableCategories, 
    getRecipeById,
    formatRecipeForUI
} from '../config/recipes';
import type { Recipe } from '../config/recipes';
import { getItemConfig } from '../config/items';

// Define the RecipeItem type for formatted recipes
interface RecipeItem {
    id?: string;
    name: string;
    inputs: any[];
    output: any;
    category: string; 
}

export class CraftingManager {
    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {
        console.log('[CraftingManager] Initialized with recipes');
    }

    /**
     * Get all recipes formatted for UI display
     */
    public getAllRecipes(): { [category: string]: any[] } {
        const categories = getAvailableCategories();
        const result: { [category: string]: any[] } = {};
        
        categories.forEach(category => {
            const recipes = getRecipesByCategory(category);
            result[category] = recipes.map(recipe => formatRecipeForUI(recipe));
        });
        
        return result;
    }

    /**
     * Get recipes filtered by category
     */
    public getRecipesByCategory(category: string): RecipeItem[] {
        console.log(`[CraftingManager] Getting recipes for category: ${category}`);
        
        // Handle potential naming discrepancy between 'weapon' and 'weapons'
        const normalizedCategory = this.normalizeCategory(category);
        console.log(`[CraftingManager] Normalized category: ${normalizedCategory}`);
        
        // Check if the normalized category exists in our available categories
        const availableCategories = this.getAvailableCategories();
        if (!availableCategories.includes(normalizedCategory)) {
            console.warn(`[CraftingManager] Requested category "${normalizedCategory}" is not in available categories:`, 
                JSON.stringify(availableCategories));
                
            // Special handling for weapons/weapon category
            if (normalizedCategory === 'weapons' || normalizedCategory === 'weapon') {
                // Try the alternative spelling
                const alternativeCategory = normalizedCategory === 'weapons' ? 'weapon' : 'weapons';
                if (availableCategories.includes(alternativeCategory)) {
                    console.log(`[CraftingManager] Using alternative category: ${alternativeCategory}`);
                    return this.getRecipesForCategory(alternativeCategory);
                }
            }
            
            return [];
        }
        
        return this.getRecipesForCategory(normalizedCategory);
    }
    
    /**
     * Internal method to get recipes for a specific category
     */
    private getRecipesForCategory(category: string): RecipeItem[] {
        try {
            // Get raw recipes for the category
            const rawRecipes = getRecipesByCategory(category);
            console.log(`[CraftingManager] Found ${rawRecipes.length} raw recipes for category: ${category}`);
            
            // Debug log each raw recipe
            rawRecipes.forEach(recipe => {
                console.log(`[CraftingManager] Raw recipe: ${recipe.name}, Category: ${recipe.category}`);
            });
            
            // Format recipes for UI display
            const formattedRecipes = rawRecipes.map(recipe => {
                try {
                    // Use the imported formatRecipeForUI function
                    const formattedRecipe = formatRecipeForUI(recipe) as RecipeItem;
                    // Ensure the category is set in the formatted recipe
                    formattedRecipe.category = recipe.category;
                    return formattedRecipe;
                } catch (error) {
                    console.error(`[CraftingManager] Error formatting recipe ${recipe.name}:`, error);
                    return null;
                }
            }).filter(recipe => recipe !== null) as RecipeItem[];
            
            console.log(`[CraftingManager] Returning ${formattedRecipes.length} formatted recipes for ${category}`);
            
            // Additional check for weapon recipes
            if ((category === 'weapon' || category === 'weapons') && formattedRecipes.length === 0) {
                console.warn(`[CraftingManager] No weapon recipes found after formatting. Double-checking raw recipes...`);
                
                // Try both 'weapon' and 'weapons' categories
                const weaponRecipes = getRecipesByCategory('weapons');
                const weaponRecipes2 = getRecipesByCategory('weapon');
                
                console.log(`[CraftingManager] Manual check found ${weaponRecipes.length} 'weapons' recipes and ${weaponRecipes2.length} 'weapon' recipes`);
                
                if (weaponRecipes.length > 0) {
                    weaponRecipes.forEach(r => console.log(`  - ${r.name} (${r.category})`));
                }
                
                if (weaponRecipes2.length > 0) {
                    weaponRecipes2.forEach(r => console.log(`  - ${r.name} (${r.category})`));
                }
            }
            
            return formattedRecipes;
        } catch (error) {
            console.error(`[CraftingManager] Error getting recipes for category ${category}:`, error);
            return [];
        }
    }
    
    /**
     * Normalize category name to handle different plural/singular forms
     */
    private normalizeCategory(category: string): string {
        // Special case for weapon/weapons 
        if (category.toLowerCase() === 'weapon' || category.toLowerCase() === 'weapons') {
            // Check which one exists in our available categories
            const availableCategories = this.getAvailableCategories();
            if (availableCategories.includes('weapons')) {
                return 'weapons';
            } else if (availableCategories.includes('weapon')) {
                return 'weapon';
            }
        }
        
        // Return original category if no special handling
        return category;
    }

    /**
     * Check if player has enough resources to craft a recipe
     */
    public canPlayerCraftRecipe(playerId: string, recipeName: string): boolean {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) return false;

        const recipe = getRecipeById(recipeName);
        if (!recipe) return false;

        // Check if player has all required inputs
        return recipe.inputs.every(input => {
            const playerHasCount = this.getPlayerItemCount(playerId, input.type);
            return playerHasCount >= input.count;
        });
    }

    /**
     * Get count of an item type that the player has
     */
    private getPlayerItemCount(playerId: string, itemType: string): number {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) return 0;
        
        return inventory.getCountOfItem(itemType);
    }

    /**
     * Craft an item if the player has the required materials
     */
    public craftItem(playerId: string, recipeName: string): boolean {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            console.log(`[CraftingManager] No inventory found for player ${playerId}`);
            return false;
        }

        const recipe = getRecipeById(recipeName);
        if (!recipe) {
            console.log(`[CraftingManager] No recipe found with name ${recipeName}`);
            return false;
        }

        // Check if can craft
        if (!this.canPlayerCraftRecipe(playerId, recipeName)) {
            console.log(`[CraftingManager] Player ${playerId} doesn't have required materials for ${recipeName}`);
            return false;
        }

        console.log(`[CraftingManager] Crafting ${recipeName} for player ${playerId}`);
        console.log(`[CraftingManager] Required inputs:`, recipe.inputs);
        console.log(`[CraftingManager] Output: ${recipe.output.type} x${recipe.output.count}`);

        // Remove input items
        recipe.inputs.forEach(input => {
            console.log(`[CraftingManager] Removing ${input.count}x ${input.type} from inventory`);
            inventory.removeItem(input.type, input.count);
        });

        // Add output item
        const addResult = inventory.addItem(recipe.output.type, recipe.output.count);
        console.log(`[CraftingManager] Added ${recipe.output.count}x ${recipe.output.type} to inventory:`, addResult);

        return true;
    }

    /**
     * Get available recipe categories
     */
    public getAvailableCategories(): string[] {
        return getAvailableCategories();
    }

    /**
     * Get item image URL
     */
    private getItemImageUrl(itemType: string): string {
        try {
            const itemConfig = getItemConfig(itemType);
            return `{{CDN_ASSETS_URL}}/${itemConfig.imageUrl}`;
        } catch (error) {
            console.error(`[CraftingManager] Error getting image URL for item ${itemType}:`, error);
            return '';
        }
    }

    /**
     * Get recipe by ID
     */
    public getRecipeById(recipeName: string): Recipe | null {
        try {
            const recipe = getRecipeById(recipeName);
            return recipe || null;
        } catch (error) {
            console.error(`[CraftingManager] Error getting recipe with ID ${recipeName}:`, error);
            return null;
        }
    }

    /**
     * Get detailed information about crafting requirements for a recipe
     */
    public getDetailedCraftingRequirements(playerId: string, recipeName: string): {
        requirements: Array<{
            type: string;
            requiredCount: number;
            playerHasCount: number;
            hasSufficient: boolean;
        }>;
        missingItems: Array<{
            type: string;
            missing: number;
        }>;
    } {
        const inventory = this.playerInventories.get(playerId);
        const recipe = this.getRecipeById(recipeName);
        
        const result = {
            requirements: [] as Array<{
                type: string;
                requiredCount: number;
                playerHasCount: number;
                hasSufficient: boolean;
            }>,
            missingItems: [] as Array<{
                type: string;
                missing: number;
            }>
        };
        
        if (!inventory || !recipe) {
            return result;
        }
        
        // Check each input requirement
        recipe.inputs.forEach((input: { type: string; count: number }) => {
            const playerHasCount = this.getPlayerItemCount(playerId, input.type);
            const hasSufficient = playerHasCount >= input.count;
            
            // Add to requirements list
            result.requirements.push({
                type: input.type,
                requiredCount: input.count,
                playerHasCount,
                hasSufficient
            });
            
            // If insufficient, add to missing items
            if (!hasSufficient) {
                result.missingItems.push({
                    type: input.type,
                    missing: input.count - playerHasCount
                });
            }
        });
        
        console.log(`[CraftingManager] Detailed requirements for ${recipeName}:`, result);
        return result;
    }
} 