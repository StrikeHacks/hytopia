import { World, PlayerEntity, PlayerCameraMode, PlayerUIEvent } from 'hytopia';
import { ItemSpawner } from './ItemSpawner';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerInventory } from '../player/PlayerInventory';
import { ToolManager } from './ToolManager';
import { GameManager } from './GameManager';
import type { HealthChangeEvent } from '../player/PlayerHealth';

export class PlayerManager {
    private playerHealth!: PlayerHealth;
    private playerEntity!: PlayerEntity;
    private playerInventory!: PlayerInventory;
    private toolManager!: ToolManager;
    private isEPressed: boolean = false;
    private isQPressed: boolean = false;
    private isMining: boolean = false;
    private isLeftMousePressed: boolean = false;
    private leftMouseHoldStartTime: number = 0;
    private leftMouseHoldDuration: number = 0;
    private readonly LEFT_MOUSE_LOG_INTERVAL: number = 500; // Log elke 500ms
    private lastLeftMouseLogTime: number = 0;

    constructor(
        private world: World,
        private player: any,
        private playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner,
        private gameManager: GameManager
    ) {
        this.playerEntity = this.createPlayerEntity();
        this.toolManager = gameManager.getToolManager();
        this.setupHealth();
        this.setupInventory();
        this.setupUI();
        this.setupInputHandling(this.playerEntity);
        this.setupCamera();
        this.spawnPlayer(this.playerEntity);
    }

    private createPlayerEntity(): PlayerEntity {
        const entity = new PlayerEntity({
            player: this.player,
            modelUri: 'models/players/player.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
        });
        
        // Voorkom automatische annulering van muisklikken
        if (entity.controller) {
            // Cast naar any omdat deze property niet in de type definities zit
            (entity.controller as any).autoCancelMouseLeftClick = false;
        }
        
        return entity;
    }

    private setupHealth(): void {
        this.playerHealth = new PlayerHealth(this.playerEntity, this.onHealthChange.bind(this));
        
        // Send initial health state to UI
        this.player.ui.sendData({
            health: {
                current: this.playerHealth.getCurrentHealth(),
                max: this.playerHealth.getMaxHealth(),
                percentage: this.playerHealth.getHealthPercentage()
            }
        });
    }

    private onHealthChange(event: HealthChangeEvent): void {
        // Handle health change events
        if (event.type === 'damage') {
            console.log(`Player took ${-event.change} damage`);
            if (this.playerHealth.getIsDead()) {
                this.handlePlayerDeath();
            }
        } else if (event.type === 'heal') {
            console.log(`Player healed for ${event.change}`);
        }
    }

    private handlePlayerDeath(): void {
        console.log('Player died!');
        // Add death handling logic here
        // For example: respawn timer, death animation, etc.
        
        // Auto-revive after 3 seconds for now
        setTimeout(() => {
            if (this.playerHealth.getIsDead()) {
                this.playerHealth.revive();
                this.respawnPlayer();
            }
        }, 3000);
    }

    private respawnPlayer(): void {
        // Respawn the player at the spawn point
        this.playerEntity.setPosition({ x: 5, y: 10, z: 5 });
    }

    private setupInventory(): void {
        this.playerInventory = new PlayerInventory(this.playerEntity);
        this.playerInventories.set(this.player.id, this.playerInventory);
        this.itemSpawner.registerPlayerInventory(this.player.id, this.playerInventory);
    }

    private setupUI(): void {
        this.player.ui.load('ui/index.html');

        this.player.ui.on(PlayerUIEvent.DATA, (data: any) => {
            if (data.hotbarSelect) {
                const { slot } = data.hotbarSelect;
                this.playerInventory.selectSlot(slot);
            }
        });
    }

