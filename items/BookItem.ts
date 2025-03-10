import { World } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class BookItem extends BaseItem {
    private static readonly ITEM_TYPE = 'book';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, BookItem.ITEM_TYPE, 'models/items/book.gltf');
    }

    protected getLogPrefix(): string {
        return '[BookItem]';
    }
} 