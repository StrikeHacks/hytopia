import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';
import { MAX_STACK_SIZE, NON_STACKABLE_TYPES } from '../types/items';
import type { ItemSlot } from '../types/items';

export class PlayerInventory {
    private slots: ItemSlot[] = Array(20).fill(null).map(() => ({ type: null, count: 0 }));
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;
    private isProcessingToggle: boolean = false;
    private isInventoryOpen: boolean = false;
    private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastFullRefreshTime = 0;
    private pendingUpdates = new Set<number>();
    private batchUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    private pendingBatchUpdates: { [key: string]: any[] } = {
        inventoryUpdate: [],
        hotbarUpdate: []
    };

    constructor(
        private playerEntity: PlayerEntity
    ) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        console.log('[PlayerInventory] Initialized');
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }

    public selectSlot(slot: number): void {
        if (slot < 0 || slot >= this.slots.length) return;

        // Unequip current item if any
        const currentItem = this.slots[this.selectedSlot];
        if (currentItem.type) {
            console.log(`[PlayerInventory] Unequipping ${currentItem.type}`);
            this.equipmentManager.unequipItem();
        }

        this.selectedSlot = slot;
        console.log(`[PlayerInventory] Selected slot ${slot}`);

        // Equip new item if any
        const newItem = this.slots[slot];
        if (newItem.type) {
            console.log(`[PlayerInventory] Equipping ${newItem.type}`);
            this.equipmentManager.equipItem(newItem.type);
        }

        // Update UI
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: slot
            }
        });
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => slot.type === null || 
            (slot.type && !NON_STACKABLE_TYPES.includes(slot.type) && slot.count < MAX_STACK_SIZE));
    }

    public getItem(slot: number): string | null {
        if (slot < 0 || slot >= this.slots.length) return null;
        return this.slots[slot].type;
    }

    public getItemCount(slot: number): number {
        if (slot < 0 || slot >= this.slots.length) return 0;
        return this.slots[slot].count;
    }

    public setItem(slot: number, item: string | null, count: number = 1): void {
        if (slot < 0 || slot >= this.slots.length) return;

        console.log(`[PlayerInventory] Setting slot ${slot} to ${item} (count: ${count})`);
        
        const oldItem = this.slots[slot].type;
        this.slots[slot] = { type: item, count };

        // If this is the selected hotbar slot, handle equipment changes
        if (slot < 5 && slot === this.selectedSlot) {
            if (oldItem) {
                this.equipmentManager.unequipItem();
            }
            if (item) {
                this.equipmentManager.equipItem(item);
            }
        }

        this.updateSlotUI(slot);
    }

    private updateSlotUI(slot: number): void {
        const item = this.slots[slot];
        
        // Add to batch updates
        if (slot < 5) {
            this.pendingBatchUpdates.hotbarUpdate.push({
                slot,
                item: item.type,
                count: item.count
            });
        }
        this.pendingBatchUpdates.inventoryUpdate.push({
            slot,
            item: item.type,
            count: item.count
        });

        // Schedule batch update
        this.scheduleBatchUpdate();
    }

    private scheduleBatchUpdate(): void {
        if (this.batchUpdateTimeout) return;

        this.batchUpdateTimeout = setTimeout(() => {
            this.sendBatchUpdate();
        }, 16); // Roughly one frame at 60fps
    }

    private sendBatchUpdate(): void {
        if (this.pendingBatchUpdates.inventoryUpdate.length === 0) return;

        // Send all updates in one batch
        this.playerEntity.player.ui.sendData(this.pendingBatchUpdates);

        // Reset batch updates
        this.pendingBatchUpdates = {
            inventoryUpdate: [],
            hotbarUpdate: []
        };
        this.batchUpdateTimeout = null;

        // Check if we need a full refresh
        const now = Date.now();
        if (now - this.lastFullRefreshTime > 1000) {
            this.lastFullRefreshTime = now;
            this.forceRefreshAllSlots();
        }
    }

    private forceRefreshAllSlots(): void {
        type UpdateItem = { slot: number; item: string | null; count: number; };
        const inventoryUpdates: UpdateItem[] = [];
        const hotbarUpdates: UpdateItem[] = [];

        this.slots.forEach((item, slot) => {
            if (slot < 5) {
                hotbarUpdates.push({
                    slot,
                    item: item.type,
                    count: item.count
                });
            }
            inventoryUpdates.push({
                slot,
                item: item.type,
                count: item.count
            });
        });

        this.playerEntity.player.ui.sendData({
            inventoryUpdate: inventoryUpdates,
            hotbarUpdate: hotbarUpdates
        });
    }

    public handleInventoryToggle(): void {
        if (this.isProcessingToggle) return;
        
        this.isProcessingToggle = true;
        this.isInventoryOpen = !this.isInventoryOpen;
        
        const updates = {
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            },
            inventoryUpdate: [] as any[],
            hotbarUpdate: [] as any[]
        };

        // If opening inventory, include all slot states
        if (this.isInventoryOpen) {
            this.slots.forEach((item, slot) => {
                const update = {
                    slot,
                    item: item.type,
                    count: item.count
                };
                
                if (slot < 5) {
                    updates.hotbarUpdate.push(update);
                }
                updates.inventoryUpdate.push(update);
            });
        }

        // Send all updates in one batch
        this.playerEntity.player.ui.sendData(updates);
        
        setTimeout(() => {
            this.isProcessingToggle = false;
        }, 200);
    }

    public addItem(itemType: string): { success: boolean; addedToSlot?: number } {
        // First try to stack with existing items
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === itemType && !NON_STACKABLE_TYPES.includes(itemType)) {
                if (this.slots[i].count < MAX_STACK_SIZE) {
                    this.slots[i].count++;
                    this.updateSlotUI(i);
                    return { success: true, addedToSlot: i };
                }
            }
        }

        // Then try to find an empty slot
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i].type) {
                this.slots[i] = { type: itemType, count: 1 };
                this.updateSlotUI(i);
                return { success: true, addedToSlot: i };
            }
        }

        return { success: false };
    }
} 