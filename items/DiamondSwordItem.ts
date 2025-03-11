import { World } from 'hytopia';
import { BaseItem } from './BaseItem';
import { PlayerInventory } from '../player/PlayerInventory';

export class DiamondSwordItem extends BaseItem {
    private static readonly ITEM_TYPE = 'sword-diamond';

    constructor(
        world: World,
        position: { x: number; y: number; z: number },
        playerInventories: Map<string, PlayerInventory>
    ) {
        super(
            world,
            position,
            playerInventories,
            DiamondSwordItem.ITEM_TYPE,
            'models/items/sword-diamond.gltf'
        );
    }

    protected getLogPrefix(): string {
        return '[DiamondSwordItem]';
    }
} 