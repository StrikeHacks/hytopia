import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from './BaseItem';

export class BreadItem extends BaseItem {
    private static readonly ITEM_TYPE = 'bread';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(world, position, playerInventories, BreadItem.ITEM_TYPE, 'models/items/bread.gltf');
    }

    protected getLogPrefix(): string {
        return '[BreadItem]';
    }
} 