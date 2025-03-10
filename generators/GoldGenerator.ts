import { World } from 'hytopia';
import type { ItemConfig } from '../types/items';
import { BaseGenerator } from './BaseGenerator';

export class GoldGenerator extends BaseGenerator {
    private playerCounts = new Map<string, number>();

    constructor(world: World, config: ItemConfig) {
        super(world, config, 'gold-text', 'models/items/gold-ingot.gltf');
    }

    protected getStateKey(): 'activeGoldCount' {
        return 'activeGoldCount';
    }

    protected onPickup(player: any): void {
        const currentCount = this.playerCounts.get(player.id) || 0;
        const newCount = currentCount + 1;
        this.playerCounts.set(player.id, newCount);
        
        player.ui.sendData({ 
            goldCount: newCount
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