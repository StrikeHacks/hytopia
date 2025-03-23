export class ItemPickupManager {
    private static instance: ItemPickupManager;
    private isProcessingPickup = false;
    private lastPickupTime = 0;
    private static readonly GLOBAL_COOLDOWN = 2000; // 2 seconds global cooldown

    private constructor() {}

    public static getInstance(): ItemPickupManager {
        if (!ItemPickupManager.instance) {
            ItemPickupManager.instance = new ItemPickupManager();
        }
        return ItemPickupManager.instance;
    }

    public async canProcessPickup(): Promise<boolean> {
        // If already processing a pickup, deny new pickups
        if (this.isProcessingPickup) {
            return false;
        }

        // Check global cooldown
        const now = Date.now();
        if (now - this.lastPickupTime < ItemPickupManager.GLOBAL_COOLDOWN) {
            return false;
        }

        // Lock pickup processing
        this.isProcessingPickup = true;
        this.lastPickupTime = now;
        
        return true;
    }

    public finishPickup() {
        this.isProcessingPickup = false;
    }
} 