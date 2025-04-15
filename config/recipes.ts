import { getItemConfig } from './items';

// Add craftingTime configuration constants at the top of the file
export const DEFAULT_CRAFTING_TIME = 3000; // 3 seconds by default

export interface Recipe {
    name: string;
    category: string;
    inputs: {
        type: string;
        count: number;
    }[];
    output: {
        type: string;
        count: number;
    };
    craftingTime?: number; // Time in milliseconds to craft this item
    xpReward?: number; // XP reward for crafting this item
    successRate?: number; // Optional success rate (0-100)
}

export const recipes: Recipe[] = [
    {
        name: "Stone Pickaxe",
        category: "tools",
        inputs: [
            { type: "stone", count: 2 },
            { type: "log", count: 3 }
        ],
        output: {
            type: "pickaxe-stone",
            count: 1
        },
        xpReward: 25,
        successRate: 100
    },
    {
        name: "Stone Axe",
        category: "tools",
        inputs: [
            { type: "stone", count: 3 },
            { type: "log", count: 3 }
        ],
        output: {
            type: "axe-stone",
            count: 1
        },
        xpReward: 25,
        successRate: 100
    },
    {
        name: "Iron Axe",
        category: "tools",
        inputs: [
            { type: "log", count: 2 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }
        ],
        output: {
            type: "axe-stone",
            count: 1
        },
        xpReward: 50
    },
    {
        name: "Iron Pickaxe",
        category: "tools",
        inputs: [
            { type: "log", count: 2 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }
        ],
        output: {
            type: "axe-stone",
            count: 1
        },
        xpReward: 50,
        successRate: 100
    },
    {
        name: "Iron Test",
        category: "tools",
        inputs: [
            { type: "log", count: 1 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }
        ],
        output: {
            type: "axe-stone",
            count: 1
        },
        xpReward: 35,
        successRate: 100
    },
    {
        name: "Stone Sword",
        category: "weapons",
        inputs: [
            { type: "log", count: 1 },
            { type: "iron-ingot", count: 2 }
        ],
        output: {
            type: "sword-stone",
            count: 1
        },
        xpReward: 30,
        successRate: 100
    },
    {
        name: "Golden Sword",
        category: "weapons",
        inputs: [
            { type: "log", count: 1 },
            { type: "iron-ingot", count: 2 }
        ],
        output: {
            type: "sword-golden",
            count: 1
        },
        xpReward: 75,
        successRate: 100
    }
];

// Helper function to get recipes by category
export function getRecipesByCategory(category: string): Recipe[] {
    
    const matchingRecipes = recipes.filter(recipe => recipe.category === category);
    
    if (matchingRecipes.length > 0) {
        matchingRecipes.forEach((recipe, index) => {
        });
    }
    
    return matchingRecipes;
}

// Helper function to get all available categories
export function getAvailableCategories(): Recipe['category'][] {
    return Array.from(new Set(recipes.map(recipe => recipe.category)));
}

// Helper function to get recipe by ID
export function getRecipeById(id: string): Recipe | undefined {
    return recipes.find(recipe => recipe.name === id);
}

// Helper function to format recipe for UI display
export function formatRecipeForUI(recipe: Recipe) {
    try {
        // Get item config for output item to access rarity and durability
        const outputItemConfig = getItemConfig(recipe.output.type);
        const outputRarity = outputItemConfig.rarity || 'common';
        
        // Get maxDurability only if the item type supports it
        let outputMaxDurability: number | undefined = undefined;
        if (outputItemConfig.category === 'tool' || outputItemConfig.category === 'tools' || 
            outputItemConfig.category === 'weapon' || outputItemConfig.category === 'weapons' || 
            outputItemConfig.category === 'armor') {
             // Cast to the appropriate type to access maxDurability safely
             outputMaxDurability = (outputItemConfig as any).maxDurability;
        }
            
        const formattedRecipe = {
            name: recipe.name,
            category: recipe.category,
            inputs: recipe.inputs.map(input => {
                try {
                    const itemConfig = getItemConfig(input.type);
                    
                    const formattedInput = {
                        ...input,
                        imageUrl: `{{CDN_ASSETS_URL}}/${itemConfig.imageUrl}`
                    };
                    return formattedInput;
                } catch (error) {
                    console.error(`[Recipes] Error formatting input ${input.type} for recipe ${recipe.name}:`, error);
                    return { ...input, imageUrl: null };
                }
            }),
            output: {
                ...recipe.output,
                imageUrl: `{{CDN_ASSETS_URL}}/${outputItemConfig.imageUrl}`,
                rarity: outputRarity,
                maxDurability: outputMaxDurability // Use the correctly fetched value
            },
            craftingTime: recipe.craftingTime ?? DEFAULT_CRAFTING_TIME, // Use default if not specified
            successRate: recipe.successRate ?? 100 // Default to 100% if not specified
        };
        

        return formattedRecipe;
    } catch (error) {
        console.error(`[Recipes] Error formatting recipe ${recipe.name}:`, error);
        // Return a basic version without images as fallback
        return {
            name: recipe.name,
            category: recipe.category,
            inputs: recipe.inputs,
            output: recipe.output,
            craftingTime: recipe.craftingTime ?? DEFAULT_CRAFTING_TIME,
            successRate: recipe.successRate ?? 100
        };
    }
} 