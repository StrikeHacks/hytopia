import { PlayerEntity } from 'hytopia';

export class InventoryManager {
    private slots: (string | null)[] = Array(20).fill(null);

    constructor(private playerEntity: PlayerEntity) {
        console.log('[InventoryManager] Initialized with 20 slots');
    }

    public setItem(slot: number, itemType: string | null): void {
        if (slot >= 0 && slot < this.slots.length) {
            this.slots[slot] = itemType;
            console.log(`[InventoryManager] Set slot ${slot} to ${itemType}`);

            // Update UI for both inventory and hotbar
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot,
                    item: itemType
                }
            });

            // If it's a hotbar slot (0-4), also update the hotbar UI
            if (slot < 5) {
                this.playerEntity.player.ui.sendData({
                    hotbarUpdate: {
                        slot,
                        item: itemType
                    }
                });
            }
        }
    }

    public getItem(slot: number): string | null {
        if (slot >= 0 && slot < this.slots.length) {
            return this.slots[slot];
        }
        return null;
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => slot === null);
    }

    public findEmptySlot(): number | null {
        const emptyIndex = this.slots.findIndex(slot => slot === null);
        return emptyIndex >= 0 ? emptyIndex : null;
    }

    public moveItem(fromSlot: number, toSlot: number): boolean {
        if (fromSlot >= 0 && fromSlot < this.slots.length &&
            toSlot >= 0 && toSlot < this.slots.length) {
            const item = this.slots[fromSlot];
            this.slots[fromSlot] = this.slots[toSlot];
            this.slots[toSlot] = item;

            // Update UI for both slots
            this.setItem(fromSlot, this.slots[fromSlot]);
            this.setItem(toSlot, this.slots[toSlot]);
            return true;
        }
        return false;
    }

    public getAllItems(): (string | null)[] {
        return [...this.slots];
    }
} 