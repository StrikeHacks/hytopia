import { World, Entity, PlayerEntity, RigidBodyType, ColliderShape, BlockType, CollisionGroup } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { getItemConfig } from '../config/items';

export class BaseItem {
    protected entity: Entity | null = null;
    private isBeingPickedUp = false;
    private dropTimestamp = 0;
    private itemConfig;

    constructor(
        protected world: World,
        protected position: { x: number; y: number; z: number },
        protected playerInventories: Map<string, PlayerInventory>,
        protected itemType: string
    ) {
        this.itemConfig = getItemConfig(itemType);
        console.log(`Creating ${itemType} at position:`, position);
    }

    private canBePickedUp(): boolean {
        return Date.now() - this.dropTimestamp >= 400;
    }

    private createPickupCollider(isSensor: boolean = true) {
        const collisionGroups = {
            belongsTo: [CollisionGroup.ENTITY],
            collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER]
        };

        const size = this.itemConfig.colliderSize || { x: 0.2, y: 0.2, z: 0.2 };

        return {
            shape: ColliderShape.BLOCK,
            halfExtents: size,
            isSensor,
            collisionGroups,
            onCollision: this.handlePickupCollision.bind(this)
        };
    }

    private createGroundCollider(height: number) {
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
            // Get the selected slot before adding the item
            const selectedSlot = inventory.getSelectedSlot();
            const previousItemInSelectedSlot = inventory.getItem(selectedSlot);
            
            // Add item to inventory and get the slot it was added to
            const result = inventory.addItem(this.itemType);
            
            if (result.success && result.addedToSlot !== undefined) {
                // Only show item name if it was added to the selected slot AND
                // the slot was either empty or had a different item type
                if (result.addedToSlot === selectedSlot && previousItemInSelectedSlot !== this.itemType) {
                    const displayName = this.itemConfig.displayName || this.itemType
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    
                    other.player.ui.sendData({
                        showItemName: {
                            name: displayName
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
            modelUri: this.itemConfig.modelUri,
            modelScale: this.itemConfig.scale || 0.5,
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
        
        const dropForce = this.itemConfig.dropForce || { horizontal: 0.4, vertical: 0.1 };
        const colliderSize = this.itemConfig.colliderSize || { x: 0.2, y: 0.2, z: 0.2 };
        
        const dropPos = {
            x: fromPosition.x + direction.x * 0.3,
            y: fromPosition.y + colliderSize.y,
            z: fromPosition.z + direction.z * 0.3
        };

        const impulse = {
            x: direction.x * dropForce.horizontal,
            y: dropForce.vertical,
            z: direction.z * dropForce.horizontal
        };

        this.entity = new Entity({
            name: this.itemType,
            modelUri: this.itemConfig.modelUri,
            modelScale: this.itemConfig.scale || 0.5,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                enabledRotations: { x: false, y: true, z: false },
                linearDamping: 0.8,
                colliders: [
                    this.createPickupCollider(),
                    this.createGroundCollider(colliderSize.y)
                ]
            }
        });

        this.entity.spawn(this.world, dropPos);
        this.entity.applyImpulse(impulse);
    }

    public despawn(): void {
        if (this.entity) {
            this.entity.despawn();
            this.entity = null;
        }
    }
} 