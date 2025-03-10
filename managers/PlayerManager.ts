import { World, PlayerEntity, PlayerCameraMode, PlayerUIEvent } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';

export class PlayerManager {
    private hotbarManager!: HotbarManager;
    private playerEntity!: PlayerEntity;
    private isInventoryOpen: boolean = false;
    private lastInventoryToggle: number = 0;
    private readonly TOGGLE_COOLDOWN: number = 200; // 200ms cooldown
    private inventory: (string | null)[] = new Array(20).fill(null); // 20 slots total (5 hotbar + 15 inventory)

    constructor(
        private world: World,
        private player: any,
        private playerHotbars: Map<string, HotbarManager>
    ) {
        this.playerEntity = this.createPlayerEntity();
        this.setupHotbar(this.playerEntity);
        this.setupUI();
        this.setupInputHandling(this.playerEntity);
        this.setupCamera();
        this.spawnPlayer();
        
        // Initialize with some test items
        this.inventory[0] = 'sword-diamond';
        this.inventory[1] = 'sword-stone';
        this.inventory[5] = 'book';
        this.inventory[10] = 'bread';
    }

    private createPlayerEntity(): PlayerEntity {
        return new PlayerEntity({
            player: this.player,
            modelUri: 'models/players/player.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
        });
    }

    private setupHotbar(playerEntity: PlayerEntity): void {
        this.hotbarManager = new HotbarManager(playerEntity);
        this.playerHotbars.set(this.player.id, this.hotbarManager);
        
        // Initialize hotbar items
        for (let i = 0; i < 5; i++) {
            const item = this.inventory[i];
            if (item) {
                this.hotbarManager.setItem(i, item);
            }
        }
    }

    private setupUI(): void {
        this.player.ui.load('ui/index.html');
        this.syncInventoryState();

        // Send initial inventory state
        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i];
            if (item) {
                this.player.ui.sendData({
                    inventoryUpdate: {
                        slot: i,
                        item: item
                    }
                });
            }
        }

        this.player.ui.on(PlayerUIEvent.DATA, (data: any) => {
            console.log('[PlayerManager Debug] Received UI data:', data);

            if (data.hotbarSelect) {
                const { slot } = data.hotbarSelect;
                this.hotbarManager.selectSlot(slot);
            }

            // Handle inventory move
            if (data.inventoryMove) {
                const { fromSlot, toSlot } = data.inventoryMove;
                this.handleInventoryMove(fromSlot, toSlot);
            }

            // Handle inventory toggle request from UI
            if (data.inventoryToggle !== undefined) {
                console.log('[PlayerManager Debug] Received inventory toggle request from UI');
                if (typeof data.inventoryToggle === 'boolean') {
                    this.isInventoryOpen = data.inventoryToggle;
                    this.syncInventoryState();
                } else {
                    this.handleInventoryToggle();
                }
            }
        });

        // Log initial setup completion
        console.log('[PlayerManager Debug] UI setup completed');
    }

    private handleInventoryToggle(): void {
        const now = Date.now();
        if (now - this.lastInventoryToggle < this.TOGGLE_COOLDOWN) {
            return;
        }
        this.lastInventoryToggle = now;

        try {
            this.isInventoryOpen = !this.isInventoryOpen;
            
            // First update UI visibility
            this.player.ui.sendData({
                inventoryToggle: {
                    isOpen: this.isInventoryOpen
                }
            });

            // Then update pointer lock
            this.player.ui.lockPointer(!this.isInventoryOpen);
        } catch (error) {
            console.error('[PlayerManager] Error in handleInventoryToggle:', error);
            // Reset state on error
            this.isInventoryOpen = false;
            this.player.ui.lockPointer(true);
        }
    }

    private syncInventoryState(): void {
        console.log(`[PlayerManager Debug] Syncing inventory state: ${this.isInventoryOpen}`);
        
        // First update pointer lock - lock when closed, unlock when open
        this.player.ui.lockPointer(!this.isInventoryOpen);
        
        // Then update UI visibility
        this.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });
    }

    private handleInventoryMove(fromSlot: number, toSlot: number): void {
        try {
            // Swap items in the inventory array
            const temp = this.inventory[fromSlot];
            this.inventory[fromSlot] = this.inventory[toSlot];
            this.inventory[toSlot] = temp;

            // Update UI for both slots
            this.player.ui.sendData({
                inventoryUpdate: {
                    slot: fromSlot,
                    item: this.inventory[fromSlot]
                }
            });
            
            this.player.ui.sendData({
                inventoryUpdate: {
                    slot: toSlot,
                    item: this.inventory[toSlot]
                }
            });

            // Update hotbar if needed
            if (fromSlot < 5) {
                this.hotbarManager.setItem(fromSlot, this.inventory[fromSlot]);
                this.player.ui.sendData({
                    hotbarUpdate: {
                        slot: fromSlot,
                        item: this.inventory[fromSlot]
                    }
                });
            }
            if (toSlot < 5) {
                this.hotbarManager.setItem(toSlot, this.inventory[toSlot]);
                this.player.ui.sendData({
                    hotbarUpdate: {
                        slot: toSlot,
                        item: this.inventory[toSlot]
                    }
                });
            }
        } catch (error) {
            console.log('[PlayerManager] Inventory move error:', { fromSlot, toSlot });
        }
    }

    private setupInputHandling(playerEntity: PlayerEntity): void {
        playerEntity.controller?.on('tickWithPlayerInput', ({ input }) => {
            // Handle E key for inventory toggle - check this first
            if (input['e']) {
                console.log('[PlayerManager Debug] E key detected in game input');
                this.handleInventoryToggle();
                return; // Return early to prevent other input processing
            }

            // Only handle hotbar if inventory is closed
            if (!this.isInventoryOpen) {
                // Handle hotbar selection (1-5)
                for (let i = 1; i <= 5; i++) {
                    if (input[i.toString()]) {
                        this.hotbarManager.selectSlot(i - 1);
                    }
                }
            }
        });
    }

    private setupCamera(): void {
        this.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        this.player.camera.setOffset({ x: 0, y: 0.8, z: 0 });
        this.player.camera.setModelHiddenNodes(['head', 'neck']);
        this.player.camera.setForwardOffset(0.3);
    }

    private spawnPlayer(): void {
        this.playerEntity.spawn(this.world, { x: 5, y: 10, z: 5 });
    }
} 