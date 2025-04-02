import { Entity, World, PlayerEntity, RigidBodyType, ColliderShape, EntityEvent, BlockType, Quaternion, SceneUI, CollisionGroup } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import type { NPCConfig } from '../../config/npcs';
import { Collider } from 'hytopia';

export abstract class BaseNPC {
    protected entity: Entity;
    protected world: World;
    protected config: NPCConfig;

    constructor(world: World, config: NPCConfig) {
        this.world = world;
        this.config = config;
        this.entity = this.createEntity();
        this.setupInteraction();
    }

    protected createEntity(): Entity {
        const npc = new Entity({
            name: this.config.name,
            modelUri: this.config.modelUri,
            modelScale: this.config.modelScale ?? 1,
            modelLoopedAnimations: this.config.animations?.idle ?? ['idle'],
            rigidBodyOptions: {
                type: RigidBodyType.FIXED,
                colliders: [
                    Collider.optionsFromModelUri(this.config.modelUri, this.config.modelScale ?? 1)
                ]
            }
        });

        npc.spawn(this.world, this.config.position);

        // Add name display above NPC
        const nameDisplay = new SceneUI({
            templateId: 'entity-name',
            attachedToEntity: npc,
            state: { name: this.config.name },
            offset: { x: 0, y: 1.5, z: 0 }
        });
        nameDisplay.load(this.world);

        if (this.config.rotation) {
            // Convert degrees to radians
            const yawRad = (this.config.rotation.y * Math.PI) / 180;
            
            // Create quaternion for Y rotation using half-angle formula
            const halfYaw = yawRad / 2;
            const quaternion = {
                x: 0,
                y: Math.sin(halfYaw),
                z: 0,
                w: Math.cos(halfYaw)
            };
            
            npc.setRotation(quaternion);
        }

        return npc;
    }

    protected setupInteraction(): void {
        // Create interaction sensor for E key interaction

        // Add interaction handler for right mouse button
        this.world.on(EntityEvent.TICK, () => {
            const players = this.world.entityManager.getEntitiesByTag('player')
                .filter(e => e instanceof PlayerEntity) as PlayerEntity[];

            for (const playerEntity of players) {
                const player = playerEntity.player;
                
                // Check for right mouse button
                if (player.input.rightMouse) {
                    const direction = player.camera.facingDirection;
                    const origin = {
                        x: playerEntity.position.x,
                        y: playerEntity.position.y + player.camera.offset.y,
                        z: playerEntity.position.z
                    };

                    // Cast a ray to detect what's in front of the player
                    const raycastResult = this.world.simulation.raycast(origin, direction, 5, {
                        filterExcludeRigidBody: playerEntity.rawRigidBody
                    });

                    if (raycastResult?.hitEntity === this.entity) {
                        console.log(`Hit ${this.config.name} with right click!`);
                    }

                    player.input.rightMouse = false;
                }
                
                // Check for E key interaction when in range
                if (player.input.e && this.getDistance(playerEntity.position, this.entity.position) <= 1.5) {
                    // Play interaction animation if configured
                    if (this.config.animations?.interact) {
                        // Stop idle animations first
                        if (this.config.animations.idle) {
                            this.entity.stopModelAnimations(this.config.animations.idle);
                        }
                        // Play interaction animation
                        this.entity.startModelOneshotAnimations(this.config.animations.interact);
                        // Resume idle animations after interaction
                        setTimeout(() => {
                            if (this.config.animations?.idle) {
                                this.entity.startModelLoopedAnimations(this.config.animations.idle);
                            }
                        }, 1000); // Adjust timing based on animation length
                    }
                    
                    this.onInteract(playerEntity);
                    player.input.e = false;
                }
            }
        });
    }

    protected onPlayerEnterRange(player: PlayerEntity): void {
        this.world.chatManager.sendBroadcastMessage(`Press 'E' to talk to ${this.config.name}`);
    }

    protected abstract onInteract(player: PlayerEntity): void;

    public despawn(): void {
        this.entity.despawn();
    }

    private getDistance(pos1: Vector3Like, pos2: Vector3Like): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
} 