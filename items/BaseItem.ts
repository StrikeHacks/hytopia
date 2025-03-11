import { World, Entity, PlayerEntity, RigidBodyType, ColliderShape, BlockType, CollisionGroup } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';

export abstract class BaseItem {
    protected entity: Entity | null = null;
    private isBeingPickedUp = false;
    private dropTimestamp = 0;
    private itemCount = 1;  // Default to 1 item per entity

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
        return Date.now() - this.dropTimestamp >= 400;
    }

    private createPickupCollider(isSensor: boolean = true) {
        // Cache collision groups for better performance
        const collisionGroups = {
            belongsTo: [CollisionGroup.ENTITY],
            collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER]
        };

        return {
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.2, y: 0.2, z: 0.2 },
            isSensor,
            collisionGroups,
            onCollision: this.handlePickupCollision.bind(this)
        };
    }

    private createGroundCollider(height: number) {
        // Cache collision groups for better performance
        const collisionGroups = {
            belongsTo: [CollisionGroup.ENTITY],
            collidesWith: [CollisionGroup.BLOCK]
        };

        return {
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.1, y: height, z: 0.1 },
            isSensor: false,
            collisionGroups,
            onCollision: this.handleGroundCollision.bind(this)
        };
    }

    private handlePickupCollision(other: BlockType | Entity, started: boolean) {
        if (!started || !(other instanceof PlayerEntity) || !this.entity) return;
        if (!this.canBePickedUp()) return;

        const inventory = this.playerInventories.get(String(other.player.id));
        if (!inventory) return;

        if (!inventory.hasEmptySlot()) return;

        try {
            // Add item to inventory first
            const success = inventory.addItem(this.itemType);
            
            if (success) {
                // Only show item name and refresh if it was added to the selected slot
                const selectedSlot = inventory.getSelectedSlot();
                if (inventory.getItem(selectedSlot) === this.itemType) {
                    // Show item name only when picked up into selected slot
                    const formattedName = this.itemType
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    
                    other.player.ui.sendData({
                        showItemName: {
                            name: formattedName
                        }
                    });

                    // Re-select the slot to trigger a refresh
                    inventory.selectSlot(selectedSlot);
                }
                
                // Only despawn after successful inventory update
                this.entity.despawn();
                this.entity = null;
            }
        } catch (error) {
            console.error('[BaseItem] Error during pickup:', error);
        }
    }

    private handleGroundCollision(other: BlockType | Entity, started: boolean) {
        if (!started || other instanceof PlayerEntity || !this.entity) return;
        this.entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
    }

    public spawn(): void {
        if (this.entity) return;
        
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
        if (!this.entity || !this.world) return;

        this.entity.despawn();
        this.dropTimestamp = Date.now();
        
        const isSword = this.itemType.includes('sword');
        const spawnHeight = isSword ? 0.5 : 0.3;
        const physicsColliderHeight = isSword ? 0.5 : 0.3;
        const horizontalForce = isSword ? 0.6 : 0.4;
        const verticalForce = isSword ? 0.15 : 0.1;
        
        // Cache collision groups and other repeated values
        const dropPos = {
            x: fromPosition.x + direction.x * 0.3,
            y: fromPosition.y + spawnHeight,
            z: fromPosition.z + direction.z * 0.3
        };

        const impulse = {
            x: direction.x * horizontalForce,
            y: verticalForce,
            z: direction.z * horizontalForce
        };

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

        this.entity.spawn(this.world, dropPos);
        
        // Apply impulse immediately instead of using setTimeout
        this.entity.applyImpulse(impulse);
    }
} 