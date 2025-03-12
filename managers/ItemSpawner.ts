import { World, PlayerEntity } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from '../items/BaseItem';
import { itemConfigs, NON_STACKABLE_TYPES, getItemConfig } from '../config/items';

// Define the initial items using item types directly from config
const INITIAL_ITEMS = [
    { type: 'sword-diamond', position: { x: 6, y: 3.7, z: 2 } },
    { type: 'sword-diamond', position: { x: 6, y: 3.7, z: 1 } },
    { type: 'clock', position: { x: 8, y: 3.4, z: 2 } },

    
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

    { type: 'sword-golden', position: { x: 18, y: 3.7, z: 0 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: 2 } },
    { type: 'fishing-rod', position: { x: 20, y: 3.7, z: 1 } },
    { type: 'shears', position: { x: 4, y: 3.7, z: 2 } },
   
];

export class ItemSpawner {
    private activeItems: Map<string, BaseItem[]> = new Map();
    private readonly DROP_COOLDOWN = 200; // ms
    private lastDropTime = 0;

    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {}

    public spawnInitialItems(): void {
        INITIAL_ITEMS.forEach(({ type, position }) => {
            const item = new BaseItem(this.world, position, this.playerInventories, type);
            item.spawn();
            const items = this.activeItems.get(type) || [];
            items.push(item);
            this.activeItems.set(type, items);
        });
    }

    public handleItemDrop(playerEntity: PlayerEntity, isShiftHeld: boolean): void {
        const now = Date.now();
        if (now - this.lastDropTime < this.DROP_COOLDOWN) {
            return;
        }
        this.lastDropTime = now;

        const inventory = this.playerInventories.get(String(playerEntity.player.id));
        if (!inventory) {
            console.log('[ItemSpawner] No inventory found for player');
            return;
        }

        const selectedSlot = inventory.getSelectedSlot();
        const itemType = inventory.getItem(selectedSlot);
        if (!itemType) {
            return;
        }

        const itemCount = inventory.getItemCount(selectedSlot);
        if (itemCount <= 0) {
            return;
        }

        const dropCount = isShiftHeld ? itemCount : 1;
        const newCount = itemCount - dropCount;
        
        inventory.setItem(selectedSlot, newCount > 0 ? itemType : null, newCount);

        const dropPosition = this.calculateDropPosition(playerEntity);
        const direction = this.calculateDropDirection(playerEntity);

        try {
            getItemConfig(itemType);
            const items = this.activeItems.get(itemType) || [];
            
            for (let i = 0; i < dropCount; i++) {
                const offsetPosition = {
                    x: dropPosition.x + (Math.random() * 0.2 - 0.1),
                    y: dropPosition.y,
                    z: dropPosition.z + (Math.random() * 0.2 - 0.1)
                };

                const droppedItem = new BaseItem(this.world, offsetPosition, this.playerInventories, itemType);
                droppedItem.spawn();
                droppedItem.drop(offsetPosition, direction);
                items.push(droppedItem);
            }
            
            this.activeItems.set(itemType, items);
        } catch (e) {
            console.error('[ItemSpawner] Error dropping item:', e);
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

    public cleanup(): void {
        this.activeItems.forEach(items => {
            items.forEach(item => item.despawn());
        });
        this.activeItems.clear();
    }
} 