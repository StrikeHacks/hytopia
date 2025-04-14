import {
	World,
	Player,
	PlayerEntity,
	PlayerCameraMode,
	PlayerUIEvent,
	PlayerEntityController,
	PlayerEvent,
	Entity,
	EntityEvent,
	BaseEntityControllerEvent,
	RigidBodyType,
	Audio,
	ColliderShape,
	CollisionGroup,
	BlockType,
	SceneUI
} from "hytopia";
import { ItemSpawner } from "./ItemSpawner";
import { PlayerHealth } from "../player/PlayerHealth";
import { PlayerInventory } from "../player/PlayerInventory";
import { ToolManager } from "./ToolManager";
import { GameManager } from "./GameManager";
import { CraftingManager } from "./CraftingManager";
import { getRecipeById, formatRecipeForUI } from "../config/recipes";
import { DEFAULT_CRAFTING_TIME } from "../config/recipes";
import { BaseItem } from '../items/BaseItem';
import { AttackerTracker } from '../utils/AttackerTracker';
import type { EventPayloads } from "hytopia";
import { FixedModelManager } from "./FixedModelManager";
import { CrateManager } from "./CrateManager";
import { getTradesByCategory, formatTradeForUI } from '../config/travelerTrades';
import { StalkerBoss } from '../bosses/StalkerBoss';
import type { Vector3Like, Quaternion } from "hytopia";
import type { HealthChangeEvent } from "../player/PlayerHealth";
import CustomPlayerController from "../player/CustomPlayerController";

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
	private isTravelerOpen: boolean = false;
	private isInventoryOpen: boolean = false;
	private isDungeonOpen: boolean = false;
	private isQPressed: boolean = false;
	private isEPressed: boolean = false;
	private isFPressed: boolean = false;
	private isCPressed: boolean = false;
	private isVPressed: boolean = false;
	private currentModelRotation: number = 0; // Current rotation angle for model placement
	private readonly ROTATION_INCREMENT = Math.PI / 4; // Rotate by 45 degrees (π/4 radians)
	private healingInterval: NodeJS.Timer | null = null;
	private readonly HEAL_AMOUNT = 5;
	private readonly HEAL_INTERVAL_MS = 3000; // 3 seconds

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

	// Ground contact state (managed within PlayerManager)
	private _groundContactCount: number = 0;
	private _platform: Entity | undefined = undefined; // For platform sticking
	private jumpOneshotAnimations: string[] = ['jump']; // Define jump animation name(s)
	private sticksToPlatforms: boolean = true; // Assuming platform sticking is desired

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
		this.setupPlayerCamera();
		this.setupInventory();
		this.setupUI();
		this.setupInputHandling(this.playerEntity);
		this.spawnPlayer(this.playerEntity);
		this.startHealing(); // Start the healing system

		// Luister naar damage events op de player entity
		this.playerEntity.on('damage', (data: EventPayloads['damage']) => {
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
		// Use the LevelManager to get the player's level
		const levelManager = this.gameManager.getLevelManager();
		if (levelManager) {
			return levelManager.getPlayerLevel(this.player.id);
		}
		
		// Fallback to default value if LevelManager is not available
		return 1;
	}

	// Add method to send player stats to the UI
	public sendPlayerStatsToUI(): void {
		try {
			if (!this.player || !this.player.ui) return;

			const level = this.getPlayerLevel();
			const health = this.playerHealth ? this.playerHealth.getCurrentHealth() : 100;
			const maxHealth = this.playerHealth ? this.playerHealth.getMaxHealth() : 100;
			
			// Get XP data if available
			const levelManager = this.gameManager.getLevelManager();
			let xp = 0;
			let nextLevelXp = 100;
			
			if (levelManager) {
				const levelData = levelManager.getPlayerLevelData(this.player.id);
				xp = levelData.xp;
				nextLevelXp = levelData.nextLevelXp;
			}
			
			// Send player stats to UI
			this.player.ui.sendData({
				playerStats: {
					level: level,
					health: health,
					maxHealth: maxHealth,
					xp: xp,
					nextLevelXp: nextLevelXp
				}
			});

			// Also send inventory data for key checks
			this.sendInventoryDataToUI();

			console.log(`[PlayerManager] Sent player stats to UI - Level: ${level}, XP: ${xp}/${nextLevelXp}`);
		} catch (error) {
			console.error('[PlayerManager] Error sending player stats to UI:', error);
		}
	}

	// Add a new method to send inventory data to UI
	private sendInventoryDataToUI(): void {
		try {
			if (!this.player || !this.player.ui || !this.playerInventory) return;
			
			// Create inventory items array to send to UI
			const inventoryItems = [];
			
			// Loop through all inventory slots
			for (let slot = 0; slot < 20; slot++) {
				const itemType = this.playerInventory.getItem(slot);
				if (itemType) {
					const count = this.playerInventory.getItemCount(slot);
					inventoryItems.push({
						slot,
						type: itemType,
						count: count
					});
				}
			}
			
			// Create a map of item types for easier key checking in the UI
			const inventoryMap = new Map();
			for (const item of inventoryItems) {
				// Store items by type to make checking for specific types easier
				inventoryMap.set(item.type, {
					count: item.count,
					slots: [...(inventoryMap.get(item.type)?.slots || []), item.slot]
				});
			}
			
			// Convert the Map to an array of entries for JSON serialization
			const inventoryMapArray = Array.from(inventoryMap.entries()).map(([type, data]) => {
				return { type, count: data.count, slots: data.slots };
			});
			
			// Send inventory data to UI
			this.player.ui.sendData({
				inventory: {
					items: inventoryItems,
					itemsByType: inventoryMapArray
				}
			});
			
			console.log(`[PlayerManager] Sent inventory data to UI: ${inventoryItems.length} items`);
			console.log(`[PlayerManager] Unique item types: ${inventoryMapArray.length}`);
			
			// Debug log for keys specifically
			const keyItems = inventoryMapArray.filter(item => item.type.includes('key'));
			if (keyItems.length > 0) {
				console.log(`[PlayerManager] Key items in inventory:`, keyItems);
			}
		} catch (error) {
			console.error('[PlayerManager] Error sending inventory data to UI:', error);
		}
	}

	private createPlayerEntity(): PlayerEntity {
		// Define standard player dimensions for scale 1
		const playerHeight = 1.8; // Approx height in blocks
		const playerRadius = 0.3; // Approx radius in blocks

		// Create the player entity with scale 1 and explicit collider
		const entity = new PlayerEntity({
			player: this.player,
			controller: new CustomPlayerController(),
			modelUri: "models/players/player.gltf",
			modelLoopedAnimations: ["idle"],
			modelScale: 0.65, // Set scale to 1
			
		});

		return entity;
	}

	private setupPlayerCamera(): void {
		this.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
		this.player.camera.setModelHiddenNodes([ 'head', 'neck' ]);
		this.player.camera.setOffset({ x: 0, y: 0.5, z: 0 });
		this.player.camera.setForwardOffset(0.3); 
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
		if (event.type === "damage" && event.currentHealth <= 0) {
			// Double check if player is actually dead
			if (this.playerHealth.getIsDead()) {
				console.log("[PlayerManager] Player died, handling death...");
				this.handlePlayerDeath();
			}
		}
	}

	private handlePlayerDeath(): void {
		const { getItemConfig } = require('../config/items');
		
		// Calculate base drop position where the player died
		const dropPosition = {
			x: this.playerEntity.position.x,
			y: this.playerEntity.position.y + 0.1, // Tiny offset to prevent ground clipping
			z: this.playerEntity.position.z
		};
		
		// Drop all non-soulbound items from entire inventory
		for (let slot = 0; slot < 20; slot++) {
			const itemType = this.playerInventory.getItem(slot);
			if (itemType) {
				try {
					const itemConfig = getItemConfig(itemType);
					
					// Only drop items that are not soulbound
					if (!itemConfig.soulbound) {
						// Get the item count and instance before removing
						const count = this.playerInventory.getItemCount(slot);
						const itemInstance = this.playerInventory.getItemInstance(slot);
						
						// Remove items from inventory first
						this.playerInventory.removeItem(itemType, count);
						
						// Drop all items with a small spread
						for (let i = 0; i < count; i++) {
							// Add small random spread (max 0.5 blocks)
							const spreadPosition = {
								x: dropPosition.x + (Math.random() * 1.0 - 0.5), // -0.5 to 0.5
								y: dropPosition.y,
								z: dropPosition.z + (Math.random() * 1.0 - 0.5)  // -0.5 to 0.5
							};
							
							// Create the item with small spread, passing this.itemSpawner as 5th arg
							const droppedItem = new BaseItem(this.world, spreadPosition, this.itemSpawner.getPlayerInventories(), itemType, this.itemSpawner, i === 0 ? itemInstance : undefined, 1);
							droppedItem.spawn();
							
							// Drop with only vertical force for gravity
							const direction = { x: 0, y: 0.1, z: 0 };
							droppedItem.drop(spreadPosition, direction);
							
							// Add to active items
							const items = this.itemSpawner.getActiveItems().get(itemType) || [];
							items.push(droppedItem);
							this.itemSpawner.getActiveItems().set(itemType, items);
						}
					}
				} catch (error) {
					console.error('[PlayerManager] Error checking item soulbound status during death:', error);
				}
			}
		}

		// Instant respawn at spawn point
		this.respawnPlayer();
	}

	private respawnPlayer(): void {
		// Respawn the player at the spawn point with a slight height offset to prevent falling through ground
		this.playerEntity.setPosition({ x: 5, y: 10, z: 5 });
		
		// Reset any movement/velocity
		this.playerEntity.setLinearVelocity({ x: 0, y: 0, z: 0 });
		this.playerEntity.setAngularVelocity({ x: 0, y: 0, z: 0 });

		// Revive player with full health
		this.playerHealth.revive();
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
		// Load the UI file that contains our templates
		this.player.ui.load('ui/index.html');

		// Send initial player stats to UI
		setTimeout(() => {
			this.sendPlayerStatsToUI();
		}, 1000);

		// Setup UI event handlers
		this.player.ui.on(PlayerUIEvent.DATA, ({ data }: { data: any }) => {
			// Handle requestPlayerStats
			if (data.requestPlayerStats) {
				console.log('[PlayerManager] Received request for player stats, sending updated data to UI');
				this.sendPlayerStatsToUI();
			}
			// Handle inventory actions (like dropping items)
			else if (data.inventoryAction) {
				const { action, slot, isShiftHeld, sourceSlot, targetSlot } = data.inventoryAction;
				
				if (action === 'dropItem' && typeof slot === 'number') {
					this.handleInventoryItemDrop(slot, isShiftHeld || false);
				}
				else if (action === 'swapItems' && typeof sourceSlot === 'number' && typeof targetSlot === 'number') {
					this.handleInventoryItemSwap(sourceSlot, targetSlot);
				}
				// Handle other inventory actions like 'setItem' if needed
			}
			// Handle crafting UI close
			else if (data.craftingToggle?.action === 'close') {
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
			// Handle dungeon UI close
			else if (data.dungeonToggle?.action === 'close') {
				console.log('[PlayerManager] Closing dungeon UI via UI action');
				this.gameManager.getDungeonManager().toggleDungeon(this.player, false);
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
		});
	}

	/**
	 * Handle dropping an item from a specific inventory slot
	 */
	private handleInventoryItemDrop(slot: number, isShiftHeld: boolean): void {
		try {
			// Get the item from the slot
			const itemType = this.playerInventory.getItem(slot);
			
			if (!itemType) {
				console.log(`[PlayerManager] No item in slot ${slot} to drop`);
				return;
			}
			
			// Check if item is soulbound
			try {
				const { getItemConfig } = require('../config/items');
				const itemConfig = getItemConfig(itemType);
				
				// Check if item is soulbound
				if (itemConfig.soulbound) {
					// Notify player that item cannot be dropped
					this.player.ui.sendData({
						showItemName: {
							name: "This item is soulbound"
						}
					});
					return;
				}
			} catch (error) {
				console.error('[PlayerManager] Error checking item soulbound status:', error);
			}
			
			console.log(`[PlayerManager] Dropping item from slot ${slot}, shift held: ${isShiftHeld}`);
			
			// Save the current selected slot
			const currentSelectedSlot = this.playerInventory.getSelectedSlot();
			
			// Temporarily set the selected slot to the slot we want to drop from
			this.playerInventory.selectSlot(slot);
			
			// Use the ItemSpawner's handleItemDrop method which already has all the logic we need
			this.itemSpawner.handleItemDrop(this.playerEntity, isShiftHeld);
			
			// Restore the original selected slot
			this.playerInventory.selectSlot(currentSelectedSlot);
			
		} catch (error) {
			console.error('[PlayerManager] Error handling inventory item drop:', error);
		}
	}

	/**
	 * Handle swapping items between inventory slots
	 * @param sourceSlot The source slot number (where the item is currently)
	 * @param targetSlot The target slot number (where to move the item to)
	 */
	private handleInventoryItemSwap(sourceSlot: number, targetSlot: number): void {
		try {
			console.log(`[PlayerManager] Swapping items between slots ${sourceSlot} and ${targetSlot}`);
			
			// Get items from both slots
			const sourceItem = this.playerInventory.getItem(sourceSlot);
			const sourceCount = this.playerInventory.getItemCount(sourceSlot);
			const sourceInstance = this.playerInventory.getItemInstance(sourceSlot);
			
			const targetItem = this.playerInventory.getItem(targetSlot);
			const targetCount = this.playerInventory.getItemCount(targetSlot);
			const targetInstance = this.playerInventory.getItemInstance(targetSlot);
			
			// Use direct item instance swapping for better performance
			if (sourceInstance && targetInstance) {
				// Both slots have item instances - direct swap
				this.playerInventory.setItemWithInstance(targetSlot, sourceInstance);
				this.playerInventory.setItemWithInstance(sourceSlot, targetInstance);
			} else if (sourceInstance) {
				// Only source has an item instance
				this.playerInventory.setItemWithInstance(targetSlot, sourceInstance);
				if (targetItem) {
					this.playerInventory.setItem(sourceSlot, targetItem, targetCount);
				} else {
					this.playerInventory.setItem(sourceSlot, null, 0);
				}
			} else if (targetInstance) {
				// Only target has an item instance
				this.playerInventory.setItemWithInstance(sourceSlot, targetInstance);
				if (sourceItem) {
					this.playerInventory.setItem(targetSlot, sourceItem, sourceCount);
				} else {
					this.playerInventory.setItem(targetSlot, null, 0);
				}
			} else {
				// Neither slot has item instances - simple swap
				this.playerInventory.setItem(targetSlot, sourceItem, sourceCount);
				this.playerInventory.setItem(sourceSlot, targetItem, targetCount);
			}
			
			// Play a swap sound effect for better user feedback
			try {
				const swapSound = new Audio({
					uri: 'audio/sfx/items/swap.mp3',
					position: this.playerEntity.position,
					volume: 0.3,
					referenceDistance: 2
				});
				swapSound.play(this.world);
			} catch (error) {
				console.error('[PlayerManager] Error playing swap sound:', error);
			}
			
			console.log(`[PlayerManager] Successfully swapped items between slots ${sourceSlot} and ${targetSlot}`);
		} catch (error) {
			console.error('[PlayerManager] Error handling inventory item swap:', error);
		}
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
					
					// Get the selected item
					const selectedSlot = this.playerInventory.getSelectedSlot();
					const selectedItem = this.playerInventory.getItem(selectedSlot);
					
					if (selectedItem) {
						try {
							const { getItemConfig } = require('../config/items');
							const itemConfig = getItemConfig(selectedItem);
							
							// Check if item is soulbound
							if (!itemConfig.soulbound) {
								this.itemSpawner.handleItemDrop(playerEntity, isShiftHeld);
							} else {
								// Notify player that item cannot be dropped
								this.player.ui.sendData({
									showItemName: {
										name: "This item is soulbound"
									}
								});
							}
						} catch (error) {
							console.error('[PlayerManager] Error checking item soulbound status:', error);
							// If there's an error, default to allowing the drop
							this.itemSpawner.handleItemDrop(playerEntity, isShiftHeld);
						}
					} else {
						// No item selected, proceed with normal drop
						this.itemSpawner.handleItemDrop(playerEntity, isShiftHeld);
					}
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

				// Handle V key for dungeon UI
				if (input["v"] && !this.isVPressed) {
					this.isVPressed = true;
					console.log('[PlayerManager] V key pressed - toggling dungeon UI');
					this.gameManager.getDungeonManager().toggleDungeon(this.player);
				} else if (!input["v"]) {
					this.isVPressed = false;
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

		// Handle chat messages
		this.player.on("chat_message", ({ message }: { message: string }) => {
			// Handle level command
			if (message.startsWith("/level ")) {
				const levelArg = message.split(" ")[1];
				const level = parseInt(levelArg);
				
				if (!isNaN(level) && level > 0) {
					const levelManager = this.gameManager.getLevelManager();
					if (levelManager) {
						levelManager.setTestLevel(this.player.id, level);
						this.player.sendMessage(`Set your level to ${level}`);
						console.log(`[PlayerManager] Set player ${this.player.id} level to ${level} via command`);
						
						// Send updated stats to UI
						this.sendPlayerStatsToUI();
					} else {
						this.player.sendMessage("Level manager not available");
					}
				} else {
					this.player.sendMessage("Invalid level. Usage: /level [number]");
				}
				return; // Prevent message from being sent to chat
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

		// Check if the held item is broken
		if (heldItem && this.playerInventory.isItemBroken(selectedSlot)) {
			try {
				const { getItemConfig } = require('../config/items');
				const itemConfig = getItemConfig(heldItem);
				
				// Show appropriate message for soulbound items
				if (itemConfig.soulbound) {
					this.player.ui.sendData({
						showItemName: {
							name: "This soulbound item is broken and needs repair!"
						}
					});
				} else {
					this.player.ui.sendData({
						showItemName: {
							name: "This item is broken and needs repair!"
						}
					});
				}
			} catch (error) {
				console.error('[PlayerManager] Error checking soulbound status:', error);
				// Fallback message if error
				this.player.ui.sendData({
					showItemName: {
						name: "This item is broken and needs repair!"
					}
				});
			}
			return;
		}

		if (!heldItem) return;

		const direction = playerEntity.player.camera.facingDirection;
		const forwardOffset = playerEntity.player.camera.forwardOffset; // Get the current forward offset
		const cameraYOffset = playerEntity.player.camera.offset.y;
		
		// Get camera position and apply minimal fixed offsets
		const origin = {
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			x: playerEntity.position.x + (direction.x * 0.1),
			// Add camera height and offset based on look direction
			y: playerEntity.position.y + cameraYOffset + (direction.y < -0.7 ? 0.4 : 0.325), // Use higher offset when looking straight down
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			z: playerEntity.position.z + (direction.z * 0.1)
		};
		
		// For horizontal movement, add a slight additional forward push
		if (Math.abs(direction.y) < 0.3) { // Only when looking roughly horizontally
			origin.x += direction.x * 0.2;
			origin.z += direction.z * 0.2;
		}

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
		
		// Set up an interval to send progress updates every 50ms for smooth animation
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
					}, 300); // Match the CSS transition duration
				}
			}
		}, 50); // Update every 50ms for smooth animation
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
		const selectedSlot = this.playerInventory.getSelectedSlot();
		const heldItem = this.playerInventory.getItem(selectedSlot);

		// Check if the held item is broken
		if (heldItem && this.playerInventory.isItemBroken(selectedSlot)) {
			try {
				const { getItemConfig } = require('../config/items');
				const itemConfig = getItemConfig(heldItem);
				
				// Show appropriate message for soulbound items
				if (itemConfig.soulbound) {
					this.player.ui.sendData({
						showItemName: {
							name: "This soulbound item is broken and needs repair!"
						}
					});
				} else {
					this.player.ui.sendData({
						showItemName: {
							name: "This item is broken and needs repair!"
						}
					});
				}
			} catch (error) {
				console.error('[PlayerManager] Error checking soulbound status:', error);
				// Fallback message if error
				this.player.ui.sendData({
					showItemName: {
						name: "This item is broken and needs repair!"
					}
				});
			}
			return;
		}

		// Raycast vanaf de spelerpositie in de kijkrichting
		const direction = playerEntity.player.camera.facingDirection;
		const forwardOffset = playerEntity.player.camera.forwardOffset; // Get the current forward offset
		const cameraYOffset = playerEntity.player.camera.offset.y;
		
		// Get camera position and apply minimal fixed offsets
		const origin = {
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			x: playerEntity.position.x + (direction.x * 0.1),
			// Add camera height and offset based on look direction
			y: playerEntity.position.y + cameraYOffset + (direction.y < -0.7 ? 0.4 : 0.325), // Use higher offset when looking straight down
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			z: playerEntity.position.z + (direction.z * 0.1)
		};
		
		// For horizontal movement, add a slight additional forward push
		if (Math.abs(direction.y) < 0.3) { // Only when looking roughly horizontally
			origin.x += direction.x * 0.2;
			origin.z += direction.z * 0.2;
		}

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
				animalManager.handleAnimalHit(hitEntity, direction, damage, playerEntity.player.id);
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
					damage: bossDamage,
					player: playerEntity.name,
					playerId: playerEntity.player.id
				});
				
				// Record this player as the attacker for this boss
				if (hitEntity.id) {
					try {
						AttackerTracker.getInstance().recordAttack(hitEntity.id, playerEntity);
					} catch (error) {
						console.error(`[Combat] Error recording attack in AttackerTracker:`, error);
					}
				}
				
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
				
				// Record this player as the attacker for this boss
				if (closestBoss.id) {
					try {
						AttackerTracker.getInstance().recordAttack(closestBoss.id, playerEntity);
					} catch (error) {
						console.error(`[Combat] Error recording attack in AttackerTracker:`, error);
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
			const forwardOffset = this.playerEntity.player.camera.forwardOffset; // Get the current forward offset
			const cameraYOffset = this.playerEntity.player.camera.offset.y;
			
			// Get camera position and apply minimal fixed offsets
			const origin = {
				// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
				x: this.playerEntity.position.x + (direction.x * 0.1),
				// Add camera height and offset based on look direction
				y: this.playerEntity.position.y + cameraYOffset + (direction.y < -0.7 ? 0.4 : 0.325), // Use higher offset when looking straight down
				// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
				z: this.playerEntity.position.z + (direction.z * 0.1)
			};
			
			// For horizontal movement, add a slight additional forward push
			if (Math.abs(direction.y) < 0.3) { // Only when looking roughly horizontally
				origin.x += direction.x * 0.2;
				origin.z += direction.z * 0.2;
			}

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
		const player = playerEntity.player;
		const direction = player.camera.facingDirection;
		const forwardOffset = player.camera.forwardOffset; // Get the current forward offset
		const cameraYOffset = player.camera.offset.y;

		// Calculate origin based on player position, camera offsets, and direction
		// Get camera position and apply minimal fixed offsets
		const origin = {
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			x: playerEntity.position.x + (direction.x * 0.1),
			// Add camera height and offset based on look direction
			y: playerEntity.position.y + cameraYOffset + (direction.y < -0.7 ? 0.4 : 0.325), // Use higher offset when looking straight down
			// Use a small fixed forward push of 0.1 blocks in the exact direction player is looking
			z: playerEntity.position.z + (direction.z * 0.1)
		};
		
		// For horizontal movement, add a slight additional forward push
		if (Math.abs(direction.y) < 0.3) { // Only when looking roughly horizontally
			origin.x += direction.x * 0.2;
			origin.z += direction.z * 0.2;
		}

		// Cast a ray to detect what's in front of the player
		const raycastResult = this.world.simulation.raycast(origin, direction, 5, {
			filterExcludeRigidBody: playerEntity.rawRigidBody
		});

		if (raycastResult?.hitEntity) {
			const hitEntity = raycastResult.hitEntity;
			console.log('[PlayerManager] Right-click hit entity:', hitEntity.name);

			// Check entity type and handle accordingly
			if (hitEntity.name.includes('Dungeon Master')) {
				console.log('[PlayerManager] Opening dungeon UI via DungeonNPC');
				this.gameManager.getDungeonManager().toggleDungeon(this.player, true);
			} else if (hitEntity.name.includes('Traveler') || hitEntity.name.includes('Market Trader')) {
				console.log('[PlayerManager] Opening traveler UI via NPC interaction');
				this.toggleTraveler();
			} else if (hitEntity.name === 'workbench') {
				console.log('[PlayerManager] Opening crafting UI via workbench');
				this.openCrafting();
				// Visual feedback that interaction happened
				playerEntity.startModelOneshotAnimations(["simple_interact"]);
			} else if (hitEntity.name.includes('-crate')) {
				// Extract the crate type from the entity name
				const crateType = hitEntity.name;
				
				// Get the crate configuration
				const { getCrateById } = require('../config/crates');
				const crateConfig = getCrateById(crateType);
				
				if (!crateConfig) {
					console.error(`[PlayerManager] Could not find crate configuration for ${crateType}`);
					return;
				}

				// Check if player is holding the required key in their selected slot
				const selectedSlot = this.playerInventory.getSelectedSlot();
				const heldItem = this.playerInventory.getItem(selectedSlot);
				const requiredKeyType = crateConfig.requiredKey.type;

				if (heldItem === requiredKeyType) {
					const count = this.playerInventory.getItemCount(selectedSlot);
					if (count > 0) {
						// Check if player is on cooldown for this specific crate type
						if (this.gameManager.getCrateManager().isPlayerOnCooldown(this.player.id, crateType)) {
							// Show cooldown message to player
							this.player.ui.sendData({
								showItemName: {
									name: `Please wait before opening another ${crateConfig.name}`
								}
							});
							return;
						}

						console.log(`[PlayerManager] Opening ${crateType} with ${requiredKeyType}`);
						// Handle crate interaction via CrateManager
						this.gameManager.getCrateManager().handleCrateInteraction(
							crateType, 
							hitEntity,
							this.playerInventory,
							selectedSlot,
							this.player.id
						);
					}
				} else {
					// Notify player they need to hold the key
					this.player.ui.sendData({
						showItemName: {
							name: `Hold a ${crateConfig.requiredKey.displayName} to open this crate`
						}
					});
				}
			}
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
	private toggleTraveler(): void {
		// Toggle traveler state
		this.isTravelerOpen = !this.isTravelerOpen;
		
		// Send UI update
		this.player.ui.sendData({
			travelerToggle: {
				isOpen: this.isTravelerOpen,
				categories: ['daily', 'weekly', 'special'],
				initialCategory: 'daily'
			}
		});

		// Update inventory state
		this.isInventoryOpen = this.isTravelerOpen;
		this.player.ui.sendData({
			inventoryToggle: {
				isOpen: this.isInventoryOpen
			}
		});

		// Update pointer lock
		this.player.ui.lockPointer(!this.isTravelerOpen);
	}

	private startHealing(): void {
		// Clear any existing interval first
		if (this.healingInterval) {
			clearInterval(this.healingInterval);
		}

		// Start new healing interval
		this.healingInterval = setInterval(() => {
			// Only heal if player is not dead and not at max health
			if (!this.playerHealth.getIsDead() && this.playerHealth.getCurrentHealth() < this.playerHealth.getMaxHealth()) {
				this.playerHealth.heal(this.HEAL_AMOUNT);
			}
		}, this.HEAL_INTERVAL_MS);
	}

	// Add cleanup method to clear interval when player leaves
	public cleanup(): void {
		if (this.healingInterval) {
			clearInterval(this.healingInterval);
			this.healingInterval = null;
		}
	}
}
