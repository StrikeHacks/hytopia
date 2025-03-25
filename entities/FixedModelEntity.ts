import { World, Entity, RigidBodyType, ColliderShape, CollisionGroup } from 'hytopia';
import type { Vector3Like } from 'hytopia';

export interface FixedModelConfig {
    id: string;
    name: string;
    modelUri: string;
    modelScale?: number;
    colliderSize?: {
        x: number;
        y: number;
        z: number;
    };
    allowYMovement?: boolean; // Whether the entity can move in the Y direction (fall)
    rotation?: number; // Rotation around the Y axis in radians
}

/**
 * FixedModelEntity represents a static model in the world that acts like a block.
 * It cannot be picked up or moved (except possibly falling if allowYMovement is true).
 */
export class FixedModelEntity extends Entity {
    private config: FixedModelConfig;
    
    constructor(config: FixedModelConfig) {
        super({
            name: config.id,
            modelUri: config.modelUri,
            modelScale: config.modelScale || 1.0,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC, // DYNAMIC to allow falling if needed
                enabledRotations: { x: false, y: false, z: false }, // Prevent rotation in all axes
                enabledPositions: { 
                    x: false, 
                    y: config.allowYMovement || false, 
                    z: false 
                }, // Only allow Y movement if specified
                additionalMass: 100, // Heavy mass to prevent easy movement
                colliders: [
                    {
                        shape: ColliderShape.BLOCK,
                        halfExtents: config.colliderSize || { x: 0.5, y: 0.5, z: 0.5 },
                        collisionGroups: {
                            belongsTo: [CollisionGroup.BLOCK],
                            collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER]
                        }
                    }
                ]
            }
        });
        
        this.config = config;
    }
    
    /**
     * Place the fixed model in the world at the specified position
     */
    public place(world: World, position: Vector3Like): void {
        console.log(`[FixedModelEntity] Attempting to spawn ${this.config.id} at:`, position);
        
        // Create with a larger scale to ensure visibility
        this.spawn(world, {
            x: position.x,
            y: position.y + 0.5, // Raise it a bit to ensure it's not in the ground
            z: position.z
        });
        
        console.log(`[FixedModelEntity] After spawn, position is:`, this.position);
        
        // Apply rotation if specified
        if (this.config.rotation !== undefined) {
            this.rotateY(this.config.rotation);
            console.log(`[FixedModelEntity] Applied Y-axis rotation:`, this.config.rotation);
        }
        
        // After spawning, make sure it's properly locked in place
        setTimeout(() => {
            if (this.isSpawned) {
                console.log(`[FixedModelEntity] Entity is still spawned after timeout`);
                // Reset velocity to zero
                this.setLinearVelocity({ x: 0, y: 0, z: 0 });
                this.setAngularVelocity({ x: 0, y: 0, z: 0 });
                
                // If we don't want it to move in Y either, switch to FIXED type
                if (!this.config.allowYMovement) {
                    if (this.rawRigidBody) {
                        this.rawRigidBody.setBodyType(RigidBodyType.FIXED);
                        console.log(`[FixedModelEntity] Set to FIXED type:`, this.position);
                    }
                }
            } else {
                console.error(`[FixedModelEntity] Entity was despawned during setup!`);
            }
        }, 200); // Small delay to ensure physics has initialized
    }
    
    /**
     * Set the rotation of the model around the Y axis
     * @param radians Rotation angle in radians
     */
    public rotateY(radians: number): void {
        // Create a quaternion from the Y-axis rotation angle
        const halfAngle = radians / 2;
        const quaternion = {
            x: 0,
            y: Math.sin(halfAngle),
            z: 0,
            w: Math.cos(halfAngle)
        };
        
        this.setRotation(quaternion);
        
        if (this.config) {
            this.config.rotation = radians;
        }
    }
} 