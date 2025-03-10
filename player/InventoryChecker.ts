import { HotbarManager } from './HotbarManager';

export class InventoryChecker {
    /**
     * Strictly checks if there is space available in the hotbar
     * @returns true ONLY if there is 100% certainly a free slot
     */
    public static canPickupItem(hotbarManager: HotbarManager | undefined): boolean {
        // First verify we have a valid hotbar manager
        if (!hotbarManager) {
            console.log('[InventoryChecker] No hotbar manager available');
            return false;
        }

        // Check if there is at least one empty slot
        const hasSpace = hotbarManager.hasEmptySlot();
        
        if (!hasSpace) {
            console.log('[InventoryChecker] NO SPACE AVAILABLE IN HOTBAR - ALL 5 SLOTS ARE FILLED');
            console.log('[InventoryChecker] Cannot pick up item - it will remain in the world');
        }

        return hasSpace;
    }
} 