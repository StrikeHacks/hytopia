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
	private readonly MINING_INTERVAL_MS = 300; // Time between mining attempts when holding the button
	private isCraftingOpen: boolean = false;
	private isQPressed: boolean = false;
	private isEPressed: boolean = false;
	private isFPressed: boolean = false;

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
			// Handle hotbar selection
			else if (data.hotbarSelect) {
				const { slot } = data.hotbarSelect;
				this.playerInventory.selectSlot(slot);
			}
			// Handle recipe requirements check with crafting
			else if (data.checkRecipeRequirements) {
				console.log(`[PlayerManager] Received request to check recipe requirements: ${data.checkRecipeRequirements.recipeName}`);
				this.handleCheckRecipeRequirements(this.player.id, data.checkRecipeRequirements.recipeName);
			}
			// Handle recipe requests
			else if (data.requestRecipes) {
				console.log(`[PlayerManager] Received request for recipes in category: ${data.requestRecipes.category}`);
				
				// Normalize the requested category for consistency
				const requestedCategory = this.normalizeCategory(data.requestRecipes.category);
				
				// Get recipes for the requested category
				const recipes = this.craftingManager.getRecipesByCategory(requestedCategory);
				
				// Is this a cache-only request?
				const forCache = data.requestRecipes.forCache === true;
				console.log(`[PlayerManager] Recipe request for ${requestedCategory} is for cache: ${forCache}`);
				
				// Send the recipes back to the client with the category
				this.player.ui.sendData({
					recipes: recipes,
					requestedCategory: requestedCategory,
					forCache: forCache
				});
			} 
			// Handle crafting requests directly (though we now use check first)
			else if (data.craftItem) {
				console.log(`[PlayerManager] Received request to craft: ${data.craftItem.recipeName}`);
				this.startCrafting(this.player.id, data.craftItem.recipeName);
			}
			// Note: Cancel crafting functionality removed since there's no cancel button in UI
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

				// Handle F key for crafting UI
				if (input["f"] && !this.isFPressed) {
					this.isFPressed = true;
					if (this.isCraftingOpen) {
						this.closeCrafting();
					} else {
						this.openCrafting();
					}
				} else if (!input["f"]) {
					this.isFPressed = false;
				}

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

		// Listen for UI data from client
		this.player.ui.on(PlayerUIEvent.DATA, ({ data }: { data: any }) => {
			if (data.craftingToggle?.action === 'close') {
				this.closeCrafting();
			}
		});
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
			console.log('[PlayerManager] Normalizing "weapon" to "weapons" for consistency');
			return 'weapons';
		}
		
		return category;
	}

	/**
	 * Toggle the crafting UI for a player
	 */
	toggleCraftingUI(playerId: string, isOpen: boolean): void {
		console.log(`[PlayerManager] Toggling crafting UI for player ${playerId}: ${isOpen ? 'open' : 'close'}`);
		
		if (isOpen) {
			// Get the available categories for the UI
			const categories = this.craftingManager.getAvailableCategories();
			console.log(`[PlayerManager] Available crafting categories: ${JSON.stringify(categories)}`);
			
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
			console.log(`[PlayerManager] Getting initial recipes for category: ${initialCategory}`);
			
			try {
				// Get recipes with error handling
				const recipes = this.craftingManager.getRecipesByCategory(initialCategory);
				console.log(`[PlayerManager] Got ${recipes.length} recipes for initial category ${initialCategory}`);
				
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
		console.log(`[PlayerManager] Checking requirements for recipe: ${recipeName}`);
		
		// Get the recipe
		const recipe = this.craftingManager.getRecipeById(recipeName);
		if (!recipe) {
			console.log(`[PlayerManager] Recipe not found: ${recipeName}`);
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
		console.log(`[PlayerManager] Can player craft ${recipeName}? ${canCraft}`);
		
		// Get detailed requirement information
		const requirementDetails = this.craftingManager.getDetailedCraftingRequirements(playerId, recipeName);
		
		// Log the requirement details for debugging
		console.log(`[PlayerManager] Requirements for ${recipeName}:`, requirementDetails.requirements);
		if (requirementDetails.missingItems.length > 0) {
			console.log(`[PlayerManager] Missing items:`, requirementDetails.missingItems);
		}
		
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
		console.log(`[PlayerManager] Starting crafting process for ${recipeName}`);
		
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
}
