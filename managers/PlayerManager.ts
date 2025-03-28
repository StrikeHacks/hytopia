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
import { CraftingManager } from "./CraftingManager";
import type { HealthChangeEvent } from "../player/PlayerHealth";
import { getAvailableCategories } from '../config/recipes';

export class PlayerManager {
	private playerEntity: PlayerEntity;
	private playerInventory!: PlayerInventory;
	private playerHealth!: PlayerHealth;
	private toolManager: ToolManager;
	private craftingManager: CraftingManager;
	private isMining: boolean = false;
	private isLeftMousePressed: boolean = false;
	private leftMouseHoldStartTime: number = 0;
	private miningInterval: NodeJS.Timer | null = null;
	private readonly MINING_INTERVAL_MS = 450; // Increased mining interval for better performance (was 300)
	private readonly MINING_COOLDOWN_MS = 350; // Increased cooldown between mining attempts (was 250)
	private lastMiningTime: number = 0; // Track the last time mining was attempted
	private isCraftingOpen: boolean = false;
	private isQPressed: boolean = false;
	private isEPressed: boolean = false;
	private isFPressed: boolean = false;
	private currentModelRotation: number = 0; // Current rotation angle for model placement
	private readonly ROTATION_INCREMENT = Math.PI / 4; // Rotate by 45 degrees (π/4 radians)

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
		this.craftingManager = gameManager.getCraftingManager();
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

