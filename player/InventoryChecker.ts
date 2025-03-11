import { PlayerInventory } from './PlayerInventory';

export class InventoryChecker {
    /**
     * Strictly checks if there is space available in the inventory
     * @returns true ONLY if there is 100% certainly a free slot
     */
    public static canPickupItem(inventory: PlayerInventory | undefined): boolean {
        // First verify we have a valid inventory
        if (!inventory) {
            console.log('[InventoryChecker] No inventory available');
            return false;
        }

        // Check if there is at least one empty slot
        const hasSpace = inventory.hasEmptySlot();
        
        if (!hasSpace) {
            console.log('[InventoryChecker] NO SPACE AVAILABLE IN INVENTORY - ALL SLOTS ARE FILLED');
            console.log('[InventoryChecker] Cannot pick up item - it will remain in the world');
        }

        return hasSpace;
    }
} 