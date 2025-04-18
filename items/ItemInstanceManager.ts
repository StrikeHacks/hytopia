import { getItemConfig } from '../config/items';
import { getToolItem } from '../config/tools';
import { getWeaponItem } from '../config/weapons';
import { getArmorItem } from '../config/armor';
import type { ItemInstance } from '../types/items';

/**
 * Manages unique item instances with their own properties like durability
 */
export class ItemInstanceManager {
    private static instance: ItemInstanceManager;
    private items: Map<string, ItemInstance> = new Map();

    private constructor() {
    }

    /**
     * Get the singleton instance of ItemInstanceManager
     */
    public static getInstance(): ItemInstanceManager {
        if (!ItemInstanceManager.instance) {
            ItemInstanceManager.instance = new ItemInstanceManager();
        }
        return ItemInstanceManager.instance;
    }

    /**
     * Generate a unique ID for an item instance
     */
    private generateInstanceId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Create a new item instance with a unique ID and default properties
     */
    public createItemInstance(type: string, count: number = 1): ItemInstance {
        const instanceId = this.generateInstanceId();
        
        // Start with the base instance
        const instance: ItemInstance = {
            instanceId,
            type,
            count
        };
        
        // Get item config to check category and set durability if needed
        try {
            const itemConfig = getItemConfig(type);
            
            // Set durability for tools, weapons, and armor
            if (itemConfig.category === 'tool' || itemConfig.category === 'tools') {
                const toolItem = getToolItem(type);
                if (toolItem) {
                    instance.durability = toolItem.maxDurability;
                    instance.maxDurability = toolItem.maxDurability;
                }
            } else if (itemConfig.category === 'weapon' || itemConfig.category === 'weapons') {
                const weaponItem = getWeaponItem(type);
                if (weaponItem) {
                    instance.durability = weaponItem.maxDurability;
                    instance.maxDurability = weaponItem.maxDurability;
                }
            } else if (itemConfig.category === 'armor') {
                const armorItem = getArmorItem(type);
                if (armorItem) {
                    instance.durability = armorItem.maxDurability;
                    instance.maxDurability = armorItem.maxDurability;
                }
            }
            
        } catch (error) {
        }
        
        // Store the instance for later retrieval
        this.items.set(instanceId, instance);
        
        return instance;
    }

    /**
     * Get an item instance by its ID
     */
    public getInstance(instanceId: string): ItemInstance | undefined {
        return this.items.get(instanceId);
    }

    /**
     * Update the properties of an existing item instance
     */
    public updateInstance(instanceId: string, updates: Partial<ItemInstance>): boolean {
        const instance = this.items.get(instanceId);
        if (!instance) {
            console.error(`[ItemInstanceManager] Cannot update instance ${instanceId}: not found`);
            return false;
        }
        
        // Apply updates
        Object.assign(instance, updates);
        
        // If durability is set to 0 or below, log it
        if (updates.durability !== undefined && updates.durability <= 0) {
        }
        
        return true;
    }

    /**
     * Decrease durability of an item instance
     * Returns true if the item is still usable, false if it's broken
     */
    public decreaseDurability(instanceId: string, amount: number = 1): boolean {
        const instance = this.items.get(instanceId);
        if (!instance || instance.durability === undefined) {
            return false;
        }
        
        const currentDurability = instance.durability;
        const newDurability = Math.max(0, currentDurability - amount);
        
        // Direct update the instance in the map to avoid race conditions
        instance.durability = newDurability;
        
        // Get item config to check if soulbound
        try {
            const { getItemConfig } = require('../config/items');
            const itemConfig = getItemConfig(instance.type);
            
            // For soulbound items, they remain in inventory but can't be used
            if (itemConfig.soulbound) {
                return newDurability > 0;
            }
        } catch (error) {
            console.error('[ItemInstanceManager] Error checking soulbound status:', error);
        }
        
        return newDurability > 0;
    }

    /**
     * Check if an item is broken (durability = 0)
     */
    public isItemBroken(instanceId: string): boolean {
        const instance = this.items.get(instanceId);
        if (!instance || instance.durability === undefined) {
            return false;
        }
        return instance.durability <= 0;
    }

    /**
     * Repair an item to its maximum durability
     */
    public repairItem(instanceId: string): boolean {
        const instance = this.items.get(instanceId);
        if (!instance || instance.maxDurability === undefined) {
            return false;
        }
        
        instance.durability = instance.maxDurability;
        
        return true;
    }

    /**
     * Clone an existing item instance with new instanceId
     */
    public cloneInstance(instanceId: string): ItemInstance | undefined {
        const original = this.items.get(instanceId);
        if (!original) {
            return undefined;
        }
        
        const clone = this.createItemInstance(original.type, original.count);
        
        // Copy over relevant properties
        if (original.durability !== undefined) {
            clone.durability = original.durability;
        }
        
        if (original.properties) {
            clone.properties = { ...original.properties };
        }
        
        return clone;
    }

    /**
     * Delete an item instance
     */
    public deleteInstance(instanceId: string): boolean {
        return this.items.delete(instanceId);
    }

    /**
     * Synchronize an item instance with the latest stored durability values
     * This ensures that any copy of the instance has up-to-date values
     */
    public syncInstanceDurability(instance: ItemInstance): ItemInstance {
        if (!instance || !instance.instanceId) {
            return instance;
        }
        
        const storedInstance = this.items.get(instance.instanceId);
        if (!storedInstance || storedInstance.durability === undefined) {
            return instance;
        }
        
        // Update the instance with the latest durability values
        instance.durability = storedInstance.durability;
        instance.maxDurability = storedInstance.maxDurability;
        
        return instance;
    }
} 