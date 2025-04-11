import { World } from 'hytopia';
import { NPC_CONFIGS } from '../config/npcs';
import type { NPCType } from '../config/npcs';
import { BaseNPC } from './npcs/BaseNPC';
import { DungeonNPC } from './npcs/DungeonNPC';

export class NPCManager {
    private _world: World;
    private _npcs: Map<string, BaseNPC> = new Map();

    constructor(world: World) {
        this._world = world;
    }

    public spawnAllNPCs(): void {
        NPC_CONFIGS.forEach(config => {
            let npc: BaseNPC;

            switch (config.type) {
                case 'dungeon':
                    npc = new DungeonNPC(this._world, config);
                    break;
                // Add more NPC types here as they are created
                default:
                    console.warn(`Unknown NPC type: ${config.type}`);
                    return;
            }

            this._npcs.set(config.id, npc);
        });
    }

    public removeNPC(npcId: string): void {
        const npc = this._npcs.get(npcId);
        if (npc) {
            npc.despawn();
            this._npcs.delete(npcId);
        }
    }

    public removeAllNPCs(): void {
        this._npcs.forEach(npc => npc.despawn());
        this._npcs.clear();
    }
} 