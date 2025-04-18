import { World, Entity, Audio, PlayerEntity } from "hytopia";
import type { Vector3Like } from "hytopia";
import type { CrateConfig } from "../types/crates";
import { getCrateById } from "../config/crates";
import { AnimationManager } from "./AnimationManager";
import { ItemSpawner } from "./ItemSpawner";
import { BaseItem } from "../items/BaseItem";

interface CrateCooldown {
    endTime: number;
    crateType: string;
}

export class CrateManager {
    private animationManager: AnimationManager;
    // Track cooldowns per player AND per crate type
    private playerCooldowns: Map<string, Map<string, number>> = new Map();
    private readonly COOLDOWN_DURATION = 7000; // 7 seconds cooldown

    constructor(
        private world: World,
        private itemSpawner: ItemSpawner
    ) {
        this.animationManager = new AnimationManager(world);
    }

    public isPlayerOnCooldown(playerId: string, crateType: string): boolean {
        const playerCooldowns = this.playerCooldowns.get(playerId);
        if (!playerCooldowns) return false;

        const cooldownTime = playerCooldowns.get(crateType);
        if (!cooldownTime) return false;
        
        return Date.now() < cooldownTime;
    }

    private setPlayerCooldown(playerId: string, crateType: string): void {
        // Get or create cooldown map for this player
        let playerCooldowns = this.playerCooldowns.get(playerId);
        if (!playerCooldowns) {
            playerCooldowns = new Map();
            this.playerCooldowns.set(playerId, playerCooldowns);
        }

        // Set cooldown for this specific crate type
        playerCooldowns.set(crateType, Date.now() + this.COOLDOWN_DURATION);
    }

    public handleCrateInteraction(crateId: string, crateEntity: Entity, playerInventory: any, selectedSlot: number, playerId: string): void {
        // Check if player is on cooldown for this specific crate type
        if (this.isPlayerOnCooldown(playerId, crateId)) {
            console.log(`[CrateManager] Player ${playerId} is on cooldown for ${crateId}`);
            return;
        }

        const crateConfig = getCrateById(crateId);
        if (!crateConfig) {
            console.error(`[CrateManager] No configuration found for crate: ${crateId}`);
            return;
        }

        // Get the player entity directly from GameManager
        const gameManager = (global as any).gameManagerInstance;
        const playerManager = gameManager.getPlayerManagerById(playerId);
        if (!playerManager) {
            console.error(`[CrateManager] Could not find PlayerManager for ID ${playerId}`);
            return;
        }
        
        // Get the player entity
        const playerEntity = playerManager.playerEntity;
        if (!playerEntity) {
            console.error(`[CrateManager] Could not find PlayerEntity in PlayerManager for ID ${playerId}`);
            return;
        }

        // Remove the crate from player's inventory
        const crateType = crateConfig.requiredKey.type;
        if (playerInventory.getItem(selectedSlot) === crateType) {
            playerInventory.removeItem(crateType, 1);
            console.log(`[CrateManager] Removed crate ${crateType} from player inventory`);
        } else {
            console.error(`[CrateManager] Expected crate ${crateType} in slot ${selectedSlot} but not found`);
            return;
        }

        // Set cooldown for this specific crate type
        this.setPlayerCooldown(playerId, crateId);

        // Play open sound
        this.playOpenSound(crateEntity.position);

        // First play the crate's native "open" animation if it has one
        try {
            // Play the "open" animation on the crate entity
            console.log(`[CrateManager] Attempting to play 'open' animation on crate: ${crateId}`);
            
            // In Hytopia, we can play a one-shot animation
            if (crateEntity && crateEntity.isSpawned) {
                crateEntity.startModelOneshotAnimations(['open']);
                console.log(`[CrateManager] Started 'open' animation on crate`);
            }
        } catch (error) {
            console.error('[CrateManager] Error playing open animation:', error);
        }

        // Create a new AnimationManager instance for this specific animation
        const animationInstance = new AnimationManager(this.world);

        // Add a slight delay to let the open animation start before the loot animation
        setTimeout(() => {
            // Start the animation and add the winning item to inventory when complete
            animationInstance.startAnimation(
                crateConfig.lootTable,
                crateEntity.position,
                crateConfig.animation,
                (finalItem) => {
                    // Add the winning item to player's inventory
                    if (finalItem && finalItem.item) {
                        // First try to add to inventory
                        const addResult = playerInventory.addItem(finalItem.item.type, finalItem.count || 1);
                        
                        // If inventory is full or add failed, drop on ground
                        if (!addResult.success) {
                            // Create drop position above the player
                            const dropPosition = {
                                x: playerEntity.position.x,
                                y: playerEntity.position.y + 1.5,
                                z: playerEntity.position.z
                            };

                            // Drop the item with its count
                            this.itemSpawner.handleBlockDrop(finalItem.item.type, dropPosition, finalItem.count || 1);
                            console.log(`[CrateManager] Inventory full, dropping ${finalItem.count || 1}x ${finalItem.item.type} on ground at ${JSON.stringify(dropPosition)}`);
                        } else {
                            console.log(`[CrateManager] Successfully added ${finalItem.count || 1}x ${finalItem.item.type} to player inventory in slot ${addResult.addedToSlot}`);
                        }
                        
                        // Play a success sound when item is obtained
                        try {
                            const successSound = new Audio({
                                uri: 'audio/sfx/items/pickup.mp3',
                                position: crateEntity.position,
                                volume: 0.4,
                                referenceDistance: 5
                            });
                            successSound.play(this.world);
                        } catch (error) {
                            console.error('[CrateManager] Error playing success sound:', error);
                        }
                    }
                }
            );
        }, 300); // 300ms delay to give time for the open animation to begin
    }

    private playOpenSound(position: Vector3Like): void {
        try {
            const openSound = new Audio({
                uri: 'audio/sfx/items/open.mp3',
                position: position,
                volume: 0.4,
                referenceDistance: 5
            });
            openSound.play(this.world);
        } catch (error) {
            console.error('[CrateManager] Error playing open sound:', error);
        }
    }
}