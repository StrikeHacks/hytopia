import { World, PlayerEntity, PlayerCameraMode, PlayerUIEvent } from 'hytopia';
import { HotbarManager } from '../player/HotbarManager';

export class PlayerManager {
    private hotbarManager!: HotbarManager;
    private playerEntity!: PlayerEntity;
    private isInventoryOpen: boolean = false;
    private lastInventoryToggle: number = 0;
    private readonly TOGGLE_COOLDOWN: number = 200; // 200ms cooldown

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
    }

    private setupUI(): void {
        this.player.ui.load('ui/index.html');

        // Send initial state to UI
        this.syncInventoryState();

        this.player.ui.on(PlayerUIEvent.DATA, (data: any) => {
            if (data.hotbarSelect) {
                const { slot } = data.hotbarSelect;
                this.hotbarManager.selectSlot(slot);
            }

            // Handle inventory toggle request from UI
            if (data.inventoryToggle !== undefined) {
                console.log('[PlayerManager] Received inventory toggle request from UI');
                this.handleInventoryToggle();
            }
        });
    }

    private handleInventoryToggle(): void {
        const now = Date.now();
        if (now - this.lastInventoryToggle < this.TOGGLE_COOLDOWN) {
            console.log('[PlayerManager] Ignoring toggle request - cooldown active');
            return;
        }
        this.lastInventoryToggle = now;

        // Toggle inventory state
        this.isInventoryOpen = !this.isInventoryOpen;
        console.log(`[PlayerManager] Inventory ${this.isInventoryOpen ? 'OPENED' : 'CLOSED'}`);

        // First update pointer lock
        this.player.ui.lockPointer(!this.isInventoryOpen);
        
        // Then update UI visibility
        this.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen,
                timestamp: now // Add timestamp to ensure UI recognizes this as a new state
            }
        });
    }

    private syncInventoryState(): void {
        console.log(`[PlayerManager] Syncing inventory state: ${this.isInventoryOpen}`);
        
        // First update pointer lock
        this.player.ui.lockPointer(!this.isInventoryOpen);
        
        // Then update UI visibility
        this.player.ui.sendData({
            inventoryToggle: {
                isOpen: this.isInventoryOpen
            }
        });
    }

    private setupInputHandling(playerEntity: PlayerEntity): void {
        playerEntity.controller?.on('tickWithPlayerInput', ({ input }) => {
            // Handle hotbar selection (1-5)
            for (let i = 1; i <= 5; i++) {
                if (input[i.toString()]) {
                    this.hotbarManager.selectSlot(i - 1);
                }
            }

            // Handle E key for inventory toggle
            if (input['e']) {
                this.handleInventoryToggle();
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