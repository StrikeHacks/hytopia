import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';
import { NON_STACKABLE_TYPES, getItemConfig } from '../config/items';
import type { ItemSlot, ItemInstance } from '../types/items';
import { ItemInstanceManager } from '../items/ItemInstanceManager';

export class PlayerInventory {
    private slots: ItemSlot[] = Array(20).fill(null).map(() => ({ type: null, count: 0 }));
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;
    private isProcessingToggle: boolean = false;
    private isInventoryOpen: boolean = false;
    private batchUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastUpdateTime: number = 0;
    private readonly UPDATE_THROTTLE = 150; // Increased from 50ms to 150ms for better performance
    private pendingUpdates = new Map<number, { type: string | null; count: number; instanceId?: string }>();
    private nameRequestTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly DEFAULT_MAX_STACK_SIZE = 64; // Default max stack size
    private lastSentUIState: Record<number, { type: string | null, count: number, instanceId?: string }> = {};

    constructor(
        private playerEntity: PlayerEntity
    ) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        this.setupItemNameRequests();
    }

    private setupItemNameRequests(): void {
        this.playerEntity.player.ui.on('data', (data: any) => {
            if (!data.getItemName?.type) return;

            if (this.nameRequestTimeout) {
                clearTimeout(this.nameRequestTimeout);
            }

            this.nameRequestTimeout = setTimeout(() => {
                try {
                    const config = getItemConfig(data.getItemName.type);
                    this.playerEntity.player.ui.sendData({
                        showItemName: {
                            name: config.displayName || data.getItemName.type
                        }
                    });
                } catch (error) {}
                this.nameRequestTimeout = null;
            }, 50);
        });
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }

    public selectSlot(slot: number): void {
        if (slot < 0 || slot >= this.slots.length) return;
        if (this.selectedSlot === slot) return; // Added early return if already selected

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
            this.showItemName(newItem.type);
        }

        // Update UI - only send what changed
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: slot
            }
        });
    }

    private showItemName(itemType: string): void {
        try {
            const config = getItemConfig(itemType);
            this.playerEntity.player.ui.sendData({
                showItemName: {
                    name: config.displayName || itemType
                }
            });
        } catch (error) {}
    }

    public hasEmptySlot(): boolean {
        return this.slots.some(slot => {
            if (slot.type === null) return true;
            if (slot.type) {
                const isStackable = !NON_STACKABLE_TYPES.includes(slot.type as (typeof NON_STACKABLE_TYPES)[number]);
                if (isStackable) {
                    const config = getItemConfig(slot.type);
                    return slot.count < (config.maxStackSize || this.DEFAULT_MAX_STACK_SIZE);
                }
            }
            return false;
        });
    }

    public getItem(slot: number): string | null {
        if (slot < 0 || slot >= this.slots.length) return null;
        return this.slots[slot].type;
    }

    public getItemInstance(slot: number): ItemInstance | undefined {
        if (slot < 0 || slot >= this.slots.length) return undefined;
        return this.slots[slot].instance;
    }

    public getItemCount(slot: number): number {
        if (slot < 0 || slot >= this.slots.length) return 0;
        return this.slots[slot].count;
    }

    public setItem(slot: number, item: string | null, count: number = 1): void {
        if (slot < 0 || slot >= this.slots.length) return;
        
        const oldItem = this.slots[slot].type;
        
        // If setting a new item (not just updating count), create a new instance
        if (item !== null && (oldItem === null || oldItem !== item)) {
            const instance = ItemInstanceManager.getInstance().createItemInstance(item, count);
            this.slots[slot] = { type: item, count, instance };
        } else if (item !== null) {
            // Just update the count, keeping the instance
            this.slots[slot].count = count;
        } else {
            // Clearing the slot
            this.slots[slot] = { type: null, count: 0 };
        }

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

    public setItemWithInstance(slot: number, instance: ItemInstance | null): void {
        if (slot < 0 || slot >= this.slots.length) return;
        
        const oldItem = this.slots[slot].type;
        
        if (instance) {
            this.slots[slot] = { 
                type: instance.type, 
                count: instance.count, 
                instance 
            };
        } else {
            this.slots[slot] = { type: null, count: 0 };
        }

        // If this is the selected hotbar slot, handle equipment changes
        if (slot < 5 && slot === this.selectedSlot) {
            if (oldItem) {
                this.equipmentManager.unequipItem();
            }
            if (instance?.type) {
                this.equipmentManager.equipItem(instance.type);
            }
        }

        this.updateSlotUI(slot);
    }

    private updateSlotUI(slot: number): void {
        const item = this.slots[slot];
        const instanceId = item.instance?.instanceId;
        
        // Skip update if there's no meaningful change
        const lastState = this.lastSentUIState[slot];
        if (lastState && 
            lastState.type === item.type && 
            lastState.count === item.count && 
            lastState.instanceId === instanceId) {
            return;
        }
        
        this.pendingUpdates.set(slot, { 
            type: item.type, 
            count: item.count,
            instanceId
        });
        
        // Update last sent state
        this.lastSentUIState[slot] = {
            type: item.type,
            count: item.count,
            instanceId
        };
        
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

        const updates = Array.from(this.pendingUpdates.entries()).map(([slot, item]) => {
            // Get durability info if available
            let durabilityInfo = {};
            if (item.instanceId) {
                const instance = ItemInstanceManager.getInstance().getInstance(item.instanceId);
                if (instance && instance.durability !== undefined && instance.maxDurability !== undefined) {
                    durabilityInfo = {
                        durability: instance.durability,
                        maxDurability: instance.maxDurability,
                        durabilityPercentage: Math.floor((instance.durability / instance.maxDurability) * 100)
                    };
                }
            }
            
            return {
                slot,
                item: item.type,
                count: item.count,
                imageUrl: item.type ? getItemConfig(item.type).imageUrl : undefined,
                instanceId: item.instanceId,
                ...durabilityInfo
            };
        });

        const hotbarUpdates = updates.filter(update => update.slot < 5);

        // Only send updates if there are any
        if (updates.length > 0) {
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: updates,
                ...(hotbarUpdates.length > 0 && { hotbarUpdate: hotbarUpdates })
            });
        }

        this.pendingUpdates.clear();
        this.batchUpdateTimeout = null;
        this.lastUpdateTime = Date.now();
    }

    public handleInventoryToggle(): void {
        if (this.isProcessingToggle) return;
        
        this.isProcessingToggle = true;
        this.isInventoryOpen = !this.isInventoryOpen;
        
        // Send inventory state to UI
        this.playerEntity.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });

        // If opening, send current inventory state
        if (this.isInventoryOpen) {
            const updates = this.slots.map((slot, index) => {
                const item = {
                    slot: index,
                    item: slot.type,
                    count: slot.count,
                    imageUrl: slot.type ? getItemConfig(slot.type).imageUrl : undefined,
                    instanceId: slot.instance?.instanceId
                };
                
                // Update last sent state
                this.lastSentUIState[index] = {
                    type: slot.type,
                    count: slot.count,
                    instanceId: slot.instance?.instanceId
                };
                
                return item;
            });

            this.playerEntity.player.ui.sendData({
                inventoryUpdate: updates,
                hotbarUpdate: updates.filter(update => update.slot < 5)
            });
        }
        
        this.isProcessingToggle = false;
    }

    /**
     * Get the total count of a specific item type across all inventory slots
     */
    public getCountOfItem(itemType: string): number {
        let count = 0;
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === itemType) {
                count += this.slots[i].count;
            }
        }
        return count;
    }

    /**
     * Remove a specific amount of an item type from the inventory
     */
    public removeItem(itemType: string, amount: number): boolean {
        if (amount <= 0) return true;
        
        let remainingToRemove = amount;
        let needsUpdate = false;
        
        // First try to remove from non-hotbar slots
        for (let i = 5; i < this.slots.length && remainingToRemove > 0; i++) {
            if (this.slots[i].type === itemType) {
                const toRemove = Math.min(this.slots[i].count, remainingToRemove);
                this.slots[i].count -= toRemove;
                remainingToRemove -= toRemove;
                needsUpdate = true;
                
                if (this.slots[i].count <= 0) {
                    // Delete the item instance if it exists
                    const instance = this.slots[i].instance;
                    if (instance && instance.instanceId) {
                        ItemInstanceManager.getInstance().deleteInstance(instance.instanceId);
                    }
                    
                    this.slots[i] = { type: null, count: 0 };
                }
                
                this.updateSlotUI(i);
            }
        }
        
        // If we still need to remove more, check hotbar slots
        for (let i = 0; i < 5 && remainingToRemove > 0; i++) {
            if (this.slots[i].type === itemType) {
                const toRemove = Math.min(this.slots[i].count, remainingToRemove);
                this.slots[i].count -= toRemove;
                remainingToRemove -= toRemove;
                needsUpdate = true;
                
                if (this.slots[i].count <= 0) {
                    // Delete the item instance if it exists
                    const instance = this.slots[i].instance;
                    if (instance && instance.instanceId) {
                        ItemInstanceManager.getInstance().deleteInstance(instance.instanceId);
                    }
                    
                    this.slots[i] = { type: null, count: 0 };
                    
                    // If this was the selected slot, unequip the item
                    if (i === this.selectedSlot) {
                        this.equipmentManager.unequipItem();
                    }
                }
                
                this.updateSlotUI(i);
            }
        }
        
        // If we made changes and updates are pending, force a batch update
        if (needsUpdate && this.pendingUpdates.size > 0) {
            if (this.batchUpdateTimeout) {
                clearTimeout(this.batchUpdateTimeout);
                this.batchUpdateTimeout = null;
            }
            this.sendBatchUpdate();
        }
        
        return remainingToRemove === 0;
    }

    /**
     * Add an item to the inventory with a specific count
     */
    public addItem(itemType: string, count: number = 1): { success: boolean; addedToSlot?: number } {
        if (count <= 0) return { success: true };
        
        // Create an item instance
        const itemInstance = ItemInstanceManager.getInstance().createItemInstance(itemType, count);
        
        return this.addItemWithInstance(itemInstance);
    }

    /**
     * Add an item instance to the inventory
     */
    public addItemWithInstance(instance: ItemInstance): { success: boolean; addedToSlot?: number } {
        if (instance.count <= 0) return { success: true };
        
        const itemType = instance.type;
        let remaining = instance.count;
        let firstAddedSlot: number | undefined = undefined;
        const itemConfig = getItemConfig(itemType);
        const maxStackSize = itemConfig.maxStackSize || this.DEFAULT_MAX_STACK_SIZE;
        const isStackable = !NON_STACKABLE_TYPES.includes(itemType as (typeof NON_STACKABLE_TYPES)[number]);
        
        // For non-stackable items or items with durability, handle differently
        const hasDurability = instance.durability !== undefined;
        let needsUpdate = false;
        
        if (!isStackable || hasDurability) {
            // Find the first empty slot
            for (let i = 0; i < this.slots.length && remaining > 0; i++) {
                if (!this.slots[i].type) {
                    // Create a clone for each item in case there are multiple
                    if (remaining > 1) {
                        const singleInstance = {
                            ...instance,
                            count: 1
                        };
                        
                        this.slots[i] = { 
                            type: itemType, 
                            count: 1,
                            instance: singleInstance
                        };
                        
                        remaining--;
                    } else {
                        // Last or only item, use the original instance
                        this.slots[i] = { 
                            type: itemType, 
                            count: 1,
                            instance: { ...instance, count: 1 }
                        };
                        
                        remaining--;
                    }
                    
                    needsUpdate = true;
                    this.updateSlotUI(i);
                    
                    // If this is the currently selected slot in the hotbar, equip it immediately
                    if (i === this.selectedSlot && i < 5) {
                        this.equipmentManager.equipItem(itemType);
                        this.showItemName(itemType);
                    }
                    
                    if (firstAddedSlot === undefined) {
                        firstAddedSlot = i;
                    }
                }
            }
        } else {
            // For stackable items without durability, stack with existing items
            for (let i = 0; i < this.slots.length && remaining > 0; i++) {
                if (this.slots[i].type === itemType && this.slots[i].count < maxStackSize) {
                    const canAdd = Math.min(remaining, maxStackSize - this.slots[i].count);
                    const wasEmpty = this.slots[i].count === 0;
                    this.slots[i].count += canAdd;
                    
                    // Update the instance count or create if not exists
                    if (!this.slots[i].instance) {
                        this.slots[i].instance = { ...instance, count: this.slots[i].count };
                    } else if (this.slots[i].instance) {
                        const slotInstance = this.slots[i].instance;
                        if (slotInstance) {
                            slotInstance.count = this.slots[i].count;
                        }
                    }
                    
                    remaining -= canAdd;
                    needsUpdate = true;
                    this.updateSlotUI(i);
                    
                    // If this was an empty slot that is currently selected in the hotbar, equip it immediately
                    if (wasEmpty && i === this.selectedSlot && i < 5) {
                        this.equipmentManager.equipItem(itemType);
                        this.showItemName(itemType);
                    }
                    
                    if (firstAddedSlot === undefined) {
                        firstAddedSlot = i;
                    }
                }
            }
            
            // Then find empty slots for remaining items
            for (let i = 0; i < this.slots.length && remaining > 0; i++) {
                if (!this.slots[i].type) {
                    const canAdd = Math.min(remaining, maxStackSize);
                    this.slots[i] = { 
                        type: itemType, 
                        count: canAdd,
                        instance: { ...instance, count: canAdd }
                    };
                    
                    remaining -= canAdd;
                    needsUpdate = true;
                    this.updateSlotUI(i);
                    
                    // If this is the currently selected slot in the hotbar, equip it immediately
                    if (i === this.selectedSlot && i < 5) {
                        this.equipmentManager.equipItem(itemType);
                        this.showItemName(itemType);
                    }
                    
                    if (firstAddedSlot === undefined) {
                        firstAddedSlot = i;
                    }
                }
            }
        }
        
        // If we made changes and updates are pending, force a batch update
        if (needsUpdate && this.pendingUpdates.size > 0) {
            if (this.batchUpdateTimeout) {
                clearTimeout(this.batchUpdateTimeout);
                this.batchUpdateTimeout = null;
            }
            this.sendBatchUpdate();
        }
        
        return { 
            success: remaining < instance.count, 
            addedToSlot: firstAddedSlot 
        };
    }

    public updateMiningProgressUI(progress: number): void {
        // Only update if significant change
        if (progress === 0 || progress === 100 || progress % 5 === 0) {
            this.playerEntity.player.ui.sendData({
                miningProgress: {
                    progress: Math.min(100, Math.max(0, progress))
                }
            });
        }
    }
    
    /**
     * Decrease durability of an item in a specific slot
     */
    public decreaseItemDurability(slot: number, amount: number = 1): boolean {
        if (slot < 0 || slot >= this.slots.length) return false;
        
        const item = this.slots[slot];
        if (!item.type || !item.instance?.instanceId) return false;
        
        const instanceId = item.instance.instanceId;
        const success = ItemInstanceManager.getInstance().decreaseDurability(instanceId, amount);
        
        // Get the updated instance for current values
        const updatedInstance = ItemInstanceManager.getInstance().getInstance(instanceId);
        if (updatedInstance && updatedInstance.durability !== undefined) {
            // Only update UI if durability changes by more than 5% or critical levels
            const oldDurability = item.instance.durability || 0;
            const newDurability = updatedInstance.durability;
            const maxDurability = updatedInstance.maxDurability || 100;
            
            const oldPercent = Math.floor((oldDurability / maxDurability) * 100);
            const newPercent = Math.floor((newDurability / maxDurability) * 100);
            
            // Sync the values with our local instance
            item.instance.durability = updatedInstance.durability;
            
            // Only update UI for significant durability changes or low durability
            if (Math.abs(oldPercent - newPercent) >= 5 || newPercent <= 25 || newPercent === 0) {
                this.updateSlotUI(slot);
                
                // Force an immediate batch update for critical durability changes
                if (this.pendingUpdates.size > 0) {
                    if (this.batchUpdateTimeout) {
                        clearTimeout(this.batchUpdateTimeout);
                        this.batchUpdateTimeout = null;
                    }
                    this.sendBatchUpdate();
                }
            }
        }
        
        return success;
    }
    
    /**
     * Get tool durability for the item in the specified slot
     */
    public getItemDurability(slot: number): { current: number; max: number } | null {
        if (slot < 0 || slot >= this.slots.length) return null;
        
        const item = this.slots[slot];
        if (!item.type || !item.instance?.instanceId) return null;
        
        // Get the latest durability directly from the ItemInstanceManager
        const instance = ItemInstanceManager.getInstance().getInstance(item.instance.instanceId);
        if (!instance || instance.durability === undefined || instance.maxDurability === undefined) {
            return null;
        }
        
        // Update the local instance with the latest values to ensure consistency
        if (item.instance && (
            item.instance.durability !== instance.durability || 
            item.instance.maxDurability !== instance.maxDurability
        )) {
            item.instance.durability = instance.durability;
            item.instance.maxDurability = instance.maxDurability;
            
            // Only trigger UI update for significant changes
            const durabilityPercentage = Math.floor((instance.durability / instance.maxDurability) * 100);
            if (durabilityPercentage <= 25 || durabilityPercentage % 10 === 0) {
                this.updateSlotUI(slot);
            }
        }
        
        return {
            current: instance.durability,
            max: instance.maxDurability
        };
    }
    
    /**
     * Check if an item is broken (durability = 0)
     */
    public isItemBroken(slot: number): boolean {
        if (slot < 0 || slot >= this.slots.length) return false;
        
        const item = this.slots[slot];
        if (!item.type || !item.instance?.instanceId) return false;
        
        return ItemInstanceManager.getInstance().isItemBroken(item.instance.instanceId);
    }
    
    /**
     * Repair an item to its maximum durability
     */
    public repairItem(slot: number): boolean {
        if (slot < 0 || slot >= this.slots.length) return false;
        
        const item = this.slots[slot];
        if (!item.type || !item.instance?.instanceId) return false;
        
        const success = ItemInstanceManager.getInstance().repairItem(item.instance.instanceId);
        if (success) {
            this.updateSlotUI(slot);
        }
        
        return success;
    }

    // Add public getter
    public getIsInventoryOpen(): boolean {
        return this.isInventoryOpen;
    }
} 