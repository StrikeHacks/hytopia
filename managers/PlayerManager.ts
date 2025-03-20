import {
	World,
	PlayerEntity,
	PlayerCameraMode,
	PlayerUIEvent,
	PlayerEntityController,
	PlayerEvent,
	EntityEvent,
	BaseEntityControllerEvent,
} from "hytopia";
import { ItemSpawner } from "./ItemSpawner";
import { PlayerHealth } from "../player/PlayerHealth";
import { PlayerInventory } from "../player/PlayerInventory";
import { ToolManager } from "./ToolManager";
import { GameManager } from "./GameManager";
import type { HealthChangeEvent } from "../player/PlayerHealth";

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
	private miningInterval: NodeJS.Timer | null = null;
	private readonly MINING_INTERVAL_MS = 300; // Time between mining attempts when holding the button

	constructor(
		private world: World,
		private player: any,
		private playerInventories: Map<string, PlayerInventory>,
		private itemSpawner: ItemSpawner,
		private gameManager: GameManager
	) {
		this.playerEntity = this.createPlayerEntity();
		this.playerController.autoCancelMouseLeftClick = false;
		this.playerController.interactOneshotAnimations = [];
		this.toolManager = gameManager.getToolManager();
		this.setupHealth();
		this.setupInventory();
		this.setupUI();
		this.setupInputHandling(this.playerEntity);
		this.setupCamera();
		this.spawnPlayer(this.playerEntity);
	}

	public get playerController(): PlayerEntityController {
		return this.playerEntity.controller as PlayerEntityController;
	}

	private createPlayerEntity(): PlayerEntity {
		// Create the player entity with only idle animation
		const entity = new PlayerEntity({
			player: this.player,
			modelUri: "models/players/player.gltf",
			modelLoopedAnimations: ["idle"],
			modelScale: 0.5,
		});

		return entity;
	}

	private setupHealth(): void {
		this.playerHealth = new PlayerHealth(
			this.playerEntity,
			this.onHealthChange.bind(this)
		);

		// Send initial health state to UI
		this.player.ui.sendData({
			health: {
				current: this.playerHealth.getCurrentHealth(),
				max: this.playerHealth.getMaxHealth(),
				percentage: this.playerHealth.getHealthPercentage(),
			},
		});
	}

	private onHealthChange(event: HealthChangeEvent): void {
		// Handle health change events
		if (event.type === "damage" && this.playerHealth.getIsDead()) {
			this.handlePlayerDeath();
		}
	}

	private handlePlayerDeath(): void {
		// Auto-revive after 3 seconds
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
		this.itemSpawner.registerPlayerInventory(
			this.player.id,
			this.playerInventory
		);
	}

	private setupUI(): void {
		this.player.ui.load("ui/index.html");

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

		this.playerController.on(
			BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT,
			({ input }) => {
				// Handle hotbar selection (1-5)
				for (let i = 1; i <= 5; i++) {
					if (input[i.toString()]) {
						const slotIndex = i - 1;
						if (
							this.playerInventory.getSelectedSlot() !== slotIndex
						) {
							this.playerInventory.selectSlot(slotIndex);
						}
					}
				}

				// Handle item dropping (Q) - only trigger on key down
				if (input["q"] && !this.isQPressed) {
					const isShiftHeld = input.sh || false;
					this.isQPressed = true;
					this.itemSpawner.handleItemDrop(playerEntity, isShiftHeld);
				} else if (!input["q"]) {
					this.isQPressed = false;
				}

				// Handle inventory toggle (E) - only trigger on key down
				if (input["e"] && !this.isEPressed) {
					this.isEPressed = true;
					this.playerInventory.handleInventoryToggle();
				} else if (!input["e"]) {
					this.isEPressed = false;
				}

				// Handle left mouse button (ml) for continuous mining
				if (input["ml"] && !this.isLeftMousePressed) {
					// Mouse button was just pressed down
					this.isLeftMousePressed = true;
					this.leftMouseHoldStartTime = Date.now();

					// Start mining immediately
					this.startMining(playerEntity);
				} else if (input["ml"] && this.isLeftMousePressed) {
					// Mouse button is being held down, continue mining
					if (!this.isMining) {
						this.startMining(playerEntity);
					}
				} else if (!input["ml"] && this.isLeftMousePressed) {
					// Mouse button was released
					this.isLeftMousePressed = false;
					this.stopMining();
				}
			}
		);
	}

	private startMining(playerEntity: PlayerEntity): void {
		if (this.isMining) return;

		this.isMining = true;

		// Do initial mining
		this.tryMineBlock(playerEntity);

		// Set up interval for continuous mining while button is held
		this.miningInterval = setInterval(() => {
			if (this.isLeftMousePressed) {
				this.tryMineBlock(playerEntity);
			} else {
				this.stopMining();
			}
		}, this.MINING_INTERVAL_MS);
	}

	private stopMining(): void {
		this.isMining = false;
		if (this.miningInterval) {
			clearInterval(this.miningInterval);
			this.miningInterval = null;
		}
	}

	private tryMineBlock(playerEntity: PlayerEntity): void {
		this.playerEntity.startModelOneshotAnimations(["simple_interact"]);
		const selectedSlot = this.playerInventory.getSelectedSlot();
		const heldItem = this.playerInventory.getItem(selectedSlot);

		if (!heldItem) return;

		const direction = playerEntity.player.camera.facingDirection;
		const origin = {
			x: playerEntity.position.x,
			y:
				playerEntity.position.y +
				playerEntity.player.camera.offset.y +
				0.33,
			z: playerEntity.position.z,
		};

		const raycastResult = this.world.simulation.raycast(
			origin,
			direction,
			4,
			{
				filterExcludeRigidBody: playerEntity.rawRigidBody,
			}
		);

		if (raycastResult?.hitBlock) {
			const hitPos = raycastResult.hitBlock.globalCoordinate;
			this.toolManager.tryMineBlock(playerEntity);
		}
	}

	private setupCamera(): void {
		this.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		this.player.camera.setOffset({ x: 0, y: 0.7, z: 0 });
		this.player.camera.setModelHiddenNodes(["head", "neck"]);
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
