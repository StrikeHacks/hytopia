import { World } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from './BaseItem';

export class PaperItem extends BaseItem {
    private static readonly ITEM_TYPE = 'paper';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(world, position, playerInventories, PaperItem.ITEM_TYPE, 'models/items/paper.gltf');
    }

    protected getLogPrefix(): string {
        return '[PaperItem]';
    }
} 