import { Entity, World, Audio, SceneUI, RigidBodyType } from "hytopia";
import type { Vector3Like } from "hytopia";
import type { CrateAnimationConfig, CrateLootConfig } from "../types/crates";

export class AnimationManager {
    private currentPreview: Entity | null = null;
    private cycleInterval: NodeJS.Timer | null = null;
    private finalPreview: Entity | null = null;
    private itemNameSceneUI: SceneUI | null = null;

    constructor(private world: World) {}

    public startAnimation(
        lootTable: CrateLootConfig[], 
        position: Vector3Like, 
        animConfig: CrateAnimationConfig,
        onComplete: (finalItem: CrateLootConfig) => void,
        playerName: string = "Player"
    ): void {
        // Clean up any existing animations first
        this.cleanup();

        // Play the crate opening sound at the start of animation
        this.playCrateOpeningSound(position);

        // Determine the final item first
        const finalItem = this.determineRandomLoot(lootTable);

        switch (animConfig.type) {
            case 'arch':
                this.showArchAnimation(lootTable, position, animConfig, finalItem, onComplete, playerName);
                break;
            case 'spin':
                this.showSpinAnimation(lootTable, position, animConfig, finalItem, onComplete, playerName);
                break;
            case 'bounce':
                this.showBounceAnimation(lootTable, position, animConfig, finalItem, onComplete, playerName);
                break;
            case 'scatter':
                this.showScatterAnimation(lootTable, position, animConfig, finalItem, onComplete, playerName);
                break;
            default:
                console.error(`Unknown animation type: ${(animConfig as any).type}`);
                this.showArchAnimation(lootTable, position, animConfig, finalItem, onComplete, playerName);
        }
    }