		this.player.ui.on(PlayerUIEvent.DATA, ({ data }: { data: any }) => {
			// Handle crafting UI close
			if (data.craftingToggle?.action === 'close') {
				this.closeCrafting();
			} 
			// Handle inventory close
			else if (data.inventoryToggle?.action === 'close') {
				this.closeInventory();
			}
			// Handle hotbar selection
			else if (data.hotbarSelect) {
				const { slot } = data.hotbarSelect;
				this.playerInventory.selectSlot(slot);
			}
			// Handle recipe requirements check with crafting
			else if (data.checkRecipeRequirements) {
				this.handleCheckRecipeRequirements(this.player.id, data.checkRecipeRequirements.recipeName);
			}
			// Handle recipe requests
			else if (data.requestRecipes) {
				
				// Normalize the requested category for consistency
				const requestedCategory = this.normalizeCategory(data.requestRecipes.category);
				
				// Get recipes for the requested category
				const recipes = this.craftingManager.getRecipesByCategory(requestedCategory);
				
				// Is this a cache-only request?
				const forCache = data.requestRecipes.forCache === true;
				
				// Send the recipes back to the client with the category
				this.player.ui.sendData({
					recipes: recipes,
					requestedCategory: requestedCategory,
					forCache: forCache
				});
			} 
			// Handle item config requests for UI tooltips
			else if (data.getItemConfig) {
				this.handleItemConfigRequest(data.getItemConfig.type);
			}
			// Handle crafting requests directly (though we now use check first)
			else if (data.craftItem) {
				this.startCrafting(this.player.id, data.craftItem.recipeName);
			}
			// Note: Cancel crafting functionality removed since there's no cancel button in UI
		});
	}

	private setupInputHandling(playerEntity: PlayerEntity): void {
		// Enable debug raycasting for development visualization
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

				// Handle inventory toggle (E) - only trigger on key down to open
				if (input["e"] && !this.isEPressed) {
					this.isEPressed = true;
					if (!this.playerInventory.getIsInventoryOpen()) {
						this.openInventory();
					}
				} else if (!input["e"]) {
					this.isEPressed = false;
				}

				// Handle F key for crafting UI
				if (input["f"] && !this.isFPressed) {
					this.isFPressed = true;
					if (!this.isCraftingOpen) {
						this.openCrafting();
					}
				} else if (!input["f"]) {
					this.isFPressed = false;
				}

				// Handle right mouse button to interact with fixed models
				if (input["mr"]) {
					// Cancel the right click to prevent the default behavior
					input["mr"] = false;
					this.handleRightClick(playerEntity);
				}

				// Handle model rotation keys (R to rotate clockwise, T to rotate counter-clockwise)
				if (input["r"]) {
					this.currentModelRotation = (this.currentModelRotation + this.ROTATION_INCREMENT) % (Math.PI * 2);
					this.player.ui.sendData({
						showItemName: {
							name: `Rotation: ${Math.round((this.currentModelRotation * 180 / Math.PI) % 360)}°`
						}
					});
				}
				
				if (input["t"]) {
					this.currentModelRotation = (this.currentModelRotation - this.ROTATION_INCREMENT) % (Math.PI * 2);
					if (this.currentModelRotation < 0) this.currentModelRotation += Math.PI * 2;
					this.player.ui.sendData({
						showItemName: {
							name: `Rotation: ${Math.round((this.currentModelRotation * 180 / Math.PI) % 360)}°`
						}
					});
				}

				// Handle mouse input
				if (input["ml"] && !this.isLeftMousePressed) {
					// Mouse button was just pressed down
					this.isLeftMousePressed = true;
					this.leftMouseHoldStartTime = Date.now();

					// Check if holding a tool
					const selectedSlot = this.playerInventory.getSelectedSlot();
					const heldItem = this.playerInventory.getItem(selectedSlot);
					const isTool = heldItem && this.toolManager.isTool(heldItem);

					if (isTool) {
						// Start mining if holding a tool
						this.startMining(playerEntity);
					} else {
						// Do attack if not holding a tool
						this.playerEntity.startModelOneshotAnimations(["simple_interact"]);
						this.tryAttack(playerEntity);
					}
				} else if (input["ml"] && this.isLeftMousePressed) {
					// Mouse button is being held down
					if (!this.isMining) {
						// Check again if we should start mining
						const selectedSlot = this.playerInventory.getSelectedSlot();
						const heldItem = this.playerInventory.getItem(selectedSlot);
						const isTool = heldItem && this.toolManager.isTool(heldItem);

						if (isTool) {
							this.startMining(playerEntity);
						}
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
		const currentTime = Date.now();
		
		// Check if we're within the cooldown period
		if (currentTime - this.lastMiningTime < this.MINING_COOLDOWN_MS) {
			return; // Still on cooldown, skip this mining attempt
		}
		
		// Update last mining time
		this.lastMiningTime = currentTime;
		
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

	private openCrafting(): void {
		this.isCraftingOpen = true;
		this.toggleCraftingUI(this.player.id, true);
		this.player.ui.lockPointer(false);
	}

	private closeCrafting(): void {
		this.isCraftingOpen = false;
		this.toggleCraftingUI(this.player.id, false);
		this.player.ui.lockPointer(true);
	}

	private openInventory(): void {
		console.log('[PlayerManager] Opening inventory...');
		this.player.ui.lockPointer(false);
		console.log('[PlayerManager] POINTLOCK IS DISABLED');
		this.playerInventory.handleInventoryToggle();
	}

	private closeInventory(): void {
		console.log('[PlayerManager] Closing inventory...');
		this.player.ui.lockPointer(true);
		console.log('[PlayerManager] POINTLOCK IS ENABLED');
		this.playerInventory.handleInventoryToggle();
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

	/**
	 * Normalize category name to handle different plural/singular forms
	 */
	private normalizeCategory(category: string): string {
		if (!category) return '';
		
		// Handle weapon/weapons categories
		if (category.toLowerCase() === 'weapon') {
			return 'weapons';
		}
		
		return category;
	}

	/**
	 * Toggle the crafting UI for a player
	 */
	toggleCraftingUI(playerId: string, isOpen: boolean): void {
		
		if (isOpen) {
			// Get the available categories for the UI
			const categories = this.craftingManager.getAvailableCategories();
			
			// Normalize categories to ensure consistency
			const normalizedCategories = categories.map(cat => {
				// Make sure 'weapon' is normalized to 'weapons'
				if (cat.toLowerCase() === 'weapon') {
					return 'weapons';
				}
				return cat;
			});
			
			// Get initial recipes for the first category (typically 'tools')
			const initialCategory = normalizedCategories[0] || 'tools';
			
			try {
				// Get recipes with error handling
				const recipes = this.craftingManager.getRecipesByCategory(initialCategory);
				
				// Ensure we have valid recipes data
				const validRecipes = Array.isArray(recipes) ? recipes : [];
				
				// Open the crafting UI with categories and initial recipes
				this.player.ui.sendData({
					craftingToggle: {
						isOpen: true,
						categories: normalizedCategories,
						recipes: validRecipes,
						initialCategory: initialCategory,
						requestedCategory: initialCategory // Include the requested category
					}
				});
			} catch (error) {
				console.error(`[PlayerManager] Error getting recipes for category ${initialCategory}:`, error);
				
				// Even if there's an error, open the UI with categories but empty recipes
				this.player.ui.sendData({
					craftingToggle: {
						isOpen: true,
						categories: normalizedCategories,
						recipes: [],
						initialCategory: initialCategory
					}
				});
			}
		} else {
			// Close the crafting UI
			this.player.ui.sendData({
				craftingToggle: {
					isOpen: false
				}
			});
		}
	}

	/**
	 * Handle key press
	 */
	onKeyPress(key: string, isDown: boolean): void {
		// Handle crafting UI toggle
		if (key === 'KeyE' && isDown) {
			this.isCraftingOpen = !this.isCraftingOpen;
			this.toggleCraftingUI(this.player.id, this.isCraftingOpen);
			return;
		}

		// ... existing key handling code ...
	}

	/**
	 * Handle recipe requirement check with crafting
	 */
	handleCheckRecipeRequirements(playerId: string, recipeName: string): void {
		
		// Get the recipe
		const recipe = this.craftingManager.getRecipeById(recipeName);
		if (!recipe) {
			this.player.ui.sendData({
				recipeRequirements: {
					recipeName,
					exists: false,
					canCraft: false,
					missingItems: [],
					message: "Recipe not found"
				}
			});
			return;
		}
		
		// Check if player can craft
		const canCraft = this.craftingManager.canPlayerCraftRecipe(playerId, recipeName);
		
		// Get detailed requirement information
		const requirementDetails = this.craftingManager.getDetailedCraftingRequirements(playerId, recipeName);
		
		
		
		// Send detailed information back to the UI
		this.player.ui.sendData({
			recipeRequirements: {
				recipeName,
				exists: true,
				canCraft,
				requirements: requirementDetails.requirements,
				missingItems: requirementDetails.missingItems,
				craftingTime: this.craftingManager.getCraftingTime(recipeName),
				message: canCraft 
					? "You have all the required items!" 
					: "You're missing some required items."
			}
		});
		
		// If player can craft, automatically start the crafting process
		if (canCraft) {
			this.startCrafting(playerId, recipeName);
		}
	}

	/**
	 * Start the crafting process for a player
	 */
	startCrafting(playerId: string, recipeName: string): void {
		
		// Start the crafting process with a timer
		const success = this.craftingManager.startCrafting(playerId, recipeName);
		
		if (success) {
			// Notify the player that crafting has started with the crafting time
			const craftingTime = this.craftingManager.getCraftingTime(recipeName);
			this.player.ui.sendData({
				craftingStarted: {
					recipeName,
					craftingTime
				}
			});
			
			// Set up a timer to send progress updates to the client
			this.startCraftingProgressUpdates(playerId, recipeName);
		} else {
			// If crafting failed to start, notify the player
			this.player.ui.sendData({
				craftingFailed: {
					recipeName,
					message: "Could not start crafting process"
				}
			});
		}
	}

	/**
	 * Start sending progress updates for crafting
	 */
	private craftingProgressInterval: ReturnType<typeof setInterval> | null = null;

	private startCraftingProgressUpdates(playerId: string, recipeName: string): void {
		// Clear any existing interval
		if (this.craftingProgressInterval !== null) {
			clearInterval(this.craftingProgressInterval);
			this.craftingProgressInterval = null;
		}
		
		// Set up an interval to send progress updates (every 100ms)
		this.craftingProgressInterval = setInterval(() => {
			// Get current progress
			const progress = this.craftingManager.getPlayerCraftingProgress(playerId);
			
			// Send progress update to the client
			this.player.ui.sendData({
				craftingProgress: {
					recipeName,
					progress
				}
			});
			
			// If crafting is complete or not ongoing, stop sending updates
			if (progress === 100 || !this.craftingManager.isPlayerCrafting(playerId)) {
				if (this.craftingProgressInterval !== null) {
					clearInterval(this.craftingProgressInterval);
					this.craftingProgressInterval = null;
				}
				
				// At 100% progress, also send a crafting completion message after a short delay
				// This ensures UI can properly transition from progress bar to button
				if (progress === 100) {
					setTimeout(() => {
						this.player.ui.sendData({
							craftingComplete: {
								recipeName,
								success: true
							}
						});
					}, 500); // Short delay to ensure progress bar shows 100% first
				}
			}
		}, 100);
	}

	/**
	 * Handle an item config request from the UI
	 */
	private handleItemConfigRequest(itemType: string): void {
		try {
			const { getItemConfig } = require('../config/items');
			const itemConfig = getItemConfig(itemType);
			
			
			// Send the config back to the UI
			this.player.ui.sendData({
				itemConfig
			});
		} catch (error) {
			console.error(`[PlayerManager] Error fetching item config for ${itemType}:`, error);
			
			// Send a basic response to prevent UI from hanging
			this.player.ui.sendData({
				itemConfig: {
					type: itemType,
					displayName: itemType
						.split('-')
						.map(word => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' '),
					category: 'resource'
				}
			});
		}
	}

	private tryAttack(playerEntity: PlayerEntity): void {
		const direction = playerEntity.player.camera.facingDirection;
		const origin = {
			x: playerEntity.position.x,
			y: playerEntity.position.y + 1,
			z: playerEntity.position.z,
		};

		const raycastResult = this.world.simulation.raycast(origin, direction, 3, {
			filterExcludeRigidBody: playerEntity.rawRigidBody
		});

		if (raycastResult?.hitEntity) {
			const hitEntity = raycastResult.hitEntity;
			// Check if the hit entity is a cow by checking its name
			if (hitEntity.name.toLowerCase().includes('cow')) {
				// Get the selected item to determine damage
				const selectedSlot = this.playerInventory.getSelectedSlot();
				const heldItem = this.playerInventory.getItem(selectedSlot);
				
				let damage = 0.5; // Default hand damage verlaagd van 1.5 naar 0.5

				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Als het een wapen is, gebruik de schade van het wapen
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							damage = itemConfig.damage || damage;
						} else if (itemConfig.category === 'tools') {
							// Tools doen geen schade
							return;
						}
					} catch (error) {
						console.error('[Combat] Error getting item config:', error);
					}
				}

				console.log('[Combat] Hit a cow!', {
					cowName: hitEntity.name,
					position: hitEntity.position,
					damage: damage,
					weapon: heldItem || 'hand'
				});

				// Get the AnimalManager and handle the hit with damage
				const animalManager = this.gameManager.getAnimalManager();
				animalManager.handleAnimalHit(hitEntity, direction, damage);
			}
		}
	}

	// Add a method to place a fixed model where the player is looking
	public placeFixedModel(modelId: string): boolean {
		try {
			const direction = this.playerEntity.player.camera.facingDirection;
			const origin = {
				x: this.playerEntity.position.x,
				y: this.playerEntity.position.y + 1,
				z: this.playerEntity.position.z,
			};

			// Cast a ray to find where to place the model
			const raycastResult = this.world.simulation.raycast(origin, direction, 4, {
				filterExcludeRigidBody: this.playerEntity.rawRigidBody
			});

			if (raycastResult?.hitBlock || raycastResult?.hitPoint) {
				// Get the hit position
				const hitPosition = raycastResult.hitPoint;
				
				// Place the model slightly above the hit position
				const placePosition = {
					x: hitPosition.x,
					y: hitPosition.y + 0.5, // Place half a block above the hit point
					z: hitPosition.z
				};
				
				// Use the FixedModelManager to place the model with the current rotation
				const fixedModelManager = this.gameManager.getFixedModelManager();
				fixedModelManager.placeModel(modelId, placePosition, this.currentModelRotation);
				
				return true;
			}
			
			return false;
		} catch (error) {
			console.error('[PlayerManager] Error placing fixed model:', error);
			return false;
		}
	}

	private handleRightClick(playerEntity: PlayerEntity): void {
		try {
			const direction = playerEntity.player.camera.facingDirection;
			const origin = {
				x: playerEntity.position.x,
				y: playerEntity.position.y + playerEntity.player.camera.offset.y,
				z: playerEntity.position.z,
			};

			// Cast a ray to detect what's in front of the player
			const raycastResult = this.world.simulation.raycast(origin, direction, 5, {
				filterExcludeRigidBody: playerEntity.rawRigidBody
			});

			if (raycastResult?.hitEntity) {
				const hitEntity = raycastResult.hitEntity;
				
				// Check if the entity has a name that starts with our fixed model IDs
				// For now we only have workbench, but this will work for any fixed model
				if (hitEntity.name === 'workbench') {
					console.log('===========================================================');
					console.log(`[PlayerManager] Right-clicked on a workbench!`);
					console.log(`Position: x=${hitEntity.position.x.toFixed(2)}, y=${hitEntity.position.y.toFixed(2)}, z=${hitEntity.position.z.toFixed(2)}`);
					console.log(`Distance: ${this.calculateDistance(playerEntity.position, hitEntity.position).toFixed(2)} blocks`);
					console.log(`Entity ID: ${hitEntity.id}`);
					console.log('===========================================================');
					
					// Open the crafting UI when clicking on a workbench
					this.openCrafting();
					
					// Visual feedback that interaction happened
					playerEntity.startModelOneshotAnimations(["simple_interact"]);
				}
			}
		} catch (error) {
			console.error('[PlayerManager] Error in handleRightClick:', error);
		}
	}
	
	private calculateDistance(pos1: any, pos2: any): number {
		const dx = pos1.x - pos2.x;
		const dy = pos1.y - pos2.y;
		const dz = pos1.z - pos2.z;
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}
}
