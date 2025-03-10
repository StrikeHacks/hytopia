import { World } from 'hytopia';
import type { ItemConfig } from '../types/items';
import { BaseGenerator } from './BaseGenerator';

export class IronGenerator extends BaseGenerator {
    private playerCounts = new Map<string, number>();

    constructor(world: World, config: ItemConfig) {
        super(world, config, 'iron-text', 'models/items/iron-ingot.gltf');
    }

    protected getStateKey(): 'activeIronCount' {
        return 'activeIronCount';
    }

    protected onPickup(player: any): void {
        const currentCount = this.playerCounts.get(player.id) || 0;
        const newCount = currentCount + 1;
        this.playerCounts.set(player.id, newCount);
        
        player.ui.sendData({ 
            ironCount: newCount
        });
    }

    public getPlayerCount(playerId: string): number {
        return this.playerCounts.get(playerId) || 0;
    }

    public removeFromPlayer(playerId: string, amount: number) {
        const currentCount = this.playerCounts.get(playerId) || 0;
        this.playerCounts.set(playerId, Math.max(0, currentCount - amount));
    }
} 