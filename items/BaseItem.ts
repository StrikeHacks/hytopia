import { World, Entity, PlayerEntity, RigidBodyType, ColliderShape, BlockType, CollisionGroup } from 'hytopia';
import { PlayerInventory } from '../player/PlayerInventory';

export abstract class BaseItem {
    protected entity: Entity | null = null;
    private isBeingPickedUp = false;
    private dropTimestamp = 0;

    constructor(
        protected world: World,
        protected position: { x: number; y: number; z: number },
        protected playerInventories: Map<string, PlayerInventory>,
        protected itemType: string,
        protected modelUri: string
    ) {
        console.log(`Creating ${itemType} at position:`, position);
    }

    private canBePickedUp(): boolean {
        return Date.now() - this.dropTimestamp >= 500;
    }

    private createPickupCollider(isSensor: boolean = true) {
        return {
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.2, y: 0.2, z: 0.2 },
            isSensor,
            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY],
                collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER]
            },
            onCollision: this.handlePickupCollision.bind(this)
        };
    }

    private createGroundCollider(height: number) {
        return {
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.1, y: height, z: 0.1 },
            isSensor: false,
            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY],
                collidesWith: [CollisionGroup.BLOCK]
            },
            onCollision: this.handleGroundCollision.bind(this)
        };
    }

    private handlePickupCollision(other: BlockType | Entity, started: boolean) {
        if (!started || !(other instanceof PlayerEntity) || this.isBeingPickedUp || !this.entity) return;
        
        if (!this.canBePickedUp()) return;

        const inventory = this.playerInventories.get(String(other.player.id));
        if (!inventory) {
            console.log('[BaseItem] No inventory found for player');
            return;
        }

        if (!inventory.hasEmptySlot()) {
            console.log('[BaseItem] No empty slots available in inventory');
            return;
        }

        this.isBeingPickedUp = true;

        if (inventory.addItem(this.itemType)) {
            console.log(`[BaseItem] Successfully added ${this.itemType} to inventory`);
            this.entity.despawn();
            this.entity = null;
        } else {
            console.log(`[BaseItem] Failed to add ${this.itemType} to inventory`);
            this.isBeingPickedUp = false;
        }
    }

    private handleGroundCollision(other: BlockType | Entity, started: boolean) {
        if (other instanceof PlayerEntity) return;
        
        if (started && this.entity) {
            this.entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
        }
    }

    public spawn(): void {
        if (this.entity) {
            console.log(`${this.itemType} already spawned`);
            return;
        }
        
        const isSword = this.itemType.includes('sword');
        const physicsColliderHeight = isSword ? 0.5 : 0.3;
        
        this.entity = new Entity({
            name: this.itemType,
            modelUri: this.modelUri,
            modelScale: 0.5,
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_VELOCITY,
                colliders: [
                    this.createPickupCollider(),
                    this.createGroundCollider(physicsColliderHeight)
                ]
            }
        });

        const spawnPos = {
            x: this.position.x,
            y: this.position.y + 0.3,
            z: this.position.z
        };

        this.entity.spawn(this.world, spawnPos);
    }

    public drop(fromPosition: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }): void {
        if (!this.entity || !this.world) {
            console.log('Cannot drop - entity or world is null');
            return;
        }

        this.entity.despawn();
        this.dropTimestamp = Date.now();
        
        const isSword = this.itemType.includes('sword');
        const spawnHeight = isSword ? 0.5 : 0.3;
        const physicsColliderHeight = isSword ? 0.5 : 0.3;
        const horizontalForce = isSword ? 0.6 : 0.4;
        const verticalForce = isSword ? 0.15 : 0.1;
        
        this.entity = new Entity({
            name: this.itemType,
            modelUri: this.modelUri,
            modelScale: 0.5,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                enabledRotations: { x: false, y: true, z: false },
                linearDamping: 0.8,
                colliders: [
                    this.createPickupCollider(),
                    this.createGroundCollider(physicsColliderHeight)
                ]
            }
        });

        const dropPos = {
            x: fromPosition.x + direction.x * 0.3,
            y: fromPosition.y + spawnHeight,
            z: fromPosition.z + direction.z * 0.3
        };

        this.entity.spawn(this.world, dropPos);

        setTimeout(() => {
            if (this.entity) {
                this.entity.applyImpulse({
                    x: direction.x * horizontalForce,
                    y: verticalForce,
                    z: direction.z * horizontalForce
                });
            }
        }, 0);
    }
} 