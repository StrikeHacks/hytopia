import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from './BaseItem';

export class ClockItem extends BaseItem {
    private static readonly ITEM_TYPE = 'clock';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(world, position, playerInventories, ClockItem.ITEM_TYPE, 'models/items/clock.gltf');
    }

    protected getLogPrefix(): string {
        return '[ClockItem]';
    }
} 