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
        // First try to add to hotbar (0-4)
        for (let i = 0; i < 5; i++) {
            if (this.inventoryManager.getItem(i) === null) {
                this.inventoryManager.setItem(i, itemType);
                return true;
            }
        }

        // Then try inventory slots (5-19)
        for (let i = 5; i < 20; i++) {
            if (this.inventoryManager.getItem(i) === null) {
                this.inventoryManager.setItem(i, itemType);
                return true;
            }
        }

        console.log('[Hotbar] No empty slots available in hotbar or inventory');
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
            const item = this.inventoryManager.getItem(slot);
            console.log(`[Hotbar] Selected slot ${slot} (Item: ${item || 'none'})`);
            
            // Equip new item if exists
            if (item) {
                console.log(`[Hotbar] Equipping ${item} from slot ${slot}`);
                this.equipmentManager.equipItem(item);
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
        return this.inventoryManager.getItem(slot);
    }

    public dropSelectedItem(): string | null {
        const itemType = this.inventoryManager.getItem(this.selectedSlot);
        if (!itemType) return null;

        this.inventoryManager.setItem(this.selectedSlot, null);
        this.equipmentManager.unequipItem();

        return itemType;
    }
} 