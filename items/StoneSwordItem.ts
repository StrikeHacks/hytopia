import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from './BaseItem';

export class StoneSwordItem extends BaseItem {
    private static readonly ITEM_TYPE = 'sword-stone';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(world, position, playerInventories, StoneSwordItem.ITEM_TYPE, 'models/items/sword-stone.gltf');
    }

    protected getLogPrefix(): string {
        return '[StoneSwordItem]';
    }
} 