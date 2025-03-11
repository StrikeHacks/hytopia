import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';

export class PlayerInventory {
    private slots: (string | null)[] = Array(20).fill(null);
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;
    private isProcessingToggle: boolean = false;
    private isInventoryOpen: boolean = false;

    constructor(
        private playerEntity: PlayerEntity
    ) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        console.log('[PlayerInventory] Initialized with 20 slots (0-19)');
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }

    public selectSlot(slot: number): void {
        if (slot >= 0 && slot < 5) {
            // Unequip current item
            this.equipmentManager.unequipItem();
            
            // Update selected slot
            this.selectedSlot = slot;
            
            // Update UI about selection
            this.playerEntity.player.ui.sendData({
                hotbarSelect: {
                    selectedSlot: slot
                }
            });

            // Equip new item if there is one
            const item = this.getItem(slot);
            if (item) {
                this.equipmentManager.equipItem(item);
            }
        }
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => slot === null);
    }

    public getItem(slot: number): string | null {
        if (slot >= 0 && slot < this.slots.length) {
            return this.slots[slot];
        }
        return null;
    }

    public setItem(slot: number, item: string | null): void {
        if (slot >= 0 && slot < this.slots.length) {
            const oldItem = this.slots[slot];
            this.slots[slot] = item;

            // Update UI
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot,
                    item
                }
            });

            // If this is a hotbar slot, handle equipment
            if (slot < 5 && slot === this.selectedSlot) {
                if (item) {
                    this.equipmentManager.equipItem(item);
                } else {
                    this.equipmentManager.unequipItem();
                }
            }

            console.log(`[PlayerInventory] Set slot ${slot} to ${item}`);
        }
    }

    public addItem(item: string): boolean {
        const emptySlot = this.slots.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            this.setItem(emptySlot, item);
            return true;
        }
        return false;
    }

    public handleInventoryToggle(): void {
        if (this.isProcessingToggle) {
            console.log('[PlayerInventory] Already processing toggle, ignoring request');
            return;
        }
        
        this.isProcessingToggle = true;
        this.isInventoryOpen = !this.isInventoryOpen;
        console.log(`[PlayerInventory] ${this.isInventoryOpen ? 'Opening' : 'Closing'} inventory`);
        
        this.playerEntity.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });

        // If opening inventory, sync all slots
        if (this.isInventoryOpen) {
            console.log('[PlayerInventory] Syncing inventory state to UI');
            this.syncInventoryToUI();
        }
        
        setTimeout(() => {
            this.isProcessingToggle = false;
        }, 200);
    }

    private syncInventoryToUI(): void {
        // Sync all slots to UI
        this.slots.forEach((item, slot) => {
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot,
                    item
                }
            });
        });
    }
} 