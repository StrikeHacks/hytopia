import { World, PlayerEntity, Entity, RigidBodyType, ColliderShape, CollisionGroup } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { BaseItem } from '../items/BaseItem';
import { getItemConfig, NON_STACKABLE_TYPES } from '../config/items';
import { getItemsByCategory } from '../config/items';

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
    { type: 'axe-stone', position: { x: 4, y: 3.7, z: 2 } },
    { type: 'pickaxe-stone', position: { x: 2, y: 3.7, z: 2 } },
    { type: 'stick', position: { x: 0, y: 3.7, z: 2 } },
    { type: 'bone', position: { x: -2, y: 3.7, z: 2 } },
    { type: 'log', position: { x: -4, y: 3.7, z: 2 } },
    { type: 'dungeon-key', position: { x: -6, y: 3.7, z: 2 } },
    { type: 'nails', position: { x: -8, y: 3.7, z: 2 } },
    { type: 'iron-plate', position: { x: -10, y: 3.7, z: 2 } },
    { type: 'rope', position: { x: -12, y: 3.7, z: 2 } },
    { type: 'iron-ore', position: { x: -14, y: 3.7, z: 2 } },
    { type: 'stone', position: { x: -16, y: 3.7, z: 2 } },
    { type: 'iron-ingot', position: { x: -18, y: 3.7, z: 2 } },
    { type: 'leather', position: { x: -20, y: 3.7, z: 2 } },

];

export class ItemSpawner {
    private activeItems: Map<string, BaseItem[]> = new Map();
    private readonly DROP_COOLDOWN = 200; // ms
    private lastDropTime = 0;

    constructor(
        private world: World,
        private playerInventories: Map<string, PlayerInventory>
    ) {}

    // Add getter methods
    public getPlayerInventories(): Map<string, PlayerInventory> {
        return this.playerInventories;
    }

    public getActiveItems(): Map<string, BaseItem[]> {
        return this.activeItems;
    }

    public spawnInitialItems(): void {
        INITIAL_ITEMS.forEach(({ type, position }) => {
            this.spawnItem(type, position);
        });
    }

    private spawnItem(type: string, position: { x: number; y: number; z: number }): void {
        const item = new BaseItem(this.world, position, this.playerInventories, type);
        item.spawn();
        
        const items = this.activeItems.get(type) || [];
        items.push(item);
        this.activeItems.set(type, items);
    }

    public handleItemDrop(playerEntity: PlayerEntity, isShiftHeld: boolean): void {
        const now = Date.now();
        if (now - this.lastDropTime < this.DROP_COOLDOWN) {
            return;
        }
        this.lastDropTime = now;

        const inventory = this.playerInventories.get(String(playerEntity.player.id));
        if (!inventory) {
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

        // Get the item instance before removing from inventory
        const itemInstance = inventory.getItemInstance(selectedSlot);
        
        const dropCount = isShiftHeld ? itemCount : 1;
        const newCount = itemCount - dropCount;
        
        // Update inventory, removing the items that will be dropped
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

                // Create a new item with the same instance properties to preserve durability
                let droppedItem;
                if (itemInstance && i === 0) {
                    // Use the original instance for the first item, but with correct count
                    const modifiedInstance = {
                        ...itemInstance,
                        count: 1
                    };
                    droppedItem = new BaseItem(this.world, offsetPosition, this.playerInventories, itemType, modifiedInstance);
                } else {
                    // Create new items without instance (they'll get new instances)
                    droppedItem = new BaseItem(this.world, offsetPosition, this.playerInventories, itemType);
                }
                
                droppedItem.spawn();
                droppedItem.drop(offsetPosition, direction);
                items.push(droppedItem);
            }
            
            this.activeItems.set(itemType, items);
        } catch (e) {
            console.error('[ItemSpawner] Error dropping item:', e);
        }
    }

    /**
     * Handles drops from mining/chopping blocks with a different drop behavior
     * @param itemType The type of item to drop
     * @param position The position where the block was broken
     */
    public handleBlockDrop(itemType: string, position: { x: number; y: number; z: number }): void {
        try {
            console.log(`[ItemSpawner] handleBlockDrop aangeroepen voor ${itemType} op positie`, position);
            
            // Controleer of itemType geldig is
            if (!itemType || typeof itemType !== 'string') {
                console.error(`[ItemSpawner] Ongeldige itemType: ${itemType}`);
                return;
            }
            
            // Controleer of positie geldig is
            if (!position || typeof position !== 'object' || 
                position.x === undefined || position.y === undefined || position.z === undefined) {
                console.error(`[ItemSpawner] Ongeldige positie:`, position);
                return;
            }
            
            const blockCenter = {
                x: Math.floor(position.x) + 0.5,
                y: Math.floor(position.y) + 0.5,
                z: Math.floor(position.z) + 0.5
            };
            
            console.log(`[ItemSpawner] Berekende blockCenter:`, blockCenter);
            
            const randomAngle = Math.random() * Math.PI * 2;
            const direction = {
                x: Math.cos(randomAngle) * 2,
                y: 0.4,
                z: Math.sin(randomAngle) * 2
            };
            
            console.log(`[ItemSpawner] Berekende drop richting:`, direction);
            
            const items = this.activeItems.get(itemType) || [];
            console.log(`[ItemSpawner] Er zijn momenteel ${items.length} actieve ${itemType} items`);
            
            // Controleer of BaseItem correct geïmporteerd is
            if (!BaseItem) {
                console.error(`[ItemSpawner] KRITIEKE FOUT: BaseItem class is niet geïmporteerd of undefined`);
                return;
            }
            
            // Maak een BaseItem aan en spawn het
            console.log(`[ItemSpawner] Nu een nieuw ${itemType} item aanmaken...`);
            const droppedItem = new BaseItem(this.world, blockCenter, this.playerInventories, itemType);
            
            console.log(`[ItemSpawner] Item aangemaakt, nu spawnen...`);
            droppedItem.spawn();
            
            console.log(`[ItemSpawner] Item gespawned, nu droppen met physics...`);
            droppedItem.drop(blockCenter, direction, true);
            
            console.log(`[ItemSpawner] Item succesvol gedropt met physics`);
            
            // Voeg toe aan actieve items
            items.push(droppedItem);
            this.activeItems.set(itemType, items);
            
            console.log(`[ItemSpawner] Item toegevoegd aan activeItems, nu ${items.length} actieve ${itemType} items`);
        } catch (error) {
            console.error('[ItemSpawner] Error spawning block drop:', error);
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
            x: -Math.sin(angle) * 0.4,  // Use DEFAULT_DROP_FORCE.horizontal
            y: 0.1,                     // Use DEFAULT_DROP_FORCE.vertical
            z: -Math.cos(angle) * 0.4   // Use DEFAULT_DROP_FORCE.horizontal
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