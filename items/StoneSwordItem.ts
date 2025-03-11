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
        super(
            world,
            position,
            playerHotbars,
            'sword-stone',
            'models/items/sword-stone.gltf',
            {
                isStackable: false,
                maxStackSize: 1
            }
        );
    }

    protected getLogPrefix(): string {
        return '[StoneSwordItem]';
    }
} 