import { World } from 'hytopia';
import { BaseItem } from './BaseItem';
import { HotbarManager } from '../player/HotbarManager';

export class WoodItem extends BaseItem {
    constructor(
        world: World,
        position: { x: number; y: number; z: number },
        playerHotbars: Map<string, HotbarManager>
    ) {
        super(
            world,
            position,
            playerHotbars,
            'wood',
            'models/items/wood.gltf',
            {
                isStackable: true,
                maxStackSize: 64
            }
        );
    }
} 