import { PlayerEntity } from 'hytopia';
import { HotbarManager } from './HotbarManager';

export class PlayerInventory {
    private isInventoryOpen: boolean = false;
    private isProcessingToggle: boolean = false;
    private slots: (string | null)[] = Array(15).fill(null); // 15 inventory slots (5 hotbar + 15 inventory = 20 total)

    constructor(
        private playerEntity: PlayerEntity,
        private hotbarManager: HotbarManager
    ) {
        console.log('[PlayerInventory] Initialized with 15 inventory slots');
        this.setupInventoryHandlers();
    }

    private setupInventoryHandlers(): void {
        console.log('[PlayerInventory] Setting up UI event handlers');
        this.playerEntity.player.ui.on('data', (data: any) => {
            if (data.inventoryToggle?.action === 'toggle' && !this.isProcessingToggle) {
                this.handleInventoryToggle();
            }
            
            // Handle inventory slot interactions
            if (data.inventoryAction) {
                const { action, slot, item } = data.inventoryAction;
                if (action === 'setItem') {
                    this.setItem(slot, item);
                }
            }
        });
    }

    public handleInventoryToggle(): void {
        if (this.isProcessingToggle) {
            console.log('[PlayerInventory] Already processing a toggle, ignoring request');
            return;
        }

        this.isProcessingToggle = true;
        this.isInventoryOpen = !this.isInventoryOpen;
        console.log('[PlayerInventory] Toggling inventory, new state:', this.isInventoryOpen);

        // When opening inventory, sync all slots to UI
        if (this.isInventoryOpen) {
            this.syncAllSlotsToUI();
        }

        this.playerEntity.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });

        // Reset the processing flag after a short delay to prevent spam
        setTimeout(() => {
            this.isProcessingToggle = false;
        }, 100);
    }

    private syncAllSlotsToUI(): void {
        // Send all slot states to UI
        for (let i = 0; i < 20; i++) { // Total of 20 slots (5 hotbar + 15 inventory)
            // For hotbar slots (0-4), use hotbar values
            const item = i < 5 ? this.hotbarManager.getItemInSlot(i) : this.slots[i - 5];
            
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot: i,
                    item: item
                }
            });
        }
    }

    public setItem(slot: number, item: string | null): void {
        if (slot >= 0 && slot < 20) { // Total of 20 slots (5 hotbar + 15 inventory)
            console.log(`[PlayerInventory] Setting slot ${slot} to item: ${item}`);
            
            // If it's a hotbar slot (0-4), update both hotbar and inventory
            if (slot < 5) {
                this.hotbarManager.setItem(slot, item);
            } else {
                this.slots[slot - 5] = item; // Adjust index for inventory slots
            }
            
            // Update UI
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot: slot,
                    item: item
                }
            });
        }
    }

    public getItem(slot: number): string | null {
        if (slot >= 0 && slot < 20) { // Total of 20 slots (5 hotbar + 15 inventory)
            // If it's a hotbar slot (0-4), get from hotbar
            if (slot < 5) {
                return this.hotbarManager.getItemInSlot(slot);
            }
            return this.slots[slot - 5]; // Adjust index for inventory slots
        }
        return null;
    }

    public hasEmptySlot(): boolean {
        // Check hotbar first (0-4)
        if (this.hotbarManager.hasEmptySlot()) return true;
        
        // Then check inventory slots (5-19)
        return this.slots.some(slot => slot === null);
    }

    public findEmptySlot(): number {
        // Check hotbar first (0-4)
        for (let i = 0; i < 5; i++) {
            if (this.hotbarManager.getItemInSlot(i) === null) return i;
        }
        
        // Then check inventory slots (5-19)
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] === null) return i + 5; // Add 5 to convert to actual slot number
        }
        
        return -1;
    }

    public addItem(item: string): boolean {
        const emptySlot = this.findEmptySlot();
        if (emptySlot === -1) return false;

        this.setItem(emptySlot, item);
        return true;
    }

    public getIsOpen(): boolean {
        return this.isInventoryOpen;
    }

    public close(): void {
        if (!this.isInventoryOpen) return;
        
        console.log('[PlayerInventory] Forcing inventory close');
        this.isInventoryOpen = false;
        
        this.playerEntity.player.ui.sendData({
            inventoryToggle: {
                isOpen: false
            }
        });
    }
} 