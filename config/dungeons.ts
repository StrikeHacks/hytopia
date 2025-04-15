import type { DungeonConfig, DungeonBossConfig } from '../types/dungeon';
import { getItemConfig } from './items';
import { getKeyItem } from './keys';
import { STALKER_BOSSES } from '../bosses/stalkerBosses';

// Helper function to create a boss configuration
function createBossConfig(bossType: string): DungeonBossConfig {
    const bossConfig = STALKER_BOSSES[bossType];
    if (!bossConfig) {
        throw new Error(`Boss type ${bossType} not found in STALKER_BOSSES`);
    }

    return {
        id: bossType,
        name: bossConfig.name,
        type: 'StalkerBoss',
        bossConfig: bossConfig
    };
}

// Boss configuraties
export const DUNGEON_BOSSES: Record<string, DungeonBossConfig> = {
    TANK_STALKER: createBossConfig('tank-stalker'),
    FAST_STALKER: createBossConfig('fast-stalker'),
    BALANCED_STALKER: createBossConfig('balanced-stalker')
} as const;

// Dungeon configuraties
export const DUNGEONS: Record<string, DungeonConfig> = {
    ELDERWOORD_DUNGEON_1: {
        id: 'stalker_dungeon',
        name: 'Elderwood Dungeon 1',
        imageUrl: 'dungeons/stalker_dungeon.png',
        requiredKey: getKeyItem('dungeon-key') || getItemConfig('dungeon-key'),
        minLevel: 5,
        bosses: [
            {
                boss: DUNGEON_BOSSES.TANK_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.FAST_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.BALANCED_STALKER,
                count: 1,
            },
        ],
        lootTable: [
            { item: getItemConfig('elderwood-scrap'), count: 2, dropChance: 35 },
            { item: getItemConfig('log'), count: 1, dropChance: 65 },
            { item: getItemConfig('nails'), count: 1, dropChance: 50 }
        ]
    },
    STALKER_DUNGEON_2: {
        id: 'stalker_dungeon',
        name: 'Elderwood Dungeon 2',
        imageUrl: 'dungeons/stalker_dungeon.png',
        requiredKey: getKeyItem('dungeon-key') || getItemConfig('dungeon-key'),
        minLevel: 3,
        bosses: [
            {
                boss: DUNGEON_BOSSES.TANK_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.FAST_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.BALANCED_STALKER,
                count: 1,
            },
        ],
        lootTable: [
            { item: getItemConfig('elderwood-scrap'), count: 2, dropChance: 35 },
            { item: getItemConfig('leather'), count: 1, dropChance: 65 },
            { item: getItemConfig('dungeon-key'), count: 2, dropChance: 25 }
        ]
    },
    STALKER_DUNGEON_3: {
        id: 'stalker_dungeon',
        name: 'Elderwood Dungeon 3',
        imageUrl: 'dungeons/stalker_dungeon.png',
        requiredKey: getKeyItem('dungeon-key') || getItemConfig('dungeon-key'),
        minLevel: 11,
        bosses: [
            {
                boss: DUNGEON_BOSSES.TANK_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.FAST_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.BALANCED_STALKER,
                count: 1,
            },
        ],
        lootTable: [
            { item: getItemConfig('iron-ingot'), count: 2, dropChance: 35 },
            { item: getItemConfig('leather'), count: 1, dropChance: 65 },
            { item: getItemConfig('dungeon-key'), count: 2, dropChance: 25 }
        ]
    },
    STALKER_DUNGEON_4: {
        id: 'stalker_dungeon',
        name: 'Elderwood Dungeon 4',
        imageUrl: 'dungeons/stalker_dungeon.png',
        requiredKey: getKeyItem('dungeon-key') || getItemConfig('dungeon-key'),
        minLevel: 1,
        bosses: [
            {
                boss: DUNGEON_BOSSES.TANK_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.FAST_STALKER,
                count: 1,
            },
            {
                boss: DUNGEON_BOSSES.BALANCED_STALKER,
                count: 1,
            },
        ],
        lootTable: [
            { item: getItemConfig('iron-ingot'), count: 2, dropChance: 35 },
            { item: getItemConfig('leather'), count: 1, dropChance: 65 },
            { item: getItemConfig('dungeon-key'), count: 2, dropChance: 25 }
        ]
    }
} as const;

// Helper functies
export function getDungeonById(id: string): DungeonConfig | undefined {
    return Object.values(DUNGEONS).find(dungeon => dungeon.id === id);
}

export function getBossById(id: string): DungeonBossConfig | undefined {
    return Object.values(DUNGEON_BOSSES).find(boss => boss.id === id);
}

export function getLootChanceForItem(dungeonId: string, itemId: string): number {
    const dungeon = getDungeonById(dungeonId);
    if (!dungeon) return 0;
    
    const lootEntry = dungeon.lootTable.find(entry => entry.item.type === itemId);
    return lootEntry?.dropChance ?? 0;
} 