    private cleanup(): void {
        // Clean up current preview
        if (this.currentPreview) {
            this.currentPreview.despawn();
            this.currentPreview = null;
        }
        
        // Clean up final preview
        if (this.finalPreview) {
            this.finalPreview.despawn();
            this.finalPreview = null;
        }
        
        // Clean up item name scene UI
        if (this.itemNameSceneUI) {
            this.itemNameSceneUI.unload();
            this.itemNameSceneUI = null;
        }
        
        // Clear any running intervals
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
        }
    }

    private showArchAnimation(
        lootTable: CrateLootConfig[], 
        position: Vector3Like, 
        config: CrateAnimationConfig,
        finalItem: CrateLootConfig,
        onComplete: (finalItem: CrateLootConfig) => void,
        playerName: string = "Player"
    ): void {
        const baseY = position.y + 1.2;
        const width = config.params.width || 2.5;
        const height = config.params.height || 0.3;

        // Adjust cycles per second calculation to maintain total duration
        const cycleSpeed = 600; // Time between cycles in ms (was 1000)
        const cyclesPerSecond = 1000 / cycleSpeed; // This gives us 2 cycles per second instead of 1
        const totalCycles = Math.floor((config.duration.total / cycleSpeed) * cyclesPerSecond);

        let cycleCount = 0;

        this.cycleInterval = setInterval(() => {
            if (this.currentPreview) {
                this.currentPreview.despawn();
            }

            // Use the improved function to get a display item
            const displayItem = this.getRandomItemForCycle(lootTable, finalItem, cycleCount, totalCycles);

            this.currentPreview = new Entity({
                modelUri: displayItem.item.modelUri,
                modelScale: config.scale,
                modelLoopedAnimations: ['rotate']
            });

            const startX = position.x + (width / 2);
            this.currentPreview.spawn(this.world, {
                x: startX,
                y: baseY,
                z: position.z
            });

            let startTime = Date.now();
            const slideInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / config.duration.cycle, 1);

                const x = startX - (width * progress);
                const archProgress = (progress * 2) - 1;
                const y = baseY + (height * (1 - (archProgress * archProgress)));

                if (this.currentPreview) {
                    this.currentPreview.setPosition({
                        x: x,
                        y: y,
                        z: position.z
                    });
                }

                if (progress >= 1) {
                    clearInterval(slideInterval);
                }
            }, 16);

            this.playCycleSound(position);

            cycleCount++;

            if (cycleCount >= totalCycles) {
                // Clean up the current preview
                if (this.currentPreview) {
                    this.currentPreview.despawn();
                    this.currentPreview = null;
                }

                // Clear the cycle interval
                if (this.cycleInterval) {
                    clearInterval(this.cycleInterval);
                    this.cycleInterval = null;
                }

                // Show final item directly above the crate
                this.showFinalItem(finalItem, position, config, playerName);
                
                // After 3 seconds, clean up THEN call onComplete
                setTimeout(() => {
                    this.cleanup();
                    setTimeout(() => {
                        onComplete(finalItem);
                    }, 50);
                }, 3000);
            }
        }, config.duration.cycle);
    }

    private showSpinAnimation(
        lootTable: CrateLootConfig[], 
        position: Vector3Like, 
        config: CrateAnimationConfig,
        finalItem: CrateLootConfig,
        onComplete: (finalItem: CrateLootConfig) => void,
        playerName: string = "Player"
    ): void {
        const baseY = position.y + 1.2;
        const radius = (config.params.width || 1.5) / 2;
        const speed = config.params.speed || 1;
        let finalItemPosition: Vector3Like;

        const cyclesPerSecond = 1000 / config.duration.cycle;
        const totalCycles = Math.floor((config.duration.total / 1000) * cyclesPerSecond);
        let cycleCount = 0;

        this.cycleInterval = setInterval(() => {
            if (this.currentPreview) {
                this.currentPreview.despawn();
            }

            // Use the improved function to get a display item
            const displayItem = this.getRandomItemForCycle(lootTable, finalItem, cycleCount, totalCycles);

            this.currentPreview = new Entity({
                modelUri: displayItem.item.modelUri,
                modelScale: config.scale,
                modelLoopedAnimations: ['rotate']
            });

            this.currentPreview.spawn(this.world, {
                x: position.x,
                y: baseY,
                z: position.z
            });

            let startTime = Date.now();
            const spinInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / config.duration.cycle, 1);

                const angle = progress * Math.PI * 2 * speed;
                const x = position.x + (Math.cos(angle) * radius);
                const z = position.z + (Math.sin(angle) * radius);

                if (this.currentPreview) {
                    this.currentPreview.setPosition({
                        x: x,
                        y: baseY,
                        z: z
                    });
                }

                if (progress >= 1) {
                    clearInterval(spinInterval);
                }
            }, 16);

            this.playCycleSound(position);

            cycleCount++;

            if (cycleCount >= totalCycles) {
                // Store the final position before cleanup
                finalItemPosition = {
                    x: this.currentPreview ? this.currentPreview.position.x : position.x,
                    y: baseY,
                    z: this.currentPreview ? this.currentPreview.position.z : position.z
                };

                // Clean up the current preview
                if (this.currentPreview) {
                    this.currentPreview.despawn();
                    this.currentPreview = null;
                }

                // Clear the cycle interval
                if (this.cycleInterval) {
                    clearInterval(this.cycleInterval);
                    this.cycleInterval = null;
                }

                // Show final item at the last position of the spin
                this.showFinalItem(finalItem, position, config, playerName, finalItemPosition);
                
                // After 3 seconds, clean up THEN call onComplete
                setTimeout(() => {
                    this.cleanup();
                    setTimeout(() => {
                        onComplete(finalItem);
                    }, 50);
                }, 3000);
            }
        }, config.duration.cycle);
    }

    private showBounceAnimation(
        lootTable: CrateLootConfig[], 
        position: Vector3Like, 
        config: CrateAnimationConfig,
        finalItem: CrateLootConfig,
        onComplete: (finalItem: CrateLootConfig) => void,
        playerName: string = "Player"
    ): void {
        const baseY = position.y + 1.2;
        const height = config.params.height || 1.2;
        const speed = config.params.speed || 1;

        const cyclesPerSecond = 1000 / config.duration.cycle;
        const totalCycles = Math.floor((config.duration.total / 1000) * cyclesPerSecond);
        let cycleCount = 0;

        this.cycleInterval = setInterval(() => {
            if (this.currentPreview) {
                this.currentPreview.despawn();
            }

            // Use the improved function to get a display item
            const displayItem = this.getRandomItemForCycle(lootTable, finalItem, cycleCount, totalCycles);

            this.currentPreview = new Entity({
                modelUri: displayItem.item.modelUri,
                modelScale: config.scale,
                modelLoopedAnimations: ['rotate']
            });

            this.currentPreview.spawn(this.world, {
                x: position.x,
                y: baseY,
                z: position.z
            });

            let startTime = Date.now();
            const bounceInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / config.duration.cycle, 1);

                // Create a bouncing effect using sine
                const bounce = Math.abs(Math.sin(progress * Math.PI * speed));
                const y = baseY + (height * bounce);

                if (this.currentPreview) {
                    this.currentPreview.setPosition({
                        x: position.x,
                        y: y,
                        z: position.z
                    });
                }

                if (progress >= 1) {
                    clearInterval(bounceInterval);
                }
            }, 16);

            this.playCycleSound(position);

            cycleCount++;

            if (cycleCount >= totalCycles) {
                // Clean up the current preview
                if (this.currentPreview) {
                    this.currentPreview.despawn();
                    this.currentPreview = null;
                }

                // Clear the cycle interval
                if (this.cycleInterval) {
                    clearInterval(this.cycleInterval);
                    this.cycleInterval = null;
                }

                // Show final item
                this.showFinalItem(finalItem, position, config, playerName);
                
                // After 3 seconds, clean up THEN call onComplete
                setTimeout(() => {
                    // Clean up first
                    this.cleanup();
                    // Wait a frame to ensure cleanup is complete
                    setTimeout(() => {
                        onComplete(finalItem);
                    }, 50);
                }, 3000);
            }
        }, config.duration.cycle);
    }

    private showScatterAnimation(
        lootTable: CrateLootConfig[], 
        position: Vector3Like, 
        config: CrateAnimationConfig,
        finalItem: CrateLootConfig,
        onComplete: (finalItem: CrateLootConfig) => void,
        playerName: string = "Player"
    ): void {
        const baseY = position.y + 0.5;
        const maxHeight = config.params.height || 1.5;
        const maxRadius = config.params.radius || 1.5;
        const itemDuration = config.params.itemDuration || 1000;

        const cyclesPerSecond = 1000 / config.duration.cycle;
        const totalCycles = Math.floor((config.duration.total / 1000) * cyclesPerSecond);
        let cycleCount = 0;
        let activeAnimations = new Set<NodeJS.Timer>();
        let hasShownWinningItem = false;

        this.cycleInterval = setInterval(() => {
            // Use the improved function to get a display item
            const displayItem = this.getRandomItemForCycle(lootTable, finalItem, cycleCount, totalCycles);

            // Create preview entity with fixed scale of 0.4
            const preview = new Entity({
                modelUri: displayItem.item.modelUri,
                modelScale: 0.4, // Hardcoded scale for scatter animation
                modelLoopedAnimations: ['rotate']
            });

            // Calculate random scatter position
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = maxRadius * (0.5 + Math.random() * 0.5);
            const finalX = position.x + (Math.cos(randomAngle) * randomRadius);
            const finalZ = position.z + (Math.sin(randomAngle) * randomRadius);

            // Spawn at start position
            preview.spawn(this.world, {
                x: position.x,
                y: baseY,
                z: position.z
            });

            // Start time for animation
            const startTime = Date.now();
            
            // Create interval for animation
            const animationInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / itemDuration, 1);

                // Use easing functions for smoother motion
                const easeOutProgress = 1 - Math.pow(1 - progress, 2);
                
                // Calculate height using a smoother curve
                const heightProgress = Math.sin(easeOutProgress * Math.PI);
                const height = heightProgress * maxHeight;
                
                // Use eased progress for horizontal movement too
                const currentX = position.x + ((finalX - position.x) * easeOutProgress);
                const currentZ = position.z + ((finalZ - position.z) * easeOutProgress);

                // Update preview position
                preview.setPosition({
                    x: currentX,
                    y: baseY + height,
                    z: currentZ
                });

                // Check if animation is complete
                if (progress >= 1) {
                    clearInterval(animationInterval);
                    activeAnimations.delete(animationInterval);
                    preview.despawn();

                    // If this was the last item and we haven't shown the winning item yet
                    if (cycleCount >= totalCycles && !hasShownWinningItem) {
                        hasShownWinningItem = true;
                        // Use showFinalItem instead of showSimpleWinningItem
                        this.showFinalItem(finalItem, position, config, playerName);
                        
                        // After 3 seconds, clean up and complete
                        setTimeout(() => {
                            this.cleanup();
                            setTimeout(() => {
                                onComplete(finalItem);
                            }, 50);
                        }, 3000);
                    }
                }
            }, 8);

            // Track this animation
            activeAnimations.add(animationInterval);

            // Play sound effect
            this.playCycleSound(position);

            cycleCount++;

            if (cycleCount >= totalCycles) {
                // Clear the cycle interval
                if (this.cycleInterval) {
                    clearInterval(this.cycleInterval);
                    this.cycleInterval = null;
                }
            }
        }, config.duration.cycle);
    }

    private showSimpleWinningItem(finalItem: CrateLootConfig, position: Vector3Like, config: CrateAnimationConfig, onComplete: (finalItem: CrateLootConfig) => void): void {
        // Create the final preview entity with only the existing rotate animation
        this.finalPreview = new Entity({
            modelUri: finalItem.item.modelUri,
            modelScale: config.scale,
            modelLoopedAnimations: ['rotate'] // Keep the original rotation
        });

        const startY = position.y + 0.5;
        const pushHeight = 1.2; // Hoogte van de push
        let velocity = 0.08; // Snellere initiële snelheid
        const gravity = 0.006; // Sterkere zwaartekracht voor snellere val
        let currentY = startY;

        // Spawn at start position
        this.finalPreview.spawn(this.world, {
            x: position.x,
            y: startY,
            z: position.z
        });

        // Play reveal sound immediately
        try {
            const finalSound = new Audio({
                uri: 'audio/sfx/items/reveal.mp3',
                position: position,
                volume: 0.5,
                referenceDistance: 5,
                playbackRate: 1.2
            });
            finalSound.play(this.world);
        } catch (error) {
            console.error('[AnimationManager] Error playing final reveal sound:', error);
        }

        const pushInterval = setInterval(() => {
            // Update velocity with gravity
            velocity -= gravity;
            
            // Update position
            currentY += velocity;

            // Check for bounce
            if (currentY <= startY + 0.5) { // Stop op 0.5 blocks hoogte
                currentY = startY + 0.5;
                clearInterval(pushInterval);
                
                // After 3 seconds, clean up and complete
                setTimeout(() => {
                    this.cleanup();
                    setTimeout(() => {
                        onComplete(finalItem);
                    }, 50);
                }, 3000);
            }

            // Update only Y position, keeping X and Z fixed
            if (this.finalPreview) {
                this.finalPreview.setPosition({
                    x: position.x,
                    y: currentY,
                    z: position.z
                });
            }
        }, 16); // 60fps update rate
    }

    private showFinalItem(
        finalItem: CrateLootConfig, 
        position: Vector3Like, 
        config: CrateAnimationConfig,
        playerName: string = "Player",
        finalPosition?: Vector3Like
    ): void {
        // Clean up any existing final preview
        if (this.finalPreview) {
            this.finalPreview.despawn();
            this.finalPreview = null;
        }

        // Play winning sound instead of reward sound
        this.playWinningSound(position);

        // Create the final preview entity with fixed scale of 0.6
        this.finalPreview = new Entity({
            modelUri: finalItem.item.modelUri,
            modelScale: 0.6, // Hardcoded scale for winning items
            rigidBodyOptions: {
                type: RigidBodyType.FIXED // Make the entity static so it can't be pushed
            }
        });

        // Start rotation animation (for all types)
        let rotationAngle = 0;
        const rotationInterval = setInterval(() => {
            if (this.finalPreview) {
                rotationAngle += 0.03;
                this.finalPreview.setRotation({
                    x: 0,
                    y: Math.sin(rotationAngle / 2),
                    z: 0,
                    w: Math.cos(rotationAngle / 2)
                });
            } else {
                clearInterval(rotationInterval);
            }
        }, 16);

        // Spawn position for all animation types (including scatter)
        const spawnPosition = finalPosition || {
            x: position.x,
            y: position.y + 1.2,
            z: position.z
        };

        this.finalPreview.spawn(this.world, spawnPosition);

        // Create item name Scene UI
        this.createItemNameUI(finalItem, this.finalPreview, playerName);
    }

    // Create a Scene UI to display the name of the winning item
    private createItemNameUI(item: CrateLootConfig, entity: Entity, playerName: string = "Player"): void {
        // Clean up any existing SceneUI
        if (this.itemNameSceneUI) {
            this.itemNameSceneUI.unload();
            this.itemNameSceneUI = null;
        }

        // Format the item name with quantity and get rarity
        const { displayName, rarity } = this.formatItemName(item.item.type, item.count);

        // Create new SceneUI for item name
        this.itemNameSceneUI = new SceneUI({
            templateId: 'item-name-display',
            attachedToEntity: entity,
            state: { 
                playerName: playerName,
                name: displayName,
                rarity: rarity
            },
            offset: { x: 0, y: 1, z: 0 }  // Verhoogd voor de extra tekstregel
        });

        // Load the Scene UI
        this.itemNameSceneUI.load(this.world);
    }

    // Helper method to format item name from item type
    private formatItemName(itemType: string, count: number = 1): { displayName: string, rarity: string } {
        try {
            // Try to get item config for proper display name
            const { getItemConfig } = require('../config/items');
            const itemConfig = getItemConfig(itemType);
            
            let displayName = itemConfig?.displayName;
            let rarity = itemConfig?.rarity || 'common'; // Default to common if no rarity specified
            
            if (!displayName) {
                // Fallback to formatting the item type if config not available
                displayName = itemType
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            // Only show quantity if it's more than 1
            const finalDisplayName = count > 1 ? `${count}x ${displayName}` : displayName;
            
            return {
                displayName: finalDisplayName,
                rarity: rarity
            };
            
        } catch (error) {
            console.error('[AnimationManager] Error getting item display name:', error);
            // Fallback with quantity if needed
            const formattedName = itemType
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            const finalDisplayName = count > 1 ? `${count}x ${formattedName}` : formattedName;
            
            return {
                displayName: finalDisplayName,
                rarity: 'common' // Default to common for fallback
            };
        }
    }

    private playCycleSound(position: Vector3Like): void {
        try {
            const cycleSound = new Audio({
                uri: 'audio/sfx/items/appear.mp3',
                position: position,
                volume: 0.15,
                referenceDistance: 5,
                playbackRate: 1 + (Math.random() * 0.2 - 0.1)
            });
            cycleSound.play(this.world);
        } catch (error) {
            console.error('[AnimationManager] Error playing cycle sound:', error);
        }
    }

    private playCrateOpeningSound(position: Vector3Like): void {
        try {
            const crateOpeningSound = new Audio({
                uri: 'audio/sfx/crate/crate-opening.mp3',
                position: position,
                volume: 0.5,
                referenceDistance: 2,
                playbackRate: 1.0
            });
            crateOpeningSound.play(this.world);
        } catch (error) {
            console.error('[AnimationManager] Error playing crate opening sound:', error);
        }
    }

    private playWinningSound(position: Vector3Like): void {
        try {
            const winningSound = new Audio({
                uri: 'audio/sfx/crate/winning.mp3',
                position: position,
                volume: 0.6,
                referenceDistance: 2,
                playbackRate: 1.0
            });
            winningSound.play(this.world);
        } catch (error) {
            console.error('[AnimationManager] Error playing winning sound:', error);
        }
    }

    private determineRandomLoot(lootTable: CrateLootConfig[]): CrateLootConfig {
        // Validate input
        if (!lootTable || lootTable.length === 0) {
            console.error('[AnimationManager] Empty loot table provided');
            // Return a fallback item with proper properties
            return { 
                item: { 
                    type: 'fallback', 
                    modelUri: 'models/items/fallback.gltf',
                    displayName: 'Fallback Item',
                    category: 'misc',
                    imageUrl: 'items/fallback.png',
                    rarity: 'common'
                }, 
                count: 1, 
                dropChance: 100 
            };
        }

        // Calculate total chance from all items
        const totalChance = lootTable.reduce((sum, item) => sum + item.dropChance, 0);
        
        // Select a random value between 0 and totalChance
        let random = Math.random() * totalChance;
        
        // Find the item that corresponds to the random value
        for (const item of lootTable) {
            random -= item.dropChance;
            if (random <= 0) {
                console.log(`[AnimationManager] Selected item: ${item.item.type} with chance ${item.dropChance}/${totalChance}`);
                return item;
            }
        }
        
        // Fallback to first item if somehow none matched (shouldn't happen)
        console.warn('[AnimationManager] No item matched in random selection, using first item');
        return lootTable[0];
    }

    // Modified version of the random item selection for animation cycles
    // This ensures the winning item appears in the animation
    private getRandomItemForCycle(lootTable: CrateLootConfig[], finalItem: CrateLootConfig, cycleCount: number, totalCycles: number): CrateLootConfig {
        // On the last few cycles, increase chance of showing the final item
        // to prepare the player for what they'll receive
        if (totalCycles - cycleCount <= 3) {
            // 50% chance to show the final item in the last few cycles
            if (Math.random() < 0.5) {
                return finalItem;
            }
        }
        
        // For all other cycles, random selection from the loot table
        return lootTable[Math.floor(Math.random() * lootTable.length)];
    }
} 