    private setupInputHandling(playerEntity: PlayerEntity): void {
        // Enable debug raycasting for development
        this.world.simulation.enableDebugRaycasting(true);

        playerEntity.controller?.on('tickWithPlayerInput', ({ input }) => {
            // Handle hotbar selection (1-5)
            for (let i = 1; i <= 5; i++) {
                if (input[i.toString()]) {
                    const slotIndex = i - 1;
                    if (this.playerInventory.getSelectedSlot() !== slotIndex) {
                        console.log(`[PlayerManager] Number ${i} pressed - selecting hotbar slot ${slotIndex}`);
                        this.playerInventory.selectSlot(slotIndex);
                    }
                }
            }

            // Handle item dropping (Q) - only trigger on key down
            if (input['q'] && !this.isQPressed) {
                const isShiftHeld = input['sh'];
                console.log('[PlayerManager] Q key pressed - dropping item. Shift held:', isShiftHeld);
                this.isQPressed = true;
                this.itemSpawner.handleItemDrop(playerEntity, isShiftHeld);
            } else if (!input['q']) {
                this.isQPressed = false;
            }

            // Handle inventory toggle (E) - only trigger on key down
            if (input['e'] && !this.isEPressed) {
                console.log('[PlayerManager] E key pressed - toggling inventory');
                this.isEPressed = true;
                this.playerInventory.handleInventoryToggle();
            } else if (!input['e']) {
                this.isEPressed = false;
            }

            // Handle left mouse button (ml) press and hold
            const isLeftMousePressed = input['ml'];
            const now = Date.now();
            
            // Track mouse button state changes
            if (isLeftMousePressed && !this.isLeftMousePressed) {
                // Mouse button just pressed down
                this.isLeftMousePressed = true;
                this.leftMouseHoldStartTime = now;
                console.log('Ingedrukt');
            } else if (!isLeftMousePressed && this.isLeftMousePressed) {
                // Mouse button just released
                this.isLeftMousePressed = false;
                console.log('Losgelaten');
                
                // Stop mining when mouse is released
                this.stopMining(playerEntity);
            }
            
            // Update hold duration
            if (this.isLeftMousePressed) {
                this.leftMouseHoldDuration = now - this.leftMouseHoldStartTime;
                
                // Continuously check for blocks to mine while holding the button
                this.checkForBlockToMine(playerEntity);
            }
        });
    }
    
    private checkForBlockToMine(playerEntity: PlayerEntity): void {
        const selectedSlot = this.playerInventory.getSelectedSlot();
        const heldItem = this.playerInventory.getItem(selectedSlot);
        
        if (!heldItem) {
            if (this.isMining) {
                this.stopMining(playerEntity);
            }
            return;
        }
        
        const direction = playerEntity.player.camera.facingDirection;
        const origin = {
            x: playerEntity.position.x,
            y: playerEntity.position.y + playerEntity.player.camera.offset.y + 0.33,
            z: playerEntity.position.z
        };

        const raycastResult = this.world.simulation.raycast(origin, direction, 50, {
            filterExcludeRigidBody: playerEntity.rawRigidBody
        });

        if (raycastResult?.hitBlock) {
            // If we're looking at a block, try to mine it
            this.isMining = true; // Set mining state to true when we start mining
            this.toolManager.startMining(playerEntity, heldItem);
        } else if (this.isMining) {
            // If we're no longer looking at a block but were mining, stop mining
            this.stopMining(playerEntity);
        }
    }
    
    private startMining(playerEntity: PlayerEntity): void {
        // This method is no longer needed as mining is handled in checkForBlockToMine
        // Keeping it for backward compatibility
        this.checkForBlockToMine(playerEntity);
    }
    
    private stopMining(playerEntity: PlayerEntity): void {
        if (this.isMining) {
            this.isMining = false;
            this.toolManager.stopMining(String(playerEntity.player.id));
            
            // Clear mining progress in UI
            playerEntity.player.ui.sendData({
                miningProgress: {
                    progress: 0
                }
            });
        }
    }

    private setupCamera(): void {
        this.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        this.player.camera.setOffset({ x: 0, y: 0.5, z: 0 });
        this.player.camera.setModelHiddenNodes(['head', 'neck']);
        this.player.camera.setForwardOffset(0.3);
    }

    private spawnPlayer(playerEntity: PlayerEntity): void {
        playerEntity.spawn(this.world, { x: 5, y: 10, z: 5 });
    }

    // Public methods for health management
    public damage(amount: number): number {
        return this.playerHealth.damage(amount);
    }

    public heal(amount: number): number {
        return this.playerHealth.heal(amount);
    }

    public setHealth(amount: number): void {
        this.playerHealth.setHealth(amount);
    }

    public setMaxHealth(amount: number): void {
        this.playerHealth.setMaxHealth(amount);
    }

    public getCurrentHealth(): number {
        return this.playerHealth.getCurrentHealth();
    }

    public getMaxHealth(): number {
        return this.playerHealth.getMaxHealth();
    }

    public getHealthPercentage(): number {
        return this.playerHealth.getHealthPercentage();
    }

    public isDead(): boolean {
        return this.playerHealth.getIsDead();
    }
} 