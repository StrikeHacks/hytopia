import { World, Entity, PlayerEntity } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class StoneSwordItem extends BaseItem {
    private static readonly ITEM_TYPE = 'sword-stone';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, StoneSwordItem.ITEM_TYPE, 'models/items/sword-stone.gltf');
    }

    protected getLogPrefix(): string {
        return '[StoneSwordItem]';
    }
} 