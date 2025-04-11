import type { ItemProperties } from './items';
import type { StalkerBossOptions } from '../bosses/StalkerBoss';

// Item definitie
export type ItemConfig = ItemProperties;

// Loot entry in de loot table
export interface LootConfig {
    item: ItemConfig;
    count: number;
    dropChance: number; // 0-100 percentage
}

// Boss configuratie
export interface DungeonBossConfig {
    id: string;
    name: string;
    type: string;
    bossConfig?: StalkerBossOptions;
}

// Boss entry in een dungeon
export interface DungeonBossEntry {
    boss: DungeonBossConfig;
    count: number;
}

// Dungeon configuratie
export interface DungeonConfig {
    id: string;
    name: string;
    imageUrl: string;
    requiredKey: ItemConfig;
    minLevel: number;
    bosses: DungeonBossEntry[];
    lootTable: LootConfig[]; // Loot for completing the entire dungeon
} 