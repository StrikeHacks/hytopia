import { World } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { BaseItem } from './BaseItem';

export class PaperItem extends BaseItem {
    private static readonly ITEM_TYPE = 'paper';

    constructor(
        world: World, 
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(world, position, playerHotbars, PaperItem.ITEM_TYPE, 'models/items/paper.gltf');
    }

    protected getLogPrefix(): string {
        return '[PaperItem]';
    }
} 