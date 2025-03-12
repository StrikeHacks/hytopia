import { World, PlayerEntity } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from '../items/BaseItem';
import { itemConfigs, NON_STACKABLE_TYPES, getItemConfig } from '../config/items';

// Define the initial items using item types directly from config
const INITIAL_ITEMS = [
    { type: 'sword-diamond', position: { x: 6, y: 3.7, z: 2 } },
    { type: 'sword-diamond', position: { x: 6, y: 3.7, z: 1 } },
    { type: 'sword-diamond', position: { x: 6, y: 3.7, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 2 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 1 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 0 } },

    { type: 'clock', position: { x: 8, y: 3.4, z: -1 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -2 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -3 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -4 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -5 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -6 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -7 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -8 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -9 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -10 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -11 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -12 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -13 } },  
    { type: 'clock', position: { x: 8, y: 3.4, z: -14 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -15 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -16 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -17 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -18 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: -19 } },
    

    { type: 'paper', position: { x: 10, y: 3.4, z: 2 } },
    { type: 'paper', position: { x: 10, y: 3.4, z: 1 } },
    { type: 'paper', position: { x: 10, y: 3.4, z: 0 } },
    { type: 'bread', position: { x: 12, y: 3.4, z: 2 } },
    { type: 'bread', position: { x: 12, y: 3.4, z: 1 } },
    { type: 'bread', position: { x: 12, y: 3.4, z: 0 } },
    { type: 'book', position: { x: 14, y: 3.4, z: 2 } },
    { type: 'book', position: { x: 14, y: 3.4, z: 1 } },
    { type: 'sword-stone', position: { x: 16, y: 3.7, z: 2 } },
    { type: 'sword-stone', position: { x: 16, y: 3.7, z: 1 } },
    { type: 'sword-stone', position: { x: 16, y: 3.7, z: 0 } },
    { type: 'sword-golden', position: { x: 18, y: 3.7, z: 2 } },
    { type: 'sword-golden', position: { x: 18, y: 3.7, z: 1 } },
    { type: 'sword-golden', position: { x: 18, y: 3.7, z: 0 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: 2 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: 1 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: 0 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -1 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -2 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -3 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -4 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -5 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -6 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: -7 } },


];

export class ItemSpawner {
    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {}

    public spawnInitialItems(): void {
        INITIAL_ITEMS.forEach(({ type, position }) => {
            // Create item directly using BaseItem
            const item = new BaseItem(this.world, position, this.playerInventories, type);
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
        try {
            getItemConfig(itemType); // Verify item exists
            console.log('[ItemSpawner] Spawning', dropCount, 'items of type:', itemType);
            for (let i = 0; i < dropCount; i++) {
                const offsetPosition = {
                    x: dropPosition.x + (Math.random() * 0.2 - 0.1),
                    y: dropPosition.y,
                    z: dropPosition.z + (Math.random() * 0.2 - 0.1)
                };

                const droppedItem = new BaseItem(this.world, offsetPosition, this.playerInventories, itemType);
                droppedItem.spawn();
                droppedItem.drop(offsetPosition, direction);
            }
        } catch (e) {
            console.log('[ItemSpawner] No config found for type:', itemType);
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