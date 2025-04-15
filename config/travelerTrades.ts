import { getItemConfig } from './items';

// Transaction time configuration constant

export interface TravelerTrade {
    id: string;             // Unique identifier for the trade
    name: string;           // Display name of the trade
    category: string;       // Category for grouping similar trades (daily, weekly, special)
    requirements: {         // Resources required to complete the trade
        type: string;       // Type of item required
        count: number;      // Number of items required
    }[];
    result: {              // Item received from the trade
        type: string;       // Type of item received
        count: number;      // Number of items received
    };
    description?: string;    // Optional description of the trade or resulting item
    level?: number;          // Optional level requirement for the trade
}

// Define the traveler trades
export const travelerTrades: TravelerTrade[] = [
    // Daily trades (rotated daily)
    {
        id: "dungeon-key-basic",
        name: "Basic Dungeon Key",
        category: "special",
        requirements: [
            { type: "iron-ingot", count: 5 }
        ],
        result: {
            type: "dungeon-key",
            count: 1
        },
        description: "A basic key that can open simple dungeon doors!!",
    },
    {
        id: "bronze-key",
        name: "Bronze Key",
        category: "special",
        requirements: [
            { type: "elderwood-scrap", count: 3 }
        ],
        result: {   
            type: "bronze-key",
            count: 1
        },
        description: "A bronze key that can open a brozne crate!",
    },
    {
        id: "iron-key",
        name: "Gold Key",
        category: "special",
        requirements: [
            { type: "elderwood-scrap", count: 10 }
        ],
        result: {   
            type: "iron-key",
            count: 1
        },
        description: "An iron key that can open an iron crate!",
    },
    {
        id: "gold-key",
        name: "Gold Key",
        category: "special",
        requirements: [
            { type: "elderwood-scrap", count: 20 }
        ],
        result: {   
            type: "gold-key",
            count: 1
        },
        description: "A golden key that can open a gold crate!",
    }
];

// Helper function to get trades by category
export function getTradesByCategory(category: string): TravelerTrade[] {
    console.log(`[TravelerTrades] Getting trades for category: "${category}"`);
    
    const matchingTrades = travelerTrades.filter(trade => trade.category === category);
    
    console.log(`[TravelerTrades] Found ${matchingTrades.length} trades for category "${category}"`);
    return matchingTrades;
}

// Helper function to get all available categories
export function getAvailableTradeCategories(): TravelerTrade['category'][] {
    return Array.from(new Set(travelerTrades.map(trade => trade.category)));
}

// Helper function to get trade by ID
export function getTradeById(id: string): TravelerTrade | undefined {
    return travelerTrades.find(trade => trade.id === id);
}

// Helper function to format trade for UI display
export function formatTradeForUI(trade: TravelerTrade) {
    console.log(`[TravelerTrades] Formatting trade for UI: ${trade.name}, category: ${trade.category}`);
    try {
        const formattedTrade = {
            id: trade.id,
            name: trade.name,
            category: trade.category,
            description: trade.description || "",
            level: trade.level || 1,
            inputs: trade.requirements.map(requirement => {
                try {
                    console.log(`[TravelerTrades] Formatting requirement: ${requirement.type} for trade ${trade.name}`);
                    const itemConfig = getItemConfig(requirement.type);
                    console.log(`[TravelerTrades] Got item config for ${requirement.type}, imageUrl: ${itemConfig.imageUrl || 'missing'}`);
                    
                    return {
                        type: requirement.type,
                        count: requirement.count,
                        name: itemConfig.displayName || requirement.type,
                        imageUrl: itemConfig.imageUrl || 'items/fallback.png'
                    };
                } catch (error) {
                    console.error(`[TravelerTrades] Error formatting requirement ${requirement.type} for trade ${trade.name}:`, error);
                    return { 
                        type: requirement.type,
                        count: requirement.count,
                        name: requirement.type,
                        imageUrl: 'items/fallback.png'
                    };
                }
            }),
            outputs: [{
                type: trade.result.type,
                count: trade.result.count,
                name: (() => {
                    try {
                        return getItemConfig(trade.result.type).displayName || trade.result.type;
                    } catch (error) {
                        return trade.result.type;
                    }
                })(),
                imageUrl: (() => {
                    try {
                        return getItemConfig(trade.result.type).imageUrl || 'items/fallback.png';
                    } catch (error) {
                        return 'items/fallback.png';
                    }
                })()
            }]
        };
        
        return formattedTrade;
    } catch (error) {
        console.error(`[TravelerTrades] Error formatting trade ${trade.name}:`, error);
        // Return a basic version without images as fallback
        return {
            id: trade.id,
            name: trade.name,
            category: trade.category,
            description: trade.description || "",
            level: trade.level || 1,
            inputs: trade.requirements.map(req => ({
                type: req.type,
                count: req.count,
                name: req.type,
                imageUrl: 'items/fallback.png'
            })),
            outputs: [{
                type: trade.result.type,
                count: trade.result.count,
                name: trade.result.type,
                imageUrl: 'items/fallback.png'
            }]
        };
    }
} 