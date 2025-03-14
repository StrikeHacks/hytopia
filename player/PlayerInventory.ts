import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';
import { NON_STACKABLE_TYPES, getItemConfig } from '../config/items';
import type { ItemSlot } from '../types/items';

export class PlayerInventory {
    private slots: ItemSlot[] = Array(20).fill(null).map(() => ({ type: null, count: 0 }));
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;
    private isProcessingToggle: boolean = false;
    private isInventoryOpen: boolean = false;
    private batchUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastUpdateTime: number = 0;
    private readonly UPDATE_THROTTLE = 50; // Minimum time between updates in ms
    private pendingUpdates = new Map<number, { type: string | null; count: number }>();

    constructor(
        private playerEntity: PlayerEntity
    ) {
        this.equipmentManager = new EquipmentManager(playerEntity);

        // Listen for getItemName requests with debounce
        let nameRequestTimeout: ReturnType<typeof setTimeout> | null = null;
        this.playerEntity.player.ui.on('data', (data: any) => {
            if (data.getItemName?.type) {
                if (nameRequestTimeout) {
                    clearTimeout(nameRequestTimeout);
                }
                nameRequestTimeout = setTimeout(() => {
                    try {
                        const config = getItemConfig(data.getItemName.type);
                        this.playerEntity.player.ui.sendData({
                            showItemName: {
                                name: config.displayName || data.getItemName.type
                            }
                        });
                    } catch (error) {
                        console.error('[PlayerInventory] Error getting item name:', error);
                    }
                    nameRequestTimeout = null;
                }, 50);
            }
        });
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }

    public selectSlot(slot: number): void {
        if (slot < 0 || slot >= this.slots.length) return;

        // Unequip current item if any
        const currentItem = this.slots[this.selectedSlot];
        if (currentItem.type) {
            this.equipmentManager.unequipItem();
        }

        this.selectedSlot = slot;

        // Equip new item if any
        const newItem = this.slots[slot];
        if (newItem.type) {
            this.equipmentManager.equipItem(newItem.type);
            
            // Send display name for the new item
            try {
                const config = getItemConfig(newItem.type);
                this.playerEntity.player.ui.sendData({
                    showItemName: {
                        name: config.displayName || newItem.type
                    }
                });
            } catch (error) {
                console.error('[PlayerInventory] Error getting item name:', error);
            }
        }

        // Update UI
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: slot
            }
        });
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => {
            if (slot.type === null) return true;
            if (slot.type) {
                const isStackable = !NON_STACKABLE_TYPES.includes(slot.type as (typeof NON_STACKABLE_TYPES)[number]);
                if (isStackable) {
                    const config = getItemConfig(slot.type);
                    return slot.count < config.maxStackSize;
                }
            }
            return false;
        });
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
        this.pendingUpdates.set(slot, { type: item.type, count: item.count });
        this.scheduleBatchUpdate();
    }

    private scheduleBatchUpdate(): void {
        if (this.batchUpdateTimeout) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        if (timeSinceLastUpdate < this.UPDATE_THROTTLE) {
            // Schedule update after throttle time
            this.batchUpdateTimeout = setTimeout(() => {
                this.sendBatchUpdate();
            }, this.UPDATE_THROTTLE - timeSinceLastUpdate);
        } else {
            // Update immediately
            this.sendBatchUpdate();
        }
    }

    private sendBatchUpdate(): void {
        if (this.pendingUpdates.size === 0) return;

        const inventoryUpdates: any[] = [];
        const hotbarUpdates: any[] = [];

        this.pendingUpdates.forEach((item, slot) => {
            const update = { slot, item: item.type, count: item.count };
            inventoryUpdates.push(update);
            if (slot < 5) {
                hotbarUpdates.push(update);
            }
        });

        this.playerEntity.player.ui.sendData({
            inventoryUpdate: inventoryUpdates,
            hotbarUpdate: hotbarUpdates
        });

        this.pendingUpdates.clear();
        this.batchUpdateTimeout = null;
        this.lastUpdateTime = Date.now();
    }

    public handleInventoryToggle(): void {
        if (this.isProcessingToggle) return;
        
        this.isProcessingToggle = true;
        this.isInventoryOpen = !this.isInventoryOpen;
        
        if (this.isInventoryOpen) {
            // Send all slot states at once
            const updates = {
                inventoryToggle: { isOpen: true },
                inventoryUpdate: this.slots.map((item, slot) => ({
                    slot,
                    item: item.type,
                    count: item.count
                })),
                hotbarUpdate: this.slots.slice(0, 5).map((item, slot) => ({
                    slot,
                    item: item.type,
                    count: item.count
                }))
            };
            this.playerEntity.player.ui.sendData(updates);
        } else {
            this.playerEntity.player.ui.sendData({
                inventoryToggle: { isOpen: false }
            });
        }
        
        setTimeout(() => {
            this.isProcessingToggle = false;
        }, 200);
    }

    public addItem(itemType: string): { success: boolean; addedToSlot?: number } {
        const itemConfig = getItemConfig(itemType);
        
        // First try to stack with existing items
        for (let i = 0; i < this.slots.length; i++) {
            const isStackable = !NON_STACKABLE_TYPES.includes(itemType as (typeof NON_STACKABLE_TYPES)[number]);
            if (this.slots[i].type === itemType && isStackable) {
                if (this.slots[i].count < itemConfig.maxStackSize) {
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