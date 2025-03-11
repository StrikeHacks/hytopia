import { PlayerEntity } from 'hytopia';

interface InventorySlot {
    itemType: string | null;
    count: number;
}

export class InventoryManager {
    private slots: InventorySlot[] = Array(20).fill(null).map(() => ({ itemType: null, count: 0 }));

    constructor(private playerEntity: PlayerEntity) {
        console.log('[InventoryManager] Initialized with 20 slots');
    }

    public setItem(slot: number, itemType: string | null, count: number = 1): void {
        if (slot >= 0 && slot < this.slots.length) {
            this.slots[slot] = { itemType, count: itemType ? count : 0 };
            console.log(`[InventoryManager] Set slot ${slot} to ${itemType} (count: ${count})`);

            // Update UI for both inventory and hotbar
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot,
                    item: itemType,
                    count: count
                }
            });

            // If it's a hotbar slot (0-4), also update the hotbar UI
            if (slot < 5) {
                this.playerEntity.player.ui.sendData({
                    hotbarUpdate: {
                        slot,
                        item: itemType,
                        count: count
                    }
                });
            }
        }
    }

    public getItem(slot: number): { itemType: string | null, count: number } {
        if (slot >= 0 && slot < this.slots.length) {
            return this.slots[slot];
        }
        return { itemType: null, count: 0 };
    }

    public addItemToStack(itemType: string, maxStackSize: number = 64): boolean {
        // First try to add to existing stacks
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (slot.itemType === itemType && slot.count < maxStackSize) {
                slot.count++;
                this.setItem(i, itemType, slot.count);
                return true;
            }
        }

        // Then try to add to empty slots
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].itemType === null) {
                this.setItem(i, itemType, 1);
                return true;
            }
        }

        return false;
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => slot.itemType === null);
    }

    public hasSpaceForItem(itemType: string, maxStackSize: number = 64): boolean {
        // Check for existing stacks that aren't full
        const existingStack = this.slots.find(slot => 
            slot.itemType === itemType && slot.count < maxStackSize
        );
        if (existingStack) return true;

        // Check for empty slots
        return this.hasEmptySlot();
    }

    public findEmptySlot(): number | null {
        const emptyIndex = this.slots.findIndex(slot => slot.itemType === null);
        return emptyIndex >= 0 ? emptyIndex : null;
    }

    public moveItem(fromSlot: number, toSlot: number): boolean {
        if (fromSlot >= 0 && fromSlot < this.slots.length &&
            toSlot >= 0 && toSlot < this.slots.length) {
            
            const fromItem = this.slots[fromSlot];
            const toItem = this.slots[toSlot];

            // If destination slot is empty
            if (toItem.itemType === null) {
                this.slots[toSlot] = { ...fromItem };
                this.slots[fromSlot] = { itemType: null, count: 0 };
            }
            // If same item type and stackable
            else if (fromItem.itemType === toItem.itemType) {
                const totalCount = fromItem.count + toItem.count;
                const maxStack = 64; // You might want to make this dynamic based on item type
                if (totalCount <= maxStack) {
                    this.slots[toSlot].count = totalCount;
                    this.slots[fromSlot] = { itemType: null, count: 0 };
                } else {
                    this.slots[toSlot].count = maxStack;
                    this.slots[fromSlot].count = totalCount - maxStack;
                }
            }
            // Different items - swap them
            else {
                [this.slots[fromSlot], this.slots[toSlot]] = [this.slots[toSlot], this.slots[fromSlot]];
            }

            // Update UI for both slots
            this.setItem(fromSlot, this.slots[fromSlot].itemType, this.slots[fromSlot].count);
            this.setItem(toSlot, this.slots[toSlot].itemType, this.slots[toSlot].count);
            return true;
        }
        return false;
    }

    public getAllItems(): InventorySlot[] {
        return [...this.slots];
    }
} 