import { World, PlayerEntity, Entity } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { recipes, getRecipesByCategory, getRecipeByName, type CraftingRecipe } from '../config/recipes';
import { getItemConfig } from '../config/items';

interface ActiveCraft {
    recipe: CraftingRecipe;
    progress: number;
    startTime: number;
    playerId: string;
}

export class CraftingManager {
    private activeCrafts: Map<string, ActiveCraft> = new Map();
    private craftingInterval: NodeJS.Timer;

    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {
        this.craftingInterval = setInterval(() => this.updateCrafting(), 100);
    }

    private getPlayerEntity(playerId: string): PlayerEntity | undefined {
        return this.world.entityManager.getAllPlayerEntities()
            .find((entity: PlayerEntity) => entity.player.id === playerId);
    }

    public handleGetRecipes(playerId: string, category: string): void {
        console.log('[CraftingManager] Handling recipe request:', { playerId, category });
        
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) {
            console.error('[CraftingManager] No inventory found for player:', playerId);
            return;
        }

        const categoryRecipes = getRecipesByCategory(category);
        console.log('[CraftingManager] Found recipes for category:', { category, count: categoryRecipes.length });
        
        const recipesWithImages = categoryRecipes.map(recipe => ({
            ...recipe,
            ingredients: recipe.ingredients.map(ing => ({
                ...ing,
                imageUrl: getItemConfig(ing.item).imageUrl
            })),
            result: {
                ...recipe.result,
                imageUrl: getItemConfig(recipe.result.item).imageUrl
            }
        }));

        const playerEntity = this.getPlayerEntity(playerId);
        if (playerEntity) {
            console.log('[CraftingManager] Sending recipes to UI:', recipesWithImages);
            playerEntity.player.ui.sendData({
                recipes: recipesWithImages
            });
        } else {
            console.error('[CraftingManager] Could not find player entity:', playerId);
        }
    }

    public startCrafting(playerId: string, recipeName: string): void {
        const inventory = this.playerInventories.get(playerId);
        if (!inventory) return;

        const recipe = getRecipeByName(recipeName);
        if (!recipe) return;

        // Check if player has required ingredients
        const hasIngredients = recipe.ingredients.every(ing => {
            let totalCount = 0;
            for (let i = 0; i < 20; i++) {
                if (inventory.getItem(i) === ing.item) {
                    totalCount += inventory.getItemCount(i);
                }
            }
            return totalCount >= ing.count;
        });

        if (!hasIngredients) {
            // Notify player they don't have required ingredients
            const playerEntity = this.getPlayerEntity(playerId);
            if (playerEntity) {
                playerEntity.player.ui.sendData({
                    craftingError: {
                        message: "Missing required ingredients"
                    }
                });
            }
            return;
        }

        // Remove ingredients from inventory
        recipe.ingredients.forEach(ing => {
            let remainingToRemove = ing.count;
            for (let i = 0; i < 20 && remainingToRemove > 0; i++) {
                if (inventory.getItem(i) === ing.item) {
                    const slotCount = inventory.getItemCount(i);
                    const removeCount = Math.min(slotCount, remainingToRemove);
                    inventory.setItem(i, ing.item, slotCount - removeCount);
                    remainingToRemove -= removeCount;
                }
            }
        });

        // Start crafting
        this.activeCrafts.set(`${playerId}-${recipeName}`, {
            recipe,
            progress: 0,
            startTime: Date.now(),
            playerId
        });
    }

    private updateCrafting(): void {
        const now = Date.now();
        
        for (const [key, craft] of this.activeCrafts.entries()) {
            const elapsed = (now - craft.startTime) / 1000; // Convert to seconds
            const progress = Math.min(100, (elapsed / craft.recipe.craftingTime) * 100);
            
            const playerEntity = this.getPlayerEntity(craft.playerId);
            if (playerEntity) {
                playerEntity.player.ui.sendData({
                    craftingProgress: {
                        recipeName: craft.recipe.name,
                        progress
                    }
                });
            }

            if (progress >= 100) {
                // Crafting complete
                this.completeCrafting(key, craft);
            }
        }
    }

    private completeCrafting(key: string, craft: ActiveCraft): void {
        const inventory = this.playerInventories.get(craft.playerId);
        if (!inventory) return;

        // Add crafted item to inventory
        const result = inventory.addItem(craft.recipe.result.item);
        
        const playerEntity = this.getPlayerEntity(craft.playerId);
        if (playerEntity) {
            if (result.success) {
                playerEntity.player.ui.sendData({
                    craftingComplete: {
                        recipeName: craft.recipe.name,
                        success: true
                    }
                });
            } else {
                // Return ingredients if inventory is full
                craft.recipe.ingredients.forEach(ing => {
                    inventory.addItem(ing.item);
                });
                
                playerEntity.player.ui.sendData({
                    craftingError: {
                        message: "Inventory full"
                    }
                });
            }
        }

        this.activeCrafts.delete(key);
    }

    public cleanup(): void {
        if (this.craftingInterval) {
            clearInterval(this.craftingInterval);
        }
        this.activeCrafts.clear();
    }
} 