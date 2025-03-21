import { getItemConfig } from './items';

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
}

export const recipes: Recipe[] = [
    {
        name: "Stone Pickaxe",
        category: "tools",
        inputs: [
            { type: "stick", count: 2 },
            { type: "iron-ingot", count: 3 }
        ],
        output: {
            type: "pickaxe-stone",
            count: 1
        }
    },
    {
        name: "Stone Axe",
        category: "tools",
        inputs: [
            { type: "stick", count: 2 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }

        ],
        output: {
            type: "axe-stone",
            count: 1
        }
    },
    {
        name: "Iron Axe",
        category: "tools",
        inputs: [
            { type: "stick", count: 2 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }

        ],
        output: {
            type: "axe-stone",
            count: 1
        }
    },
    {
        name: "Iron Pickaxe",
        category: "tools",
        inputs: [
            { type: "stick", count: 2 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }

        ],
        output: {
            type: "axe-stone",
            count: 1
        }
    },
    {
        name: "Iron Test",
        category: "tools",
        inputs: [
            { type: "stick", count: 1 },
            { type: "iron-ingot", count: 3 },
            { type: "book", count: 3 }

        ],
        output: {
            type: "axe-stone",
            count: 1
        }
    },
    {
        name: "Stone Sword",
        category: "weapons",
        inputs: [
            { type: "stick", count: 1 },
            { type: "iron-ingot", count: 2 }
        ],
        output: {
            type: "sword-stone",
            count: 1
        }
    },
    {
        name: "Golden Sword",
        category: "weapons",
        inputs: [
            { type: "stick", count: 1 },
            { type: "iron-ingot", count: 2 }
        ],
        output: {
            type: "sword-golden",
            count: 1
        }
    }
];

// Helper function to get recipes by category
export function getRecipesByCategory(category: string): Recipe[] {
    console.log(`[Recipes] Getting recipes for category: "${category}"`);
    
    const matchingRecipes = recipes.filter(recipe => recipe.category === category);
    
    console.log(`[Recipes] Found ${matchingRecipes.length} recipes for category "${category}"`);
    if (matchingRecipes.length > 0) {
        matchingRecipes.forEach((recipe, index) => {
            console.log(`[Recipes] - Recipe ${index}: ${recipe.name}, category: ${recipe.category}`);
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
    console.log(`[Recipes] Formatting recipe for UI: ${recipe.name}, category: ${recipe.category}`);
    try {
        const formattedRecipe = {
            name: recipe.name,
            category: recipe.category,
            inputs: recipe.inputs.map(input => {
                try {
                    console.log(`[Recipes] Formatting input: ${input.type} for recipe ${recipe.name}`);
                    const itemConfig = getItemConfig(input.type);
                    console.log(`[Recipes] Got item config for ${input.type}, imageUrl: ${itemConfig.imageUrl || 'missing'}`);
                    
                    const formattedInput = {
                        ...input,
                        imageUrl: `{{CDN_ASSETS_URL}}/${itemConfig.imageUrl}`
                    };
                    console.log(`[Recipes] Formatted input imageUrl: ${formattedInput.imageUrl}`);
                    return formattedInput;
                } catch (error) {
                    console.error(`[Recipes] Error formatting input ${input.type} for recipe ${recipe.name}:`, error);
                    return { ...input, imageUrl: null };
                }
            }),
            output: {
                ...recipe.output,
                imageUrl: `{{CDN_ASSETS_URL}}/${getItemConfig(recipe.output.type).imageUrl}`
            }
        };
        
        console.log(`[Recipes] Output imageUrl: ${formattedRecipe.output.imageUrl}`);
        console.log(`[Recipes] Successfully formatted recipe: ${recipe.name}, category will be: ${formattedRecipe.category}`);
        return formattedRecipe;
    } catch (error) {
        console.error(`[Recipes] Error formatting recipe ${recipe.name}:`, error);
        // Return a basic version without images as fallback
        return {
            name: recipe.name,
            category: recipe.category,
            inputs: recipe.inputs,
            output: recipe.output
        };
    }
} 