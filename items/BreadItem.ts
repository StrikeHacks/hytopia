import { World } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class BreadItem extends BaseItem {
    private static readonly ITEM_TYPE = 'bread';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, BreadItem.ITEM_TYPE, 'models/items/bread.gltf');
    }

    protected getLogPrefix(): string {
        return '[BreadItem]';
    }
} 