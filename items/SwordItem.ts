import { World } from 'hytopia';
import { BaseItem } from './BaseItem';
import { PlayerInventory } from '../player/PlayerInventory';

export class SwordItem extends BaseItem {
    constructor(
        world: World,
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(
            world,
            position,
            playerInventories as any,
            'sword-diamond',
            'models/items/sword-diamond.gltf'
        );
    }

    protected getLogPrefix(): string {
        return '[SwordItem]';
    }
} 