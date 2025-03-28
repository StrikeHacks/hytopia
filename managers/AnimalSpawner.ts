import { Entity, Quaternion, RigidBodyType, World, PathfindingEntityController, ColliderShape, CollisionGroup } from 'hytopia';
import type { SpawnAreaConfig, AnimalConfig, Point3D } from '../config/spawners';
import { animalConfigs } from '../config/spawners';
import { AnimalManager } from './AnimalManager';
import { GameManager } from './GameManager';
import { EntityEvent } from 'hytopia';

// Helper class voor een spawn gebied
class SpawnArea {
    private spawnedEntities: Entity[] = [];
    private spawnTimer: ReturnType<typeof setInterval> | null = null;
    private animalConfig: AnimalConfig;
    private areaActive: boolean = false;
    private lastSpawnTime: number = 0;
    private spawnAttemptCount: number = 0;
    private minX: number = 0;
    private maxX: number = 0;
    private minZ: number = 0;
    private maxZ: number = 0;
    private boundingBox: { min: Point3D, max: Point3D } = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
    };

    constructor(
        private world: World,
        private config: SpawnAreaConfig,
        private gameManager: GameManager
    ) {
        const animalConfig = animalConfigs[this.config.animalType];
        if (!animalConfig) {
            throw new Error(`No configuration found for animal type: ${this.config.animalType}`);
        }
        this.animalConfig = animalConfig;

        // Pre-calculate area bounds for performance
        this.calculateAreaBounds();

        if (this.config.enabled) {
            this.startSpawning();
        }
    }

    private calculateAreaBounds(): void {
        const corners = this.config.corners;
        this.minX = Math.min(...corners.map(c => c.x));
        this.maxX = Math.max(...corners.map(c => c.x));
        const minY = Math.min(...corners.map(c => c.y));
        const maxY = Math.max(...corners.map(c => c.y));
        this.minZ = Math.min(...corners.map(c => c.z));
        this.maxZ = Math.max(...corners.map(c => c.z));

        this.boundingBox = {
            min: { x: this.minX, y: minY, z: this.minZ },
            max: { x: this.maxX, y: maxY, z: this.maxZ }
        };
    }

    public startSpawning(): void {
        if (this.spawnTimer !== null) {
            clearInterval(this.spawnTimer);
        }

        // Use configured interval or the default optimized value
        const optimizedInterval = Math.max(this.config.spawnInterval, 8000);
        
        this.spawnTimer = setInterval(() => {
            // Check if area should be active based on player distance
            this.updateAreaActivation();
            
            // Only try to spawn if area is active
            if (this.areaActive && this.shouldTrySpawning()) {
                this.trySpawnAnimal();
            }
        }, optimizedInterval);
    }

    private updateAreaActivation(): void {
        // Skip activation check if no playerActivationDistance is set
        if (!this.config.playerActivationDistance) {
            this.areaActive = true;
            return;
        }

        // Get all player entities
        const players = this.world.entityManager.getAllPlayerEntities();
        if (players.length === 0) {
            if (this.areaActive) {
                console.log(`[SpawnArea] Deactivating area - no players found.`);
                this.areaActive = false;
            }
            return;
        }

        // Calculate area center
        const center = {
            x: (this.minX + this.maxX) / 2,
            y: (this.boundingBox.min.y + this.boundingBox.max.y) / 2,
            z: (this.minZ + this.maxZ) / 2
        };

        // Check if any player is within activation distance
        const activationDistance = this.config.playerActivationDistance;
        const activationDistanceSquared = activationDistance * activationDistance;
        
        let nearestPlayerDistance = Number.MAX_VALUE;
        let isPlayerNearby = false;
        
        for (const player of players) {
            const playerPos = player.position;
            const dx = center.x - playerPos.x;
            const dy = center.y - playerPos.y;
            const dz = center.z - playerPos.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            
            if (distanceSquared < nearestPlayerDistance) {
                nearestPlayerDistance = distanceSquared;
            }

            if (distanceSquared <= activationDistanceSquared) {
                if (!this.areaActive) {
                    console.log(`[SpawnArea] Activating area - player within ${activationDistance} blocks.`);
                }
                this.areaActive = true;
                isPlayerNearby = true;
                return;
            }
        }

        // If we get here, no player was within activation distance
        if (this.areaActive) {
            const nearestDistanceRounded = Math.round(Math.sqrt(nearestPlayerDistance));
            console.log(`[SpawnArea] Deactivating area - nearest player is ${nearestDistanceRounded} blocks away (activation range: ${activationDistance}).`);
            this.areaActive = false;
        }
    }

    private shouldTrySpawning(): boolean {
        // Check spawn limit
        if (this.config.spawnLimit) {
            const now = Date.now();
            const timeSinceLastSpawn = now - this.lastSpawnTime;
            
            // Reset attempt count if in a new interval
            if (timeSinceLastSpawn >= this.config.spawnInterval) {
                this.spawnAttemptCount = 0;
            }
            
            // Check if we've hit the spawn limit
            if (this.spawnAttemptCount >= this.config.spawnLimit) {
                return false;
            }
        }
        
        return true;
    }

    public stopSpawning(): void {
        if (this.spawnTimer !== null) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    public cleanup(): void {
        this.stopSpawning();
        
        // Despawn all entities
        for (const entity of this.spawnedEntities) {
            if (entity.isSpawned) {
                entity.despawn();
            }
        }
        
        this.spawnedEntities = [];
    }

    private trySpawnAnimal(): void {
        // Track spawn attempt
        this.spawnAttemptCount++;
        
        console.log(`[SpawnArea] Attempting to spawn animal. Current count: ${this.spawnedEntities.length}/${this.config.maxEntities}`);
        
        // Check entity limit
        if (this.spawnedEntities.length >= this.config.maxEntities) {
            console.log(`[SpawnArea] Max entities reached (${this.config.maxEntities}), skipping spawn.`);
            return;
        }

        // Check spawn chance
        if (Math.random() > this.config.spawnChance) {
            console.log(`[SpawnArea] Spawn chance check failed, skipping spawn.`);
            return;
        }

        // Try to find a valid position
        const position = this.getRandomPositionInArea();
        if (!position) {
            console.log(`[SpawnArea] Failed to find valid position, skipping spawn.`);
            return;
        }

        // Use simplified collision check if enabled
        if (this.config.simplifiedCollision === true) {
            if (!this.isPositionValidSimplified(position)) {
                console.log(`[SpawnArea] Position too close to other entities (simplified check), skipping spawn.`);
                return;
            }
        } else if (!this.isPositionValid(position)) {
            console.log(`[SpawnArea] Position too close to other entities, skipping spawn.`);
            return;
        }

        console.log(`[SpawnArea] Spawning animal at position:`, position);
        this.spawnAnimal(position);
        this.lastSpawnTime = Date.now();
    }

    public spawnAnimal(position: { x: number, y: number, z: number }): void {
        // Find the idle animation from config
        const modelLoopedAnimations: string[] = [];
        const idleAnim = this.animalConfig.animations.find(a => a.name === 'idle');
        if (idleAnim) {
            modelLoopedAnimations.push(idleAnim.name);
        }

        // Random rotation between 0-360 degrees
        const randomRotation = Math.random() * 360;

        // Apply simplified physics if enabled in config
        const useSimplifiedPhysics = this.animalConfig.simplifiedPhysics === true;
        const entity = new Entity({
            name: `${this.config.animalType}_${Date.now()}`,
            modelUri: this.animalConfig.modelUri,
            modelScale: this.animalConfig.modelScale,
            modelLoopedAnimations,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                additionalMass: this.animalConfig.mass,
                gravityScale: useSimplifiedPhysics ? 1.0 : 1.2,
                enabledRotations: { x: false, y: true, z: false },
                enabledPositions: { x: true, y: true, z: true },
            }
        });

        // Add pathfinding controller
        const pathfinder = new PathfindingEntityController();
        entity.setController(pathfinder);

        entity.spawn(this.world, position);
        console.log(`[SpawnArea] Animal spawned successfully: ${this.config.animalType} (ID: ${entity.id})`);

        // Set collision groups right after spawning to prevent collision with players
        entity.setCollisionGroupsForSolidColliders({
            belongsTo: [CollisionGroup.ENTITY],
            collidesWith: [CollisionGroup.BLOCK]  // Only collide with blocks, not with players or other entities
        });

        // Set rotation after spawning
        entity.setRotation(Quaternion.fromEuler(0, randomRotation, 0));
        
        // Register the animal with the AnimalManager
        const animalManager = this.gameManager.getAnimalManager();
        animalManager.registerAnimal(entity, this.config.animalType);

        // Add despawn listener to unregister from AnimalManager
        entity.on(EntityEvent.DESPAWN, () => {
            if (entity.id) {
                animalManager.unregisterAnimal(entity.id);
                console.log(`[SpawnArea] Animal despawned: ${this.config.animalType} (ID: ${entity.id})`);
            }
        });

        this.addAnimalBehavior(entity);
        this.spawnedEntities.push(entity);
        console.log(`[SpawnArea] Total animals in area: ${this.spawnedEntities.length}/${this.config.maxEntities}`);
    }

    private isPositionValid(position: { x: number, y: number, z: number }): boolean {
        for (const entity of this.spawnedEntities) {
            if (!entity.isSpawned) continue;
            
            const entityPos = entity.position;
            const dx = position.x - entityPos.x;
            const dz = position.z - entityPos.z;
            const distanceSquared = dx * dx + dz * dz;

            if (distanceSquared < this.config.minEntityDistance * this.config.minEntityDistance) {
                return false;
            }
        }
        
        return true;
    }

    // Simplified collision check for better performance
    private isPositionValidSimplified(position: { x: number, y: number, z: number }): boolean {
        // Quick check for empty array
        if (this.spawnedEntities.length === 0) return true;
        
        // Optimized check using only the nearest entity for performance
        let nearestDistanceSquared = Number.MAX_VALUE;
        
        for (const entity of this.spawnedEntities) {
            if (!entity.isSpawned) continue;
            
            const entityPos = entity.position;
            const dx = position.x - entityPos.x;
            const dz = position.z - entityPos.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
            }
        }
        
        return nearestDistanceSquared >= this.config.minEntityDistance * this.config.minEntityDistance;
    }

    private getRandomPositionInArea(): { x: number, y: number, z: number } | null {
        if (!this.config.corners || this.config.corners.length < 3) {
            return null;
        }

        const buffer = 0.5;
        const bufferMinX = this.minX + buffer;
        const bufferMaxX = this.maxX - buffer;
        const bufferMinZ = this.minZ + buffer;
        const bufferMaxZ = this.maxZ - buffer;

        // Maximum height to start searching for ground
        const maxY = this.boundingBox.max.y + 5;

        // Limit raycast attempts for better performance
        const maxAttempts = 3; // Reduced from 5
        for (let i = 0; i < maxAttempts; i++) {
            const x = bufferMinX + Math.random() * (bufferMaxX - bufferMinX);
            const z = bufferMinZ + Math.random() * (bufferMaxZ - bufferMinZ);
            
            // Raycast from above to find the ground
            const raycastResult = this.world.simulation.raycast(
                { x, y: maxY, z },
                { x: 0, y: -1, z: 0 },
                maxY + 5 // Reduced search distance
            );

            if (raycastResult?.hitBlock) {
                // Spawn just above the ground
                return {
                    x,
                    y: raycastResult.hitPoint.y + 0.5,
                    z
                };
            }
        }

        return null;
    }

    private addAnimalBehavior(entity: Entity): void {
        // Use configured interval or default to a reasonable value
        const updateInterval = this.animalConfig.updateInterval || 3000;
        const movementInterval = updateInterval + Math.floor(Math.random() * 2000);
        const controller = entity.controller as PathfindingEntityController;
        
        // Store entity's wander state
        const entityState = {
            isWandering: false,
            lastMoveTime: 0,
            isNearPlayer: false
        };
        
        // Create a single interval for movement and behavior
        const intervalId = setInterval(() => {
            if (!entity.isSpawned) {
                clearInterval(intervalId);
                return;
            }

            // Implement distance-based activity culling
            if (this.animalConfig.cullingDistance) {
                const shouldBeActive = this.isEntityNearPlayer(entity, this.animalConfig.cullingDistance);
                
                // Skip processing if entity is far from players
                if (!shouldBeActive) {
                    return;
                }
            }

            // Reduce movement frequency for performance
            const now = Date.now();
            if (now - entityState.lastMoveTime < movementInterval || Math.random() > 0.3) {
                return;
            }
            
            entityState.lastMoveTime = now;
            
            // Calculate where to move
            const currentPos = entity.position;
            const moveDistance = 3 + Math.random() * 2; // Reduced movement range
            const angle = Math.random() * Math.PI * 2;
            
            const newX = currentPos.x + Math.cos(angle) * moveDistance;
            const newZ = currentPos.z + Math.sin(angle) * moveDistance;
            
            const newPos = { x: newX, y: currentPos.y, z: newZ };
            if (!this.isPositionInArea(newPos)) {
                return;
            }

            // Use animations from config
            const walkAnim = this.animalConfig.animations.find(a => a.name === 'walk')?.name;
            const idleAnim = this.animalConfig.animations.find(a => a.name === 'idle')?.name;

            // Start with idle animation if not already playing
            if (idleAnim && !entity.modelLoopedAnimations.has(idleAnim)) {
                entity.startModelLoopedAnimations([idleAnim]);
            }

            // Optimized pathfinding options
            controller.pathfind(newPos, 2.5, {  // Reduced movement speed from 3 to 2.5
                maxJump: 1.0, // Reduced from 2
                maxFall: 1.5, // Reduced from 2
                verticalPenalty: 1.0, // Added mild penalty
                waypointTimeoutMs: 2000, // Reduced from 3000
                maxOpenSetIterations: 100, // Reduced from 200
                waypointMoveCompleteCallback: (waypoint, index) => {
                    // Switch to walk animation when moving between waypoints
                    if (walkAnim && idleAnim) {
                        entity.stopModelAnimations([idleAnim]);
                        entity.startModelLoopedAnimations([walkAnim]);
                    }

                    // Face the direction of movement
                    const nextWaypoint = controller.waypoints[index + 1];
                    if (nextWaypoint) {
                        const dx = nextWaypoint.x - waypoint.x;
                        const dz = nextWaypoint.z - waypoint.z;
                        const angle = Math.atan2(dx, dz);
                        entity.setRotation(Quaternion.fromEuler(0, (angle * 180 / Math.PI) + 180, 0));
                    }
                },
                pathfindCompleteCallback: () => {
                    // Switch back to idle animation when path is complete
                    if (walkAnim && idleAnim) {
                        entity.stopModelAnimations([walkAnim]);
                        entity.startModelLoopedAnimations([idleAnim]);
                    }
                },
                waypointMoveSkippedCallback: () => {
                    // Switch back to idle if waypoint is skipped
                    if (walkAnim && idleAnim) {
                        entity.stopModelAnimations([walkAnim]);
                        entity.startModelLoopedAnimations([idleAnim]);
                    }
                }
            });

        }, updateInterval);
    }

    // Helper method to check if entity is near any player
    private isEntityNearPlayer(entity: Entity, distance: number): boolean {
        const players = this.world.entityManager.getAllPlayerEntities();
        if (players.length === 0) return false;
        
        const distanceSquared = distance * distance;
        const entityPos = entity.position;
        
        for (const player of players) {
            const playerPos = player.position;
            const dx = entityPos.x - playerPos.x;
            const dy = entityPos.y - playerPos.y;
            const dz = entityPos.z - playerPos.z;
            const sqDist = dx * dx + dy * dy + dz * dz;
            
            if (sqDist <= distanceSquared) {
                return true;
            }
        }
        
        return false;
    }

    private isPositionInArea(position: { x: number, y: number, z: number }): boolean {
        // Use pre-calculated bounds for performance
        return position.x >= this.minX && position.x <= this.maxX && 
               position.z >= this.minZ && position.z <= this.maxZ;
    }

    public removeEntity(entity: Entity): void {
        const index = this.spawnedEntities.indexOf(entity);
        if (index !== -1) {
            this.spawnedEntities.splice(index, 1);
        }
    }
}

