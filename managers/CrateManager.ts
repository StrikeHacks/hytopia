import { World, Entity, Audio } from "hytopia";
import type { Vector3Like } from "hytopia";
import type { CrateConfig } from "../types/crates";
import { getCrateById } from "../config/crates";
import { AnimationManager } from "./AnimationManager";
import { ItemSpawner } from "./ItemSpawner";

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

        // Create a new AnimationManager instance for this specific animation
        const animationInstance = new AnimationManager(this.world);

        // Start the animation and add the winning item to inventory when complete
        animationInstance.startAnimation(
            crateConfig.lootTable,
            crateEntity.position,
            crateConfig.animation,
            (finalItem) => {
                // Add the winning item to player's inventory
                if (finalItem && finalItem.item) {
                    playerInventory.addItem(finalItem.item.type, finalItem.count || 1);
                    console.log(`[CrateManager] Added ${finalItem.count || 1}x ${finalItem.item.type} to player inventory`);
                    
                    // Play a success sound when item is added
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