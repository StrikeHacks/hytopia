import { Entity, Quaternion, RigidBodyType, World, PathfindingEntityController, ColliderShape, CollisionGroup } from 'hytopia';
import type { SpawnAreaConfig, AnimalConfig } from '../config/spawners';
import { animalConfigs } from '../config/spawners';
import { AnimalManager } from './AnimalManager';
import { GameManager } from './GameManager';
import { EntityEvent } from 'hytopia';

// Helper class voor een spawn gebied
class SpawnArea {
    private spawnedEntities: Entity[] = [];
    private spawnTimer: ReturnType<typeof setInterval> | null = null;
    private animalConfig: AnimalConfig;

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

        if (this.config.enabled) {
            this.startSpawning();
        }
    }

    public startSpawning(): void {
        if (this.spawnTimer !== null) {
            clearInterval(this.spawnTimer);
        }

        // Use a longer spawn interval for better performance
        const optimizedInterval = Math.max(this.config.spawnInterval, 8000);
        
        this.spawnTimer = setInterval(() => {
            // Only try to spawn if players are nearby
            if (this.world.entityManager.getAllPlayerEntities().length > 0) {
                this.trySpawnAnimal();
            }
        }, optimizedInterval);
    }

    public stopSpawning(): void {
        if (this.spawnTimer !== null) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    public cleanup(): void {
        this.stopSpawning();
        
        for (const entity of this.spawnedEntities) {
            if (entity.isSpawned) {
                entity.despawn();
            }
        }
        
        this.spawnedEntities = [];
    }

    private trySpawnAnimal(): void {
        if (this.spawnedEntities.length >= this.config.maxEntities) {
            return;
        }

        if (Math.random() > this.config.spawnChance) {
            return;
        }

        const position = this.getRandomPositionInArea();
        if (!position) {
            return;
        }

        if (!this.isPositionValid(position)) {
            return;
        }

        this.spawnAnimal(position);
    }

    public spawnAnimal(position: { x: number, y: number, z: number }): void {
        const modelLoopedAnimations: string[] = [];
        
        const idleAnim = this.animalConfig.animations.find(a => a.name === 'idle');
        if (idleAnim) {
            modelLoopedAnimations.push(idleAnim.name);
        }

        // Willekeurige startrotatie tussen 0 en 360 graden
        const randomRotation = Math.random() * 360;

        const entity = new Entity({
            name: `${this.config.animalType}_${Date.now()}`,
            modelUri: this.animalConfig.modelUri,
            modelScale: this.animalConfig.modelScale,
            modelLoopedAnimations,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                additionalMass: this.animalConfig.mass,
                gravityScale: 1.2,  // Verlaagd voor hogere en consistentere sprongen
                enabledRotations: { x: false, y: true, z: false },
                enabledPositions: { x: true, y: true, z: true },
            }
        });

        // Add pathfinding controller
        const pathfinder = new PathfindingEntityController();
        entity.setController(pathfinder);

        entity.spawn(this.world, position);

        // Set collision groups right after spawning to prevent collision with players
        entity.setCollisionGroupsForSolidColliders({
            belongsTo: [CollisionGroup.ENTITY],
            collidesWith: [CollisionGroup.BLOCK]  // Only collide with blocks, not with players or other entities
        });

        // Stel de willekeurige rotatie in direct na het spawnen
        entity.setRotation(Quaternion.fromEuler(0, randomRotation, 0));
        
        // Register the animal with the AnimalManager
        const animalManager = this.gameManager.getAnimalManager();
        animalManager.registerAnimal(entity);

        // Add despawn listener to unregister from AnimalManager
        entity.on(EntityEvent.DESPAWN, () => {
            if (entity.id) {
                animalManager.unregisterAnimal(entity.id);
            }
        });

        this.addAnimalBehavior(entity);
        this.spawnedEntities.push(entity);
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

    private getRandomPositionInArea(): { x: number, y: number, z: number } | null {
        if (!this.config.corners || this.config.corners.length < 3) {
            return null;
        }

        const corners = this.config.corners;
        let minX = Math.min(...corners.map(c => c.x));
        let maxX = Math.max(...corners.map(c => c.x));
        let minZ = Math.min(...corners.map(c => c.z));
        let maxZ = Math.max(...corners.map(c => c.z));

        const buffer = 0.5;
        minX += buffer;
        maxX -= buffer;
        minZ += buffer;
        maxZ -= buffer;

        // Maximum height to start searching for ground
        const maxY = Math.max(...corners.map(c => c.y)) + 10;

        // Limit raycast attempts for better performance
        for (let i = 0; i < 5; i++) {
            const x = minX + Math.random() * (maxX - minX);
            const z = minZ + Math.random() * (maxZ - minZ);
            
            // Raycast from above to find the ground
            const raycastResult = this.world.simulation.raycast(
                { x, y: maxY, z },
                { x: 0, y: -1, z: 0 },
                maxY + 10
            );

            if (raycastResult?.hitBlock) {
                // Spawn just above the ground
                const position = {
                    x,
                    y: raycastResult.hitPoint.y + 0.5, // 0.5 blocks above ground
                    z
                };

                if (this.isPositionInArea(position)) {
                    return position;
                }
            }
        }

        return null;
    }

    private addAnimalBehavior(entity: Entity): void {
        // Use a longer movement interval for better performance
        const movementInterval = 3000 + Math.floor(Math.random() * 3000);
        const controller = entity.controller as PathfindingEntityController;
        
        const intervalId = setInterval(() => {
            if (!entity.isSpawned) {
                clearInterval(intervalId);
                return;
            }

            // Reduce movement frequency
            if (Math.random() > 0.5) {
                return;
            }

            const currentPos = entity.position;
            const moveDistance = 4 + Math.random() * 3; // Reduced movement distance
            const angle = Math.random() * Math.PI * 2;
            
            const newX = currentPos.x + Math.cos(angle) * moveDistance;
            const newZ = currentPos.z + Math.sin(angle) * moveDistance;
            
            const newPos = { x: newX, y: currentPos.y, z: newZ };
            if (!this.isPositionInArea(newPos)) {
                return;
            }

            // Use pathfinding to move to the new position
            const walkAnim = this.animalConfig.animations.find(a => a.name === 'walk')?.name;
            const idleAnim = this.animalConfig.animations.find(a => a.name === 'idle')?.name;

            // Start with idle animation
            if (idleAnim && !entity.modelLoopedAnimations.has(idleAnim)) {
                entity.startModelLoopedAnimations([idleAnim]);
            }

            controller.pathfind(newPos, 3, {
                maxJump: 2,
                maxFall: 2,
                verticalPenalty: 0,
                waypointTimeoutMs: 3000, // More time for jumps
                maxOpenSetIterations: 200, // Reduced for better performance
                waypointMoveCompleteCallback: (waypoint, index) => {
                    // Switch to walk animation when moving between waypoints
                    if (walkAnim && idleAnim) {
                        entity.stopModelAnimations([idleAnim]);
                        entity.startModelLoopedAnimations([walkAnim]);
                    }

                    // Calculate direction to next waypoint and face that way
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

        }, movementInterval);
    }

    private isPositionInArea(position: { x: number, y: number, z: number }): boolean {
        const { corners } = this.config;
        if (corners.length < 3) return false;
        
        const minX = Math.min(...corners.map(c => c.x));
        const maxX = Math.max(...corners.map(c => c.x));
        const minZ = Math.min(...corners.map(c => c.z));
        const maxZ = Math.max(...corners.map(c => c.z));
        
        return position.x >= minX && position.x <= maxX && 
               position.z >= minZ && position.z <= maxZ;
    }

    public removeEntity(entity: Entity): void {
        const index = this.spawnedEntities.indexOf(entity);
        if (index !== -1) {
            this.spawnedEntities.splice(index, 1);
            console.log(`[SpawnArea] Entity removed, current count: ${this.spawnedEntities.length}/${this.config.maxEntities}`);
        }
    }
}

export class AnimalSpawner {
    private spawnAreas: SpawnArea[] = [];

    constructor(
        private world: World,
        private gameManager: GameManager,
        spawnConfigs: SpawnAreaConfig[]
    ) {
        spawnConfigs.forEach(config => {
            const spawnArea = new SpawnArea(world, config, gameManager);
            this.spawnAreas.push(spawnArea);
        });
        
        console.log(`[AnimalSpawner] Initialized with ${this.spawnAreas.length} spawn areas`);
    }

    public removeEntityFromArea(entity: Entity): void {
        for (const area of this.spawnAreas) {
            area.removeEntity(entity);
        }
    }

    public cleanup(): void {
        this.spawnAreas.forEach(area => area.cleanup());
        this.spawnAreas = [];
    }
} 