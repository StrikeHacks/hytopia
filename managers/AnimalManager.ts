import { Entity, World, Quaternion, PathfindingEntityController } from 'hytopia';
import { ItemSpawner } from './ItemSpawner';
import { GameManager } from './GameManager';
import { animalConfigs } from '../config/spawners';

// Optimized animal state tracking
interface AnimalState {
    hp: number;
    maxHP: number;
    lastHitTime: number;
    animalType: string;
    lastUpdateTime: number; // For performance tracking
    isPanicking: boolean;   // Track panic state
    activeTimers: NodeJS.Timer[]; // Track all timers (changed from Timeout to Timer)
}

export class AnimalManager {
    private animals: Map<number, Entity> = new Map();
    private animalStates: Map<number, AnimalState> = new Map();
    private readonly HIT_COOLDOWN = 400; // ms tussen hits
    private readonly DEATH_EFFECT_DURATION = 250; // ms (reduced from 300ms)
    private readonly PANIC_DURATION = 2000; // ms (reduced from 2500ms)

    constructor(
        private world: World,
        private itemSpawner: ItemSpawner,
        private gameManager: GameManager
    ) {}

    public registerAnimal(animal: Entity, animalType: string = 'cow') {
        if (animal.id) {
            // Get configuration for this animal type
            const config = animalConfigs[animalType];
            const maxHP = config?.maxHP || 10; // Default 10 as fallback
            
            console.log(`[AnimalManager] Registering ${animalType} with ${maxHP} HP (Entity ID: ${animal.id})`);
            
            // Initialize with full HP and reset state
            this.animalStates.set(animal.id, { 
                hp: maxHP,
                maxHP: maxHP,
                lastHitTime: 0,
                animalType: animalType,
                lastUpdateTime: Date.now(),
                isPanicking: false,
                activeTimers: []
            });
            
            this.animals.set(animal.id, animal);
            console.log(`[AnimalManager] Total registered animals: ${this.animals.size}`);
        } else {
            console.warn('[AnimalManager] Attempted to register animal without ID');
        }
    }

    public unregisterAnimal(animalId: number) {
        // Clean up any active timers
        const state = this.animalStates.get(animalId);
        if (state) {
            state.activeTimers.forEach(timer => clearTimeout(timer));
        }
        
        this.animals.delete(animalId);
        this.animalStates.delete(animalId);
    }

    public handleAnimalHit(animal: Entity, direction: { x: number, y: number, z: number }, weaponDamage?: number) {
        if (!animal.id || !this.animals.has(animal.id)) return;

        const animalState = this.animalStates.get(animal.id);
        if (!animalState) return;

        // Check cooldown
        const now = Date.now();
        if (now - animalState.lastHitTime < this.HIT_COOLDOWN) {
            return; // Still in cooldown
        }
        animalState.lastHitTime = now;

        // Calculate damage
        const damage = weaponDamage ?? 0.5; // 0.5 damage for hand hits, otherwise weapon damage
        animalState.hp -= damage;

        // Check for death
        if (animalState.hp <= 0) {
            this.handleAnimalDeath(animal);
            return;
        }

        // Knockback forces - slightly reduced for better performance
        const knockbackForce = 800;  // Reduced from 900
        const verticalForce = 350;   // Reduced from 400

        // Normalize direction for consistent knockback
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const normalizedDirection = {
            x: direction.x / length,
            z: direction.z / length
        };

        // Apply knockback with normalized direction
        animal.applyImpulse({
            x: normalizedDirection.x * knockbackForce,
            y: verticalForce,
            z: normalizedDirection.z * knockbackForce
        });

        // Hit effect (only if the animal is not dead)
        if (animalState.hp > 0) {
            // Set hit color
            animal.setTintColor({ r: 255, g: 0, b: 0 });
            
            // Reset color after a short duration
            const hitTimer = setTimeout(() => {
                if (animalState.hp > 0 && animal.isSpawned) {
                    animal.setTintColor({ r: 255, g: 255, b: 255 });
                }
            }, 100);
            
            // Track timer for cleanup
            animalState.activeTimers.push(hitTimer);

            // Start panic mode
            this.startPanicMode(animal);
        }
    }

    private handleAnimalDeath(animal: Entity) {
        const animalId = animal.id;
        if (typeof animalId !== 'number') return;

        // Get the animal state to determine the animal type
        const animalState = this.animalStates.get(animalId);
        if (!animalState) return;

        // Get configured drops for this animal type
        const config = animalConfigs[animalState.animalType];
        const dropItems = config?.dropItems || ['bone']; // Default to bone if no drops configured
        
        // Drop configured items
        for (const item of dropItems) {
            this.itemSpawner.handleBlockDrop(item, animal.position);
        }

        // Cancel any active timers
        animalState.activeTimers.forEach(timer => clearTimeout(timer));
        animalState.activeTimers = [];

        // Disable physics for complete control over movement
        animal.setEnabledRotations({ x: false, y: false, z: false });
        animal.setEnabledPositions({ x: false, y: false, z: false });
        
        // Store start position
        const startPosition = { ...animal.position };
        const fallDistance = 0.5; // How many blocks to fall
        
        // Start time for animation
        const startTime = Date.now();
        const animationDuration = 200; // Faster animation (reduced from 250ms)

        // Set red tint and opacity
        animal.setTintColor({ r: 255, g: 0, b: 0 });
        animal.setOpacity(0.7);
        
        // Optimized death animation
        // Use fewer frames by updating less frequently
        const updateInterval = 32; // 30fps instead of 60fps
        const animationInterval = setInterval(() => {
            if (!animal.isSpawned) {
                clearInterval(animationInterval);
                return;
            }
            
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            
            // Calculate progress (0 to 1)
            const progress = Math.min(elapsed / animationDuration, 1);
            
            // Interpolate rotation from 0 to 90 degrees
            const currentAngle = progress * 90;
            animal.setRotation(Quaternion.fromEuler(0, 0, currentAngle));
            
            // Interpolate Y position (falling animation)
            animal.setPosition({
                x: startPosition.x,
                y: startPosition.y - (progress * fallDistance),
                z: startPosition.z
            });

            // Maintain red tint
            animal.setTintColor({ r: 255, g: 0, b: 0 });
            
            // Stop the animation when complete
            if (progress >= 1) {
                clearInterval(animationInterval);
            }
        }, updateInterval);

        // Remove after effect duration
        const deathTimer = setTimeout(() => {
            clearInterval(animationInterval); // Just in case

            // Inform the spawner that this entity is dead
            this.gameManager.getAnimalSpawner().removeEntityFromArea(animal);

            if (animal.isSpawned) {
                animal.despawn();
            }
            this.unregisterAnimal(animalId);
        }, this.DEATH_EFFECT_DURATION);
        
        // Add to tracked timers
        animalState.activeTimers.push(deathTimer);
    }

    private startPanicMode(animal: Entity): void {
        if (!animal.isSpawned) return;
        
        // Get the animal state
        const animalId = animal.id;
        if (typeof animalId !== 'number') return;
        
        const animalState = this.animalStates.get(animalId);
        if (!animalState) return;
        
        // If already panicking, just reset the duration
        if (animalState.isPanicking) {
            return;
        }
        
        // Mark as panicking
        animalState.isPanicking = true;
        
        // Get the pathfinding controller
        const controller = animal.controller as PathfindingEntityController;
        if (!controller) return;

        // Cancel any existing panic mode timers
        if ((animal as any)._panicModeInterval) {
            clearInterval((animal as any)._panicModeInterval);
            (animal as any)._panicModeInterval = null;
        }

        // Start running animation
        const walkAnim = animalConfigs[animalState.animalType]?.animations.find(a => a.name === 'walk')?.name;
        const idleAnim = animalConfigs[animalState.animalType]?.animations.find(a => a.name === 'idle')?.name;
        
        if (walkAnim && idleAnim) {
            animal.stopModelAnimations([idleAnim]);
            animal.startModelLoopedAnimations([walkAnim]);
        }

        // Optimized panic settings
        const PANIC_SPEED = 8; // Reduced from 10 for better physics
        const MIN_PANIC_DISTANCE = 3; // Reduced from 4
        const MAX_PANIC_DISTANCE = 6; // Reduced from 8
        const DIRECTION_CHANGE_INTERVAL = 350; // Increased from 250ms for better performance

        // Start movement in a random direction immediately
        const startMovement = () => {
            if (!animal.isSpawned) {
                if ((animal as any)._panicModeInterval) {
                    clearInterval((animal as any)._panicModeInterval);
                    (animal as any)._panicModeInterval = null;
                }
                return;
            }

            const currentPos = animal.position;
            const angle = Math.random() * Math.PI * 2; // Random direction
            
            // Random distance between MIN and MAX
            const distance = MIN_PANIC_DISTANCE + (Math.random() * (MAX_PANIC_DISTANCE - MIN_PANIC_DISTANCE));
            
            const newPos = {
                x: currentPos.x + Math.cos(angle) * distance,
                y: currentPos.y,
                z: currentPos.z + Math.sin(angle) * distance
            };

            // More efficient pathfinding options
            controller.pathfind(newPos, PANIC_SPEED, {
                maxJump: 1.0, // Reduced from 1.5
                maxFall: 1.5, // Reduced from 2
                verticalPenalty: 1.5, // Increased from 1.2 to prefer flat paths
                waypointTimeoutMs: 250, // Reduced from 300
                maxOpenSetIterations: 80, // Reduced from 100
            });
        };

        // Start the first movement
        startMovement();

        // Set up the interval for direction changes
        (animal as any)._panicModeInterval = setInterval(startMovement, DIRECTION_CHANGE_INTERVAL);

        // End panic mode after duration
        const panicEndTimer = setTimeout(() => {
            if (!animal.isSpawned) return;
            
            // Clear the interval
            if ((animal as any)._panicModeInterval) {
                clearInterval((animal as any)._panicModeInterval);
                (animal as any)._panicModeInterval = null;
            }
            
            // Stop running and return to idle
            if (walkAnim && idleAnim) {
                animal.stopModelAnimations([walkAnim]);
                animal.startModelLoopedAnimations([idleAnim]);
            }
            
            // Update state
            if (animalState) {
                animalState.isPanicking = false;
            }
        }, this.PANIC_DURATION);
        
        // Track the timer
        animalState.activeTimers.push(panicEndTimer);
    }
} 