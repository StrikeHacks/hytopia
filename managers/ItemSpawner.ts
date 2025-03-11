import { World, PlayerEntity } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';
import { SwordItem } from '../items/SwordItem';
import { ClockItem } from '../items/ClockItem';
import { PaperItem } from '../items/PaperItem';
import { BreadItem } from '../items/BreadItem';
import { BookItem } from '../items/BookItem';
import { StoneSwordItem } from '../items/StoneSwordItem';
import { BaseItem } from '../items/BaseItem';

type ItemType = typeof SwordItem | typeof ClockItem | typeof PaperItem | 
                typeof BreadItem | typeof BookItem | typeof StoneSwordItem;

const INITIAL_ITEMS = [
    { type: SwordItem, position: { x: 6, y: 3.7, z: 2 } },
    { type: ClockItem, position: { x: 8, y: 3.4, z: 2 } },
    { type: PaperItem, position: { x: 10, y: 3.4, z: 2 } },
    { type: BreadItem, position: { x: 12, y: 3.4, z: 2 } },
    { type: BookItem, position: { x: 14, y: 3.4, z: 2 } },
    { type: StoneSwordItem, position: { x: 16, y: 3.7, z: 2 } }
];

const ITEM_CLASSES: Record<string, ItemType> = {
    'sword-diamond': SwordItem,
    'clock': ClockItem,
    'paper': PaperItem,
    'bread': BreadItem,
    'book': BookItem,
    'sword-stone': StoneSwordItem
};

export class ItemSpawner {
    constructor(
        private world: World,
        private playerHotbars: Map<string, HotbarManager>
    ) {}

    public spawnInitialItems(): void {
        INITIAL_ITEMS.forEach(({ type: ItemType, position }) => {
            const item = new ItemType(this.world, position, this.playerHotbars);
            item.spawn();
        });
    }

    public handleItemDrop(playerEntity: PlayerEntity): void {
        const hotbarManager = this.playerHotbars.get(String(playerEntity.player.id));
        if (!hotbarManager) return;

        const droppedItemType = hotbarManager.dropSelectedItem();
        if (!droppedItemType) return;

        const dropPosition = this.calculateDropPosition(playerEntity);
        const direction = this.calculateDropDirection(playerEntity);

        const ItemClass = ITEM_CLASSES[droppedItemType];
        if (ItemClass) {
            const droppedItem = new ItemClass(this.world, dropPosition, this.playerHotbars);
            droppedItem.spawn();
            droppedItem.drop(dropPosition, direction);
        }
    }

    private calculateDropPosition(playerEntity: PlayerEntity) {
        const playerPos = playerEntity.position;
        return {
            x: playerPos.x,
            y: playerPos.y + 1,
            z: playerPos.z
        };
    }

    private calculateDropDirection(playerEntity: PlayerEntity) {
        const rotation = playerEntity.rotation;
        const angle = 2 * Math.atan2(rotation.y, rotation.w);
        
        return {
            x: -Math.sin(angle),
            y: 0.2,
            z: -Math.cos(angle)
        };
    }
} 