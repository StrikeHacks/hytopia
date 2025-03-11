import { PlayerEntity } from 'hytopia';
import { EquipmentManager } from './EquipmentManager';

export class HotbarManager {
    private selectedSlot: number = 0;
    private equipmentManager: EquipmentManager;

    constructor(private playerEntity: PlayerEntity) {
        this.equipmentManager = new EquipmentManager(playerEntity);
        console.log('[HotbarManager] Initialized');
        
        // Send initial slot selection to UI
        this.syncSlotState();
    }

    private syncSlotState() {
        console.log(`[HotbarManager] Syncing selected slot: ${this.selectedSlot}`);
        this.playerEntity.player.ui.sendData({
            hotbarSelect: {
                selectedSlot: this.selectedSlot
            }
        });
    }

    public onSlotChanged(slot: number, item: string | null): void {
        console.log(`[HotbarManager] Slot ${slot} changed to: ${item || 'empty'}`);
        // If this is the selected slot, update equipment
        if (slot === this.selectedSlot) {
            if (item) {
                console.log(`[HotbarManager] Equipping ${item} from slot ${slot}`);
                this.equipmentManager.equipItem(item);
            } else {
                console.log(`[HotbarManager] Unequipping item from slot ${slot}`);
                this.equipmentManager.unequipItem();
            }
        }
    }

    public selectSlot(slot: number) {
        if (slot >= 0 && slot < 5 && slot !== this.selectedSlot) {
            console.log(`[HotbarManager] Selecting slot ${slot}`);
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
        }
    }

    public getSelectedSlot(): number {
        return this.selectedSlot;
    }
} 