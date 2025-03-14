import { World, PlayerEntity, PlayerCameraMode, PlayerUIEvent } from 'hytopia';
import { ItemSpawner } from './ItemSpawner';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerInventory } from '../player/PlayerInventory';
import type { HealthChangeEvent } from '../player/PlayerHealth';

export class PlayerManager {
    private playerHealth!: PlayerHealth;
    private playerEntity!: PlayerEntity;
    private playerInventory!: PlayerInventory;
    private isEPressed: boolean = false;
    private isQPressed: boolean = false;

    constructor(
        private world: World,
        private player: any,
        private playerInventories: Map<string, PlayerInventory>,
        private itemSpawner: ItemSpawner
    ) {
        this.playerEntity = this.createPlayerEntity();
        this.setupHealth();
        this.setupInventory();
        this.setupUI();
        this.setupInputHandling(this.playerEntity);
        this.setupCamera();
        this.spawnPlayer(this.playerEntity);
    }

    private createPlayerEntity(): PlayerEntity {
        return new PlayerEntity({
            player: this.player,
            modelUri: 'models/players/player.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
        });
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
        playerEntity.controller?.on('tickWithPlayerInput', ({ input }) => {
            // Handle hotbar selection (1-5)
            for (let i = 1; i <= 5; i++) {
                if (input[i.toString()]) {
                    const slotIndex = i - 1;
                    // Only select if it's not already the current slot
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
        });
    }

    private setupCamera(): void {
        this.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        this.player.camera.setOffset({ x: 0, y: 0.8, z: 0 });
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