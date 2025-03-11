import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';

export class HotbarManager {
    private slots: (string | null)[] = Array(20).fill(null);
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;

    constructor(private playerEntity: PlayerEntity) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        console.log('HotbarManager initialized with 20 empty slots');
        
        // Send initial slot selection to UI
        this.syncSlotState();
    }

    private syncSlotState() {
        // Send current state to UI
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: this.selectedSlot
            }
        });

        // Send all slot states
        for (let i = 0; i < this.slots.length; i++) {
            this.playerEntity.player.ui.sendData({
                hotbarUpdate: {
                    slot: i,
                    item: this.slots[i]
                }
            });
        }
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => slot === null);
    }

    public addItem(itemType: string): boolean {
        // Check if there's an empty slot
        if (!this.hasEmptySlot()) {
            console.log('[Hotbar] No empty slots available');
            return false;
        }

        // Find first empty slot
        const emptySlotIndex = this.slots.findIndex(slot => slot === null);
        
        // Add item to first empty slot
        this.setItem(emptySlotIndex, itemType);

        // If this is the selected slot, equip it
        if (emptySlotIndex === this.selectedSlot) {
            this.equipmentManager.equipItem(itemType);
        }

        return true;
    }

    public dropSelectedItem(): string | null {
        console.log('Attempting to drop item from slot:', this.selectedSlot);
        const itemType = this.slots[this.selectedSlot];
        
        if (!itemType) {
            console.log('No item to drop - slot is empty');
            return null;
        }

        // Remove item from slot
        this.slots[this.selectedSlot] = null;
        
        // Unequip if it was equipped
        this.equipmentManager.unequipItem();

        // Update UI
        this.playerEntity.player.ui.sendData({
            hotbarUpdate: {
                slot: this.selectedSlot,
                item: null
            }
        });

        return itemType;
    }

    public setItem(slot: number, itemType: string | null) {
        if (slot >= 0 && slot < this.slots.length) {
            this.slots[slot] = itemType;
            console.log(`[Hotbar] Slot ${slot} now contains: ${itemType || 'none'}`);

            // Update UI
            this.playerEntity.player.ui.sendData({
                hotbarUpdate: {
                    slot: slot,
                    item: itemType
                }
            });
        }
    }

    public selectSlot(slot: number) {
        if (slot >= 0 && slot < this.slots.length && slot !== this.selectedSlot) {
            // Unequip current item
            this.equipmentManager.unequipItem();
            
            // Update selected slot
            this.selectedSlot = slot;
            const item = this.slots[slot];
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
        return this.slots[slot];
    }
} 