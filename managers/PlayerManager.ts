import {
	World,
	PlayerEntity,
	PlayerCameraMode,
	PlayerUIEvent,
	PlayerEntityController,
	PlayerEvent,
	EntityEvent,
	BaseEntityControllerEvent,
	RigidBodyType,
	Audio
} from "hytopia";
import type { Vector3Like } from "hytopia";
import { ItemSpawner } from "./ItemSpawner";
import { PlayerHealth } from "../player/PlayerHealth";
import { PlayerInventory } from "../player/PlayerInventory";
import { ToolManager } from "./ToolManager";
import { GameManager } from "./GameManager";
import { CraftingManager } from "./CraftingManager";
import type { HealthChangeEvent } from "../player/PlayerHealth";
import { getAvailableCategories } from '../config/recipes';
import { StalkerBoss } from '../bosses/StalkerBoss';
import { getTradesByCategory, formatTradeForUI } from '../config/travelerTrades';

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
	private readonly MINING_INTERVAL_MS = 600; // Increased mining interval for better performance (was 450)
	private readonly MINING_COOLDOWN_MS = 500; // Increased cooldown between mining attempts (was 350)
	private lastMiningTime: number = 0; // Track the last time mining was attempted
	private isCraftingOpen: boolean = false;
	private isQPressed: boolean = false;
	private isEPressed: boolean = false;
	private isFPressed: boolean = false;
	private isCPressed: boolean = false;
	private currentModelRotation: number = 0; // Current rotation angle for model placement
	private readonly ROTATION_INCREMENT = Math.PI / 4; // Rotate by 45 degrees (π/4 radians)

	// Boss combat related properties
	private _lastAttackTime: number = 0;
	private _lastDamageTime: number = 0;
	private _lastKnockbackTime: number = 0;
	private _damageCooldown: number = 500; // 500ms cooldown tussen damage events
	private _knockbackCooldown: number = 750; // 750ms cooldown tussen knockbacks
	private readonly BOSS_IMMUNITY_DURATION: number = 750; // 750ms immuniteit na damage/knockback van een boss
	private readonly ATTACK_RANGE: number = 4; // Attack range voor alle entities (was 3)
	private readonly KNOCKBACK_FORCE: number = 12;
	private readonly DAMAGE_ANIMATION_DURATION: number = 300;
	private _isImmuneFromBoss: boolean = false; // Bijhouden of speler immune is van boss aanvallen

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

		// Luister naar damage events op de player entity
		this.playerEntity.on('damage', (data: any) => {
			if (data && typeof data.amount === 'number') {
				this.tryApplyDamage(data.amount);
			}
		});
		
		// Register this PlayerManager with the GameManager for efficient lookups
		this.gameManager.registerPlayerManager(this.player.id, this);
	}

	public get playerController(): PlayerEntityController {
		return this.playerEntity.controller as PlayerEntityController;
	}

	// Expose the playerHealth property for cleanup when player leaves
	public getPlayerHealth(): PlayerHealth {
		return this.playerHealth;
	}

	// Expose the playerInventory property for the TravelerManager
	public getPlayerInventory(): PlayerInventory {
		return this.playerInventory;
	}

	/**
	 * Gets the player's current level
	 * Default implementation returns level 1
	 * Override this in game-specific implementations if level system is implemented
	 */
	public getPlayerLevel(): number {
		return 1; // Default implementation - level 1
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
			// Handle traveler UI close
			else if (data.travelerToggle?.action === 'close') {
				this.toggleTraveler();
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
			// Handle trade requests
			else if (data.requestTrades) {
				const category = data.requestTrades.category;
				const travelerManager = this.gameManager.getTravelerManager();
				if (travelerManager) {
					const trades = getTradesByCategory(category).map(formatTradeForUI);
					this.player.ui.sendData({
						trades: trades
					});
				}
			}
			// Handle trade action
			else if (data.trade) {
				const tradeId = data.trade.id;
				const travelerManager = this.gameManager.getTravelerManager();
				if (travelerManager) {
					travelerManager.handleTradeRequest(this.player.id, tradeId);
				}
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
		// Disable debug raycasting for better performance
		this.world.simulation.enableDebugRaycasting(false);

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
				
				// Handle C key for traveler UI
				if (input["c"] && !this.isCPressed) {
					this.isCPressed = true;
					console.log('[PlayerManager] C key pressed - toggling traveler UI');
					this.toggleTraveler();
				} else if (!input["c"]) {
					this.isCPressed = false;
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
		this.player.ui.lockPointer(false);
		this.playerInventory.handleInventoryToggle();
	}

	private closeInventory(): void {
		this.player.ui.lockPointer(true);
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
		
		// Set up an interval to send progress updates (every 200ms instead of 100ms for better performance)
		this.craftingProgressInterval = setInterval(() => {
			// Get current progress
			const progress = this.craftingManager.getPlayerCraftingProgress(playerId);
			
			// Only send updates at certain thresholds to reduce UI updates
			const shouldSendUpdate = 
				progress % 10 === 0 || // Every 10%
				progress === 100 ||    // At completion
				progress === 1;        // At start
			
			if (shouldSendUpdate) {
				// Send progress update to the client
				this.player.ui.sendData({
					craftingProgress: {
						recipeName,
						progress
					}
				});
			}
			
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
		}, 200); // Increased from 100ms to 200ms for better performance
	}

	/**
	 * Handle an item config request from the UI
	 */
	private handleItemConfigRequest(itemType: string): void {
		try {
			// Get the base item config
			const { getItemConfig } = require('../config/items');
			const itemConfig = getItemConfig(itemType);
			
			// Check if we need to add durability information
			let durabilityInfo = {};
			
			// If this item type can have durability (tools, weapons, armor)
			if (itemConfig.category === 'tools' || itemConfig.category === 'tool' || 
				itemConfig.category === 'weapons' || itemConfig.category === 'weapon' ||
				itemConfig.category === 'armor') {
				
				// Find the item instance in the player's inventory
				let itemInstance = null;
				
				// Search through all inventory slots to find this item type
				for (let slot = 0; slot < 20; slot++) {
					const slotItem = this.playerInventory.getItem(slot);
					if (slotItem === itemType) {
						// Found the item, get its instance with durability
						itemInstance = this.playerInventory.getItemInstance(slot);
						if (itemInstance?.durability !== undefined) {
							// Get the latest durability info
							const itemDurability = this.playerInventory.getItemDurability(slot);
							if (itemDurability) {
								durabilityInfo = {
									durability: itemDurability.current,
									maxDurability: itemDurability.max,
									durabilityPercentage: Math.floor((itemDurability.current / itemDurability.max) * 100)
								};
								console.log(`[PlayerManager] Including durability in tooltip for ${itemType}: ${itemDurability.current}/${itemDurability.max} (${Math.floor((itemDurability.current / itemDurability.max) * 100)}%)`);
							}
							break;
						}
					}
				}
			}
			
			// Send the config back to the UI with durability info if available
			this.player.ui.sendData({
				itemConfig: {
					...itemConfig,
					...durabilityInfo
				}
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
		// Raycast vanaf de spelerpositie in de kijkrichting
		const direction = playerEntity.player.camera.facingDirection;
		const origin = {
			x: playerEntity.position.x,
			y: playerEntity.position.y + 1,
			z: playerEntity.position.z,
		};

		// Vergroot de raycast range naar 4 blokken
		const raycastResult = this.world.simulation.raycast(origin, direction, this.ATTACK_RANGE, {
			filterExcludeRigidBody: playerEntity.rawRigidBody
		});

		// Check voor cooldown
		const now = Date.now();
		if (now - this._lastAttackTime < 500) return; // 500ms cooldown
		this._lastAttackTime = now;
		
		// Speel animatie af voor elke aanval
		playerEntity.startModelOneshotAnimations(['attack']);

		let entityHit = false;

		// Als we een entity hebben geraakt
		if (raycastResult?.hitEntity) {
			const hitEntity = raycastResult.hitEntity;
			
			// Bepaal de damage op basis van uitgerust item
				const selectedSlot = this.playerInventory.getSelectedSlot();
				const heldItem = this.playerInventory.getItem(selectedSlot);
				
			let damage = 0.5; // Default hand damage
			let bossDamage = 5; // Default boss damage met hand

				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Als het een wapen is, gebruik de schade van het wapen
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							damage = itemConfig.damage || damage;
						bossDamage = itemConfig.damage || 10; // Gebruik weapon damage voor boss
						} else if (itemConfig.category === 'tools') {
						// Tools doen standaard weinig schade
						damage = 1;
						bossDamage = 2; // Tools doen ook weinig schade aan bosses
						}
					} catch (error) {
						console.error('[Combat] Error getting item config:', error);
					}
				}

			// Check of het een dier is (zoals een koe)
			if (hitEntity.name.toLowerCase().includes('cow') || hitEntity.name.toLowerCase().includes('animal')) {
				

				// Dier aanvallen via AnimalManager
				const animalManager = this.gameManager.getAnimalManager();
				animalManager.handleAnimalHit(hitEntity, direction, damage);
				entityHit = true;
				
				// Als er een wapen is gebruikt, verlaag de durability
				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Alleen durability verlagen voor wapens
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							// Verlaag durability met 1
							console.log(`[Combat] Decreasing weapon durability for ${heldItem} after hitting animal`);
							this.playerInventory.decreaseItemDurability(selectedSlot, 1);
						}
					} catch (error) {
						console.error('[Combat] Error decreasing weapon durability:', error);
					}
				}
			}
			// Check of het een boss is
			else if (hitEntity instanceof StalkerBoss) {
				console.log(`[Combat] Hit a boss! ${hitEntity.name} op afstand ${this._getDistance(playerEntity.position, hitEntity.position)}`, {
					weapon: heldItem || 'hand',
					damage: bossDamage
				});
				
				// Boss aanvallen met speciale damage
				(hitEntity as StalkerBoss).takeDamage(bossDamage, true);
				
				// Knockback toepassen op de boss
				(hitEntity as StalkerBoss).receiveKnockback(playerEntity.position, this.KNOCKBACK_FORCE);
				entityHit = true;
				
				// Als er een wapen is gebruikt, verlaag de durability
				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Alleen durability verlagen voor wapens
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							// Verlaag durability met 1
							this.playerInventory.decreaseItemDurability(selectedSlot, 1);
						}
					} catch (error) {
						console.error('[Combat] Error decreasing weapon durability:', error);
					}
				}
			}
			
			// Speel hit sound als we een entity hebben geraakt
			if (entityHit) {
				this._playAttackHitSound(playerEntity.position);
			}
		}
		
		// Als geen entity direct geraakt is, zoek nog in een grotere radius (zoals voorheen voor bosses)
		if (!entityHit) {
			// Zoek naar alle bosses in de wereld
			const allEntities = this.world.entityManager.getAllEntities();
			const bosses = allEntities.filter(entity => entity instanceof StalkerBoss);
			
			// Vind de dichtstbijzijnde boss binnen attack range
			let closestBoss: StalkerBoss | null = null;
			let closestDistance = Infinity;
			
			for (const boss of bosses) {
				if (boss instanceof StalkerBoss) {
					const distance = this._getDistance(playerEntity.position, boss.position);
					
					// Alleen bosses binnen range overwegen
					if (distance <= this.ATTACK_RANGE && distance < closestDistance) {
						closestDistance = distance;
						closestBoss = boss;
					}
				}
			}
			
			// Als we een boss hebben gevonden binnen range, attack deze
			if (closestBoss) {
				
				// Bepaal damage op basis van uitgerust item
				const selectedSlot = this.playerInventory.getSelectedSlot();
				const heldItem = this.playerInventory.getItem(selectedSlot);
				
				// Default boss damage
				let bossDamage = 5;
				
				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Als het een wapen is, gebruik de schade van het wapen
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							bossDamage = itemConfig.damage || 10;
						} else if (itemConfig.category === 'tools') {
							// Tools doen weinig schade aan bosses
							bossDamage = 2;
						}
					} catch (error) {
						console.error('[Combat] Error getting item config for boss attack:', error);
					}
				}
				
				
				// Deal schade aan de boss
				closestBoss.takeDamage(bossDamage, true);
				
				// Gebruik de knockback functie
				closestBoss.receiveKnockback(this.playerEntity.position, this.KNOCKBACK_FORCE);
				
				// Als er een wapen is gebruikt, verlaag de durability
				if (heldItem) {
					try {
						const { getItemConfig } = require('../config/items');
						const itemConfig = getItemConfig(heldItem);
						
						// Alleen durability verlagen voor wapens
						if (itemConfig.category === 'weapons' || itemConfig.category === 'weapon') {
							// Verlaag durability met 1
							this.playerInventory.decreaseItemDurability(selectedSlot, 1);
						}
					} catch (error) {
						console.error('[Combat] Error decreasing weapon durability:', error);
					}
				}
				
				// Speel hit sound voor boss hit via proximity check
				this._playAttackHitSound(playerEntity.position);
			}
		}
	}

	private _getDistance(pos1: Vector3Like, pos2: Vector3Like): number {
		const dx = pos1.x - pos2.x;
		const dy = pos1.y - pos2.y;
		const dz = pos1.z - pos2.z;
		return Math.sqrt(dx*dx + dy*dy + dz*dz);
	}

	// Boss combat integrations

	// Public API voor bosses om te controleren of speler damage kan krijgen
	public canReceiveDamage(): boolean {
		const now = Date.now();
		// Check of speler immune is voor boss schade
		if (this._isImmuneFromBoss) {
			return false;
		}
		return now - this._lastDamageTime >= this._damageCooldown;
	}

	// Public API om te controleren of speler knockback kan krijgen
	public canReceiveKnockback(): boolean {
		const now = Date.now();
		// Check of speler immune is voor boss knockback
		if (this._isImmuneFromBoss) {
			return false;
		}
		return now - this._lastKnockbackTime >= this._knockbackCooldown;
	}

	// Public API om damage toe te passen met cooldown check
	public tryApplyDamage(amount: number, fromBoss: boolean = true): boolean {
		if (this.canReceiveDamage()) {
			// Use existing damage method
			this.damage(amount);
			this._lastDamageTime = Date.now();
			
			// Als de schade van een boss komt, activeer immuniteit
			if (fromBoss) {
				this._activateBossImmunity();
			}
			
			// Visuele feedback voor damage
			if (this.playerEntity.isSpawned) {
				this.playerEntity.setOpacity(0.7);
				
				// Reset opacity na korte tijd
				setTimeout(() => {
					if (this.playerEntity?.isSpawned) {
						this.playerEntity.setOpacity(1.0);
					}
				}, this.DAMAGE_ANIMATION_DURATION);
				
				// Speel hurt animatie af
				try {
					this.playerEntity.startModelOneshotAnimations(['hurt']);
				} catch (e) {
					console.warn("[PlayerManager] Kon hurt animatie niet afspelen:", e);
				}
				
				// Speel damage sound voor de speler
				try {
					if (this.world) {
						const damageSound = new Audio({
							uri: 'audio/sfx/player/getDamage.mp3',
							position: this.playerEntity.position,
							volume: 0.4,
							referenceDistance: 5,
							playbackRate: 1.0
						});
						
						damageSound.play(this.world);
					}
				} catch (error) {
					console.error("[PlayerManager] Kon damage sound niet afspelen:", error);
				}
			}
			
			return true;
		}
		return false;
	}
	
	// Public API om knockback toe te passen met cooldown check
	public tryApplyKnockback(direction: { x: number, y: number, z: number }, force: number, fromBoss: boolean = true): boolean {
		if (!this.playerEntity || !this.playerEntity.isSpawned) return false;
		
		if (!this.canReceiveKnockback()) {
			return false;
		}
		
		// Update laatste knockback tijd
		this._lastKnockbackTime = Date.now();
		
		// Als de knockback van een boss komt, activeer immuniteit
		if (fromBoss) {
			this._activateBossImmunity();
		}
		
		// Pas knockback toe
		this.playerEntity.applyImpulse({
			x: direction.x * force,
			y: direction.y * force,
			z: direction.z * force
		});
		
		return true;
	}
	
	// Activeer tijdelijke immuniteit voor boss aanvallen
	private _activateBossImmunity(): void {
		// Set de immune flag
		this._isImmuneFromBoss = true;
		
		// Visuele indicatie van immuniteit (lichter van kleur)
		if (this.playerEntity?.isSpawned) {
			this.playerEntity.setOpacity(0.6);
		}
		
		// Zet een timer om de immuniteit weer uit te schakelen na de gespecificeerde duur
		setTimeout(() => {
			this._isImmuneFromBoss = false;
			// Reset visuele indicatie
			if (this.playerEntity?.isSpawned) {
				this.playerEntity.setOpacity(1.0);
			}
		}, this.BOSS_IMMUNITY_DURATION);
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

	// Speel attack hit sound af
	private _playAttackHitSound(position: Vector3Like): void {
		try {
			if (this.world) {
				const hitSound = new Audio({
					uri: 'audio/sfx/player/attackDamage.mp3',
					position: position,
					volume: 0.4,
					referenceDistance: 5,
					playbackRate: 1.0
				});
				
				hitSound.play(this.world);
			}
		} catch (error) {
			console.error("[PlayerManager] Kon attack hit sound niet afspelen:", error);
		}
	}

	// Add as a new public method with other UI toggle methods
	public toggleTraveler(): void {
		console.log('[PlayerManager] Toggling traveler UI');
		
		// Get the traveler manager from game manager
		const travelerManager = this.gameManager.getTravelerManager();
		if (travelerManager) {
			// Call the toggle method on the traveler manager
			travelerManager.toggleTraveler(this);
		} else {
			console.error('[PlayerManager] Cannot toggle traveler UI: travelerManager not found');
		}
	}
}