// Main spawner class
export class AnimalSpawner {
    private spawnAreas: SpawnArea[] = [];
    private activationCheckInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        private world: World,
        private gameManager: GameManager,
        spawnConfigs: SpawnAreaConfig[]
    ) {
        // Initialize spawn areas
        spawnConfigs.forEach(config => {
            const spawnArea = new SpawnArea(world, config, gameManager);
            this.spawnAreas.push(spawnArea);
        });
        
        console.log(`[AnimalSpawner] Initialized with ${this.spawnAreas.length} spawn areas`);
        
        // Set up a global activation check interval to conserve resources
        this.activationCheckInterval = setInterval(() => {
            // Check if there are any players
            const hasPlayers = this.world.entityManager.getAllPlayerEntities().length > 0;
            
            if (hasPlayers) {
                // Make sure all areas are actively spawning when players are present
                let inactiveAreasFound = false;
                
                this.spawnAreas.forEach(area => {
                    if (!(area as any).spawnTimer) {
                        inactiveAreasFound = true;
                        area.startSpawning();
                    }
                });
                
                if (inactiveAreasFound) {
                    console.log(`[AnimalSpawner] Restarting spawning for inactive areas - players detected in world.`);
                }
            } else {
                // If no players, disable all spawning to save resources
                console.log(`[AnimalSpawner] No players detected in world, pausing all animal spawning.`);
                this.spawnAreas.forEach(area => area.stopSpawning());
            }
        }, 10000); // Check every 10 seconds
    }

    public removeEntityFromArea(entity: Entity): void {
        for (const area of this.spawnAreas) {
            area.removeEntity(entity);
        }
    }

    public cleanup(): void {
        // Clear global interval
        if (this.activationCheckInterval !== null) {
            clearInterval(this.activationCheckInterval);
            this.activationCheckInterval = null;
        }
        
        // Clean up each area
        this.spawnAreas.forEach(area => area.cleanup());
        this.spawnAreas = [];
    }
} 