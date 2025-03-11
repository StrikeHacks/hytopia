import { World, PlayerEntity } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { DiamondSwordItem } from '../items/DiamondSwordItem';
import { ClockItem } from '../items/ClockItem';
import { PaperItem } from '../items/PaperItem';
import { BreadItem } from '../items/BreadItem';
import { BookItem } from '../items/BookItem';
import { StoneSwordItem } from '../items/StoneSwordItem';
import { BaseItem } from '../items/BaseItem';
import { NON_STACKABLE_TYPES } from '../types/items';

type ItemType = typeof DiamondSwordItem | typeof ClockItem | typeof PaperItem | 
                typeof BreadItem | typeof BookItem | typeof StoneSwordItem;

const INITIAL_ITEMS = [
    { type: DiamondSwordItem, position: { x: 6, y: 3.7, z: 2 } },
    { type: DiamondSwordItem, position: { x: 6, y: 3.7, z: 1 } },
    { type: DiamondSwordItem, position: { x: 6, y: 3.7, z: 0 } },
    { type: ClockItem, position: { x: 8, y: 3.4, z: 2 } },
    { type: ClockItem, position: { x: 8, y: 3.4, z: 1 } },
    { type: ClockItem, position: { x: 8, y: 3.4, z: 0 } },
    { type: PaperItem, position: { x: 10, y: 3.4, z: 2 } },
    { type: PaperItem, position: { x: 10, y: 3.4, z: 1 } },
    { type: PaperItem, position: { x: 10, y: 3.4, z: 0 } },
    { type: BreadItem, position: { x: 12, y: 3.4, z: 2 } },
    { type: BreadItem, position: { x: 12, y: 3.4, z: 1 } },
    { type: BreadItem, position: { x: 12, y: 3.4, z: 0 } },
    { type: BookItem, position: { x: 14, y: 3.4, z: 2 } },
    { type: BookItem, position: { x: 14, y: 3.4, z: 1 } },
    { type: StoneSwordItem, position: { x: 16, y: 3.7, z: 2 } },
    { type: StoneSwordItem, position: { x: 16, y: 3.7, z: 1 } },
    { type: StoneSwordItem, position: { x: 16, y: 3.7, z: 0 } }
];

const ITEM_CLASSES: Record<string, ItemType> = {
    'sword-diamond': DiamondSwordItem,
    'clock': ClockItem,
    'paper': PaperItem,
    'bread': BreadItem,
    'book': BookItem,
    'sword-stone': StoneSwordItem
};

export class ItemSpawner {
    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {}

    public spawnInitialItems(): void {
        INITIAL_ITEMS.forEach(({ type: ItemType, position }) => {
            const item = new ItemType(this.world, position, this.playerInventories);
            item.spawn();
        });
    }

    public handleItemDrop(playerEntity: PlayerEntity, isShiftHeld: boolean): void {
        console.log('[ItemSpawner] Starting item drop. Shift held:', isShiftHeld);
        
        const inventory = this.playerInventories.get(String(playerEntity.player.id));
        if (!inventory) {
            console.log('[ItemSpawner] No inventory found for player');
            return;
        }

        const selectedSlot = inventory.getSelectedSlot();
        const itemType = inventory.getItem(selectedSlot);
        if (!itemType) {
            console.log('[ItemSpawner] No item in selected slot:', selectedSlot);
            return;
        }

        const itemCount = inventory.getItemCount(selectedSlot);
        console.log('[ItemSpawner] Current item count:', itemCount);
        if (itemCount <= 0) {
            console.log('[ItemSpawner] Item count is 0 or negative');
            return;
        }

        // Drop either the entire stack or just one item
        const dropCount = isShiftHeld ? itemCount : 1;
        const newCount = itemCount - dropCount;
        console.log('[ItemSpawner] Dropping', dropCount, 'items. New count will be:', newCount);
        
        inventory.setItem(selectedSlot, newCount > 0 ? itemType : null, newCount);

        const dropPosition = this.calculateDropPosition(playerEntity);
        const direction = this.calculateDropDirection(playerEntity);

        // Spawn all dropped items with slight position variations
        const ItemClass = ITEM_CLASSES[itemType];
        if (ItemClass) {
            console.log('[ItemSpawner] Spawning', dropCount, 'items of type:', itemType);
            for (let i = 0; i < dropCount; i++) {
                const offsetPosition = {
                    x: dropPosition.x + (Math.random() * 0.2 - 0.1),
                    y: dropPosition.y,
                    z: dropPosition.z + (Math.random() * 0.2 - 0.1)
                };

                const droppedItem = new ItemClass(this.world, offsetPosition, this.playerInventories);
                droppedItem.spawn();
                droppedItem.drop(offsetPosition, direction);
            }
        } else {
            console.log('[ItemSpawner] No ItemClass found for type:', itemType);
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

    public registerPlayerInventory(playerId: string, inventory: PlayerInventory): void {
        this.playerInventories.set(playerId, inventory);
    }
} 