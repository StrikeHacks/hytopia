import { itemConfigs } from './items';

export interface CraftingRecipe {
    name: string;
    category: 'tools' | 'weapons' | 'resources' | 'misc';
    craftingTime: number; // in seconds
    ingredients: {
        item: string;
        count: number;
    }[];
    result: {
        item: string;
        count: number;
    };
}

export const recipes: CraftingRecipe[] = [
    {
        name: "Stone Axe",
        category: "tools",
        craftingTime: 3,
        ingredients: [
            { item: "stick", count: 2 },
            { item: "iron-ingot", count: 2 }
        ],
        result: {
            item: "axe-stone",
            count: 1
        }
    },
    {
        name: "Stone Pickaxe",
        category: "tools",
        craftingTime: 3,
        ingredients: [
            { item: "stick", count: 2 },
            { item: "iron-ingot", count: 3 }
        ],
        result: {
            item: "pickaxe-stone",
            count: 1
        }
    },
    {
        name: "Stone Sword",
        category: "weapons",
        craftingTime: 4,
        ingredients: [
            { item: "stick", count: 1 },
            { item: "iron-ingot", count: 2 }
        ],
        result: {
            item: "sword-stone",
            count: 1
        }
    },
    {
        name: "Golden Sword",
        category: "weapons",
        craftingTime: 5,
        ingredients: [
            { item: "sword-stone", count: 1 },
            { item: "iron-ingot", count: 4 }
        ],
        result: {
            item: "sword-golden",
            count: 1
        }
    },
    {
        name: "Book",
        category: "misc",
        craftingTime: 2,
        ingredients: [
            { item: "paper", count: 3 }
        ],
        result: {
            item: "book",
            count: 1
        }
    }
];

export function getRecipesByCategory(category: string): CraftingRecipe[] {
    return recipes.filter(recipe => recipe.category === category);
}

export function getRecipeByName(name: string): CraftingRecipe | undefined {
    return recipes.find(recipe => recipe.name === name);
} 