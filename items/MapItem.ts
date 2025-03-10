import { World } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class MapItem extends BaseItem {
    private static readonly ITEM_TYPE = 'map';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, MapItem.ITEM_TYPE, 'models/items/map.gltf');
    }

    protected getLogPrefix(): string {
        return '[MapItem]';
    }
} 