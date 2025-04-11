import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { 
    getRecipesByCategory, 
    getAvailableCategories, 
    getRecipeById,
    formatRecipeForUI,
    DEFAULT_CRAFTING_TIME
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
        private playerInventories: Map<string, PlayerInventory>,
        private gameManager?: any // Optional GameManager instance
    ) {
        console.log('[CraftingManager] Initialized');
    }

    private getGameManager(): any {
        // Try to get GameManager from constructor param first
        if (this.gameManager) {
            return this.gameManager;
        }
        // Fallback to getting it from the world
        return (this.world as any).gameManager;
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
        
        // Handle potential naming discrepancy between 'weapon' and 'weapons'
        const normalizedCategory = this.normalizeCategory(category);
        
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
            
            // Debug log each raw recipe
       
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
            
            
            // Additional check for weapon recipes
            if ((category === 'weapon' || category === 'weapons') && formattedRecipes.length === 0) {
                console.warn(`[CraftingManager] No weapon recipes found after formatting. Double-checking raw recipes...`);
                
                // Try both 'weapon' and 'weapons' categories
                const weaponRecipes = getRecipesByCategory('weapons');
                const weaponRecipes2 = getRecipesByCategory('weapon');
                
                
                
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
            return false;
        }

        const recipe = getRecipeById(recipeName);
        if (!recipe) {
            return false;
        }

        // Check if can craft
        if (!this.canPlayerCraftRecipe(playerId, recipeName)) {
            return false;
        }

        

        // Remove input items
        recipe.inputs.forEach(input => {
            inventory.removeItem(input.type, input.count);
        });

        // Add output item
        const addResult = inventory.addItem(recipe.output.type, recipe.output.count);

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
        
        return result;
    }

    /**
     * Get crafting time for a recipe
     */
    public getCraftingTime(recipeName: string): number {
        const recipe = this.getRecipeById(recipeName);
        return recipe?.craftingTime || DEFAULT_CRAFTING_TIME;
    }

    /**
     * Get crafting status for a player (check if they're currently crafting)
     */
    private playerCraftingTimers: Map<string, {
        recipeName: string;
        timerId: NodeJS.Timer;
        startTime: number;
        endTime: number;
    }> = new Map();

    /**
     * Check if player is currently crafting
     */
    public isPlayerCrafting(playerId: string): boolean {
        return this.playerCraftingTimers.has(playerId);
    }

    /**
     * Get current crafting progress for a player (0-100)
     */
    public getPlayerCraftingProgress(playerId: string): number {
        const craftingInfo = this.playerCraftingTimers.get(playerId);
        if (!craftingInfo) return 0;
        
        const now = Date.now();
        const elapsed = now - craftingInfo.startTime;
        const total = craftingInfo.endTime - craftingInfo.startTime;
        
        return Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
    }

    /**
     * Get current crafting recipe for a player
     */
    public getPlayerCraftingRecipe(playerId: string): string | null {
        const craftingInfo = this.playerCraftingTimers.get(playerId);
        return craftingInfo ? craftingInfo.recipeName : null;
    }

    /**
     * Start crafting process with timer
     */
    public startCrafting(playerId: string, recipeName: string): boolean {
        
        // Check if player is already crafting
        if (this.isPlayerCrafting(playerId)) {
            return false;
        }
        
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            return false;
        }

        const recipe = getRecipeById(recipeName);
        if (!recipe) {
            return false;
        }

        // Check if can craft
        if (!this.canPlayerCraftRecipe(playerId, recipeName)) {
            return false;
        }
        
        // Get crafting time for this recipe
        const craftingTime = recipe.craftingTime || DEFAULT_CRAFTING_TIME;
        
        // Remove input items immediately
        recipe.inputs.forEach(input => {
            inventory.removeItem(input.type, input.count);
        });
        
        // Start crafting timer
        const now = Date.now();
        const endTime = now + craftingTime;
        
        const timerId = setTimeout(() => {
            this.completeCrafting(playerId, recipeName);
        }, craftingTime);
        
        // Store crafting info
        this.playerCraftingTimers.set(playerId, {
            recipeName,
            timerId,
            startTime: now,
            endTime
        });
        
        // Notify player that crafting has started
        const player = this.getPlayerById(playerId);
        if (player) {
            player.ui.sendData({
                craftingStarted: {
                    recipeName,
                    craftingTime
                }
            });
        }
        
        return true;
    }

    /**
     * Complete crafting process and give the item to the player
     */
    private completeCrafting(playerId: string, recipeName: string): void {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            console.log(`[CraftingManager] No inventory found for player ${playerId}`);
            return;
        }

        const recipe = getRecipeById(recipeName);
        if (!recipe) {
            console.log(`[CraftingManager] No recipe found for ${recipeName}`);
            return;
        }

        // Add output item
        const addResult = inventory.addItem(recipe.output.type, recipe.output.count);

        // Clear the crafting timer
        this.playerCraftingTimers.delete(playerId);

        // Get the player from the inventory's playerEntity
        const playerEntity = (inventory as any).playerEntity;
        if (!playerEntity || !playerEntity.player) {
            console.log(`[CraftingManager] Could not get player entity from inventory for ${playerId}`);
            return;
        }

        // Award XP if specified in the recipe
        if (recipe.xpReward && recipe.xpReward > 0) {
            const gameManager = this.getGameManager();
            if (!gameManager) {
                console.error(`[CraftingManager] Could not access GameManager`);
                return;
            }

            const levelManager = gameManager.getLevelManager();
            if (!levelManager) {
                console.error(`[CraftingManager] Could not access LevelManager`);
                return;
            }

            try {
                console.log(`[CraftingManager] Attempting to award ${recipe.xpReward} XP to player ${playerId}`);
                levelManager.addPlayerXP(playerId, recipe.xpReward);
                console.log(`[CraftingManager] Successfully awarded ${recipe.xpReward} XP to player ${playerId} for crafting ${recipeName}`);
            } catch (error) {
                console.error(`[CraftingManager] Error awarding XP:`, error);
            }
        }

        // Send completion notification to player
        try {
            playerEntity.player.ui.sendData({
                craftingComplete: {
                    recipeName,
                    success: true
                }
            });
        } catch (error) {
            console.error(`[CraftingManager] Error sending completion notification:`, error);
        }
    }

    /**
     * Cancel crafting process for a player
     */
    public cancelCrafting(playerId: string): boolean {
        // Method kept but disabled since cancel button was removed
        return false;
    }

    /**
     * Get player by ID (helper method)
     */
    private getPlayerById(playerId: string): any {
        // We need to find a player by ID in the game
        // Since PlayerInventory doesn't have a direct way to access the player UI
        // We'll use a simpler approach
        
        // Look for a player with this ID in the world
        // This is a workaround - in a real implementation, you might want to get this from a player manager
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) return null;
        
        // For simplicity, we'll pass messages through the PlayerManager instead
        // This avoids having to add new methods to PlayerInventory
        return null; // We'll handle messaging through different means
    }
} 