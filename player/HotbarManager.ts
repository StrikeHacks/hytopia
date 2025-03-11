import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';
import { InventoryManager } from './InventoryManager';

export class HotbarManager {
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;
    private inventoryManager: InventoryManager;

    constructor(private playerEntity: PlayerEntity) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        this.inventoryManager = new InventoryManager(playerEntity);
        
        // Send initial slot selection to UI
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: this.selectedSlot
            }
        });
    }

    public hasEmptySlot(): boolean {
        return this.inventoryManager.hasEmptySlot();
    }

    public addItem(itemType: string): boolean {
        // Check if item is a sword (not stackable)
        const isSword = itemType.includes('sword');
        if (isSword) {
            // For non-stackable items, only try empty slots
            // Try hotbar slots first (0-4)
            for (let i = 0; i < 5; i++) {
                const slotContent = this.inventoryManager.getItem(i);
                if (slotContent.itemType === null) {
                    this.inventoryManager.setItem(i, itemType, 1);
                    return true;
                }
            }
            
            // Then try inventory slots (5-19)
            for (let i = 5; i < 20; i++) {
                const slotContent = this.inventoryManager.getItem(i);
                if (slotContent.itemType === null) {
                    this.inventoryManager.setItem(i, itemType, 1);
                    return true;
                }
            }
            
            return false;
        }

        // For stackable items, try to add to existing stacks first
        // Try to add to existing stack in hotbar first (0-4)
        for (let i = 0; i < 5; i++) {
            const slotContent = this.inventoryManager.getItem(i);
            if (slotContent.itemType === itemType) {
                // Add to existing stack if not full
                const maxStack = 64; // You might want to make this dynamic based on item type
                if (slotContent.count < maxStack) {
                    this.inventoryManager.setItem(i, itemType, slotContent.count + 1);
                    return true;
                }
            }
        }

        // Then try empty hotbar slots (0-4)
        for (let i = 0; i < 5; i++) {
            const slotContent = this.inventoryManager.getItem(i);
            if (slotContent.itemType === null) {
                this.inventoryManager.setItem(i, itemType, 1);
                return true;
            }
        }

        // Then try to add to existing stack in inventory (5-19)
        for (let i = 5; i < 20; i++) {
            const slotContent = this.inventoryManager.getItem(i);
            if (slotContent.itemType === itemType) {
                const maxStack = 64;
                if (slotContent.count < maxStack) {
                    this.inventoryManager.setItem(i, itemType, slotContent.count + 1);
                    return true;
                }
            }
        }

        // Finally try empty inventory slots (5-19)
        for (let i = 5; i < 20; i++) {
            const slotContent = this.inventoryManager.getItem(i);
            if (slotContent.itemType === null) {
                this.inventoryManager.setItem(i, itemType, 1);
                return true;
            }
        }

        console.log('[Hotbar] No empty slots or stackable space available');
        return false;
    }

    public setItem(slot: number, itemType: string | null) {
        this.inventoryManager.setItem(slot, itemType);
    }

    public selectSlot(slot: number) {
        if (slot >= 0 && slot < 5 && slot !== this.selectedSlot) { // Only allow selecting hotbar slots
            // Unequip current item
            this.equipmentManager.unequipItem();
            
            // Update selected slot
            this.selectedSlot = slot;
            const slotContent = this.inventoryManager.getItem(slot);
            console.log(`[Hotbar] Selected slot ${slot} (Item: ${slotContent.itemType || 'none'})`);
            
            // Equip new item if exists
            if (slotContent.itemType) {
                console.log(`[Hotbar] Equipping ${slotContent.itemType} from slot ${slot}`);
                this.equipmentManager.equipItem(slotContent.itemType);
            }

            // Update UI about selection
            this.playerEntity.player.ui.sendData({
                hotbarSelect: {
                    selectedSlot: slot
                }
            });
        }
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }

    public getItemInSlot(slot: number): string | null {
        const slotContent = this.inventoryManager.getItem(slot);
        return slotContent.itemType;
    }

    public dropSelectedItem(): string | null {
        const slotContent = this.inventoryManager.getItem(this.selectedSlot);
        const itemType = slotContent.itemType;
        if (!itemType) return null;

        // If stack has more than 1 item, decrease count
        if (slotContent.count > 1) {
            this.inventoryManager.setItem(this.selectedSlot, itemType, slotContent.count - 1);
        } else {
            // If last item in stack, clear slot
            this.inventoryManager.setItem(this.selectedSlot, null, 0);
            this.equipmentManager.unequipItem();
        }

        return itemType;
    }
} 