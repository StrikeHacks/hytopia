import { World } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class ClockItem extends BaseItem {
    private static readonly ITEM_TYPE = 'clock';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, ClockItem.ITEM_TYPE, 'models/items/clock.gltf');
    }

    protected getLogPrefix(): string {
        return '[ClockItem]';
    }
} 