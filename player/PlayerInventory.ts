import { PlayerEntity } from 'hytopia';
import { HotbarManager } from './HotbarManager';

export class PlayerInventory {
    private isInventoryOpen: boolean = false;
    private isProcessingToggle: boolean = false;
    private slots: (string | null)[] = Array(20).fill(null); // Single array for all 20 slots (0-19)

    constructor(
        private playerEntity: PlayerEntity,
        private hotbarManager: HotbarManager
    ) {
        console.log('[PlayerInventory] Initialized with 20 slots (0-19)');
        this.logInventoryState();
        this.setupInventoryHandlers();
    }

    private logInventoryState(): void {
        console.log('\n=== FULL INVENTORY STATE ===');
        console.log('Hotbar Slots (0-4):');
        for (let i = 0; i < 5; i++) {
            console.log(`Slot ${i}: ${this.slots[i] || 'empty'}`);
        }
        console.log('\nInventory Slots (5-19):');
        for (let i = 5; i < 20; i++) {
            console.log(`Slot ${i}: ${this.slots[i] || 'empty'}`);
        }
        console.log('=========================\n');
    }

    private setupInventoryHandlers(): void {
        console.log('[PlayerInventory] Setting up UI event handlers');
        this.playerEntity.player.ui.on('data', (data: any) => {
            if (data.inventoryToggle?.action === 'toggle' && !this.isProcessingToggle) {
                this.handleInventoryToggle();
            }
            
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
        console.log(`[PlayerInventory] ${this.isInventoryOpen ? 'Opening' : 'Closing'} inventory`);

        if (this.isInventoryOpen) {
            console.log('[PlayerInventory] Syncing inventory state to UI');
            this.syncAllSlotsToUI();
        }

        this.playerEntity.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });

        setTimeout(() => {
            this.isProcessingToggle = false;
        }, 100);
    }

    private syncAllSlotsToUI(): void {
        console.log('[PlayerInventory] Syncing all slots to UI');
        for (let i = 0; i < 20; i++) {
            console.log(`[PlayerInventory] Syncing slot ${i}: ${this.slots[i] || 'empty'}`);
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot: i,
                    item: this.slots[i]
                }
            });
        }
    }

    public setItem(slot: number, item: string | null): void {
        if (slot >= 0 && slot < 20) {
            const previousItem = this.slots[slot];
            this.slots[slot] = item;
            console.log(`[PlayerInventory] Slot ${slot} changed: ${previousItem || 'empty'} -> ${item || 'empty'}`);
            
            // Update UI
            this.playerEntity.player.ui.sendData({
                inventoryUpdate: {
                    slot: slot,
                    item: item
                }
            });

            // If it's a hotbar slot (0-4), notify hotbar manager
            if (slot < 5) {
                this.hotbarManager.onSlotChanged(slot, item);
            }

            this.logInventoryState();
        }
    }

    public getItem(slot: number): string | null {
        if (slot >= 0 && slot < 20) {
            return this.slots[slot];
        }
        return null;
    }

    public hasEmptySlot(): boolean {
        const hasEmptySlot = this.slots.some(slot => slot === null);
        console.log(`[PlayerInventory] Checking for empty slots: ${hasEmptySlot}`);
        return hasEmptySlot;
    }

    public findEmptySlot(): number {
        console.log('[PlayerInventory] Looking for empty slot');
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] === null) {
                console.log(`[PlayerInventory] Found empty slot: ${i}`);
                return i;
            }
        }
        console.log('[PlayerInventory] No empty slots found');
        return -1;
    }

    public addItem(item: string): boolean {
        console.log(`[PlayerInventory] Attempting to add item: ${item}`);
        const emptySlot = this.findEmptySlot();
        if (emptySlot === -1) {
            console.log('[PlayerInventory] No empty slots available');
            return false;
        }

        console.log(`[PlayerInventory] Adding ${item} to slot ${emptySlot}`);
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