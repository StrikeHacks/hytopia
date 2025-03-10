import { World, Entity, PlayerEntity } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class SwordItem extends BaseItem {
    private static readonly ITEM_TYPE = 'sword-diamond';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, SwordItem.ITEM_TYPE, 'models/items/sword-diamond.gltf');
    }

    protected getLogPrefix(): string {
        return '[SwordItem]';
    }
} 