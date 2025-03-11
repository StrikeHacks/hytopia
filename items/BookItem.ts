import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from './BaseItem';

export class BookItem extends BaseItem {
    private static readonly ITEM_TYPE = 'book';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(world, position, playerInventories, BookItem.ITEM_TYPE, 'models/items/book.gltf');
    }

    protected getLogPrefix(): string {
        return '[BookItem]';
    }
} 