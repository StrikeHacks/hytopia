import { World, Entity, PlayerEntity, RigidBodyType, ColliderShape, BlockType, CollisionGroup } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { getItemConfig } from '../config/items';
import { ItemInstanceManager } from './ItemInstanceManager';
import type { ItemInstance } from '../types/items';
import type { ItemSpawner } from '../managers/ItemSpawner';

export class BaseItem {
    protected entity: Entity | null = null; // Main entity for physics and pickup
    private visualEntities: Entity[] = []; // Child entities for visual stacking
    private isBeingPickedUp = false;
    private dropTimestamp = 0;
    private droppedFromInventory = false;
    private readonly itemConfig;
    private itemInstance: ItemInstance;
    private stackCount: number = 1;
    protected itemSpawner: ItemSpawner;

    constructor(
        protected world: World,
        protected position: { x: number; y: number; z: number },
        protected playerInventories: Map<string, PlayerInventory>,
        protected itemType: string,
        itemSpawner: ItemSpawner,
        itemInstance?: ItemInstance,
        stackCount: number = 1
    ) {
        this.itemSpawner = itemSpawner;
        this.itemConfig = getItemConfig(itemType);
        this.stackCount = stackCount;
        
        if (itemInstance) {
            this.itemInstance = itemInstance;
            this.itemInstance.count = this.stackCount;
        } else {
            this.itemInstance = ItemInstanceManager.getInstance().createItemInstance(itemType, stackCount);
        }
    }

    public getItemInstance(): ItemInstance {
        return this.itemInstance;
    }

    public getStackCount(): number {
        return this.stackCount;
    }

    public setStackCount(count: number): void {
        if (count <= 0) {
            console.warn(`[BaseItem] Attempted to set stack count to ${count}, using 1 instead`);
            this.stackCount = 1;
        } else {
            this.stackCount = count;
            this.itemInstance.count = count;
            this.updateVisualStack(); // Update visual representation
        }
    }

    public increaseStackCount(amount: number = 1): void {
        this.stackCount += amount;
        this.itemInstance.count = this.stackCount;
        this.updateVisualStack(); // Update visual representation
    }

    // Method to update the visual stack based on count
    private updateVisualStack(): void {
        if (!this.entity || !this.entity.isSpawned) return;

        let targetVisualCount = 0;
        if (this.stackCount >= 64) {
            targetVisualCount = 3;
        } else if (this.stackCount >= 32) {
            targetVisualCount = 2;
        } else if (this.stackCount >= 2) {
            targetVisualCount = 1;
        }
        
        // Add or remove visual entities
        while (this.visualEntities.length < targetVisualCount) {
            // Add a new visual entity
            const visualEntity = new Entity({
                name: `${this.itemType}_visual_${this.visualEntities.length}`,
                modelUri: this.itemConfig.modelUri,
                modelScale: 1, // Always use scale 1 for visual entities
                parent: this.entity, // Attach to the main entity
            });

            // Spawn at the parent's origin (0, 0, 0 offset)
            visualEntity.spawn(this.world, { x: 0, y: 0, z: 0 });
            this.visualEntities.push(visualEntity);
        }

        while (this.visualEntities.length > targetVisualCount) {
            // Remove the last visual entity
            const entityToRemove = this.visualEntities.pop();
            if (entityToRemove && entityToRemove.isSpawned) {
                entityToRemove.despawn();
            }
        }
    }

    // Method to try merging with nearby items
    public tryMergeWithNearbyItems(radius: number = 1): boolean {
        if (!this.entity || !this.entity.isSpawned) return false;

        // Get max stack size for this item type, default to 1 if not defined or non-stackable category
        const maxStackSize = (this.itemConfig.maxStackSize && this.itemConfig.category !== 'tool' && this.itemConfig.category !== 'tools' && this.itemConfig.category !== 'weapon' && this.itemConfig.category !== 'weapons' && this.itemConfig.category !== 'armor') ? this.itemConfig.maxStackSize : 1;

        // If this item is already full or non-stackable, it cannot accept more items
        if (this.stackCount >= maxStackSize) return false;

        const currentPosition = this.entity.position;
        const radiusSquared = radius * radius;
        let merged = false;

        const activeItemsOfType = this.itemSpawner.getActiveItems().get(this.itemType) || [];

        for (const otherItem of activeItemsOfType) {
            // Skip self, non-spawned items, or items that are already full stacks themselves
            if (otherItem === this || !otherItem.entity || !otherItem.entity.isSpawned || otherItem.getStackCount() >= maxStackSize) {
                continue;
            }

            const otherPosition = otherItem.entity.position;
            const dx = currentPosition.x - otherPosition.x;
            const dy = currentPosition.y - otherPosition.y; 
            const dz = currentPosition.z - otherPosition.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;

            if (distanceSquared <= radiusSquared) {
                // Calculate how many items can be added to the current stack
                const remainingCapacity = maxStackSize - this.stackCount;
                if (remainingCapacity <= 0) { // Double check, should have been caught earlier
                    continue; 
                }

                const otherItemStackCount = otherItem.getStackCount();
                const amountToTake = Math.min(otherItemStackCount, remainingCapacity);

                if (amountToTake > 0) {
                    // Increase current stack
                    this.increaseStackCount(amountToTake);

                    // Decrease or remove the other stack
                    if (amountToTake < otherItemStackCount) {
                        // Only took some items, update the other stack's count
                        otherItem.setStackCount(otherItemStackCount - amountToTake);
                        console.log(`[BaseItem] Took ${amountToTake}x ${this.itemType} from nearby stack. Other stack now has ${otherItem.getStackCount()}. This stack has ${this.stackCount}.`);
                    } else {
                        // Took all items, remove the other stack completely
                        this.itemSpawner.removeActiveItem(otherItem);
                        otherItem.despawn(); 
                        console.log(`[BaseItem] Merged entire nearby stack (${amountToTake}x ${this.itemType}). This stack now has ${this.stackCount}.`);
                    }
                    
                    merged = true;
                    // Break after one successful merge attempt per check
                    break; 
                }
            }
        }
        return merged;
    }

    private canBePickedUp(): boolean {
        return this.droppedFromInventory ? 
            Date.now() - this.dropTimestamp >= 400 : 
            true;
    }

    private createPickupCollider(isSensor: boolean = true) {
        const collisionGroups = {
            belongsTo: [CollisionGroup.ENTITY, CollisionGroup.ENTITY_SENSOR],
            collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER]
        };

        return {
            shape: ColliderShape.BLOCK,
            halfExtents: this.itemConfig.colliderSize || { x: 0.2, y: 0.2, z: 0.2 },
            isSensor,
            collisionGroups,
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
        if (!started || !(other instanceof PlayerEntity) || !this.entity || !this.canBePickedUp()) return;

        const inventory = this.playerInventories.get(String(other.player.id));
        if (!inventory) return;

        try {
            const syncedInstance = ItemInstanceManager.getInstance().syncInstanceDurability(this.itemInstance);
            syncedInstance.count = this.stackCount;
            
            const result = inventory.addItemWithInstance(syncedInstance);
            
            if (result.success && result.addedToSlot !== undefined) {
                this.itemSpawner.removeActiveItem(this);
                this.despawn();
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

        this.entity.spawn(this.world, {
            x: this.position.x,
            y: this.position.y + 0.3,
            z: this.position.z
        });
        this.droppedFromInventory = false;
        // Initial visual stack update
        this.updateVisualStack(); 
    }

    public drop(fromPosition: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, isFromBlock: boolean = false): void {
        // Despawn existing entity and visuals first
        this.despawn(); 
        
        this.dropTimestamp = Date.now();
        this.droppedFromInventory = !isFromBlock;
        
        const dropForce = this.itemConfig.dropForce || { horizontal: 0.4, vertical: 0.1 };
        const colliderSize = this.itemConfig.colliderSize || { x: 0.2, y: 0.2, z: 0.2 };
        
        const dropPos = {
            x: fromPosition.x + direction.x * 0.3,
            y: fromPosition.y + colliderSize.y,
            z: fromPosition.z + direction.z * 0.3
        };

        const directionMagnitude = Math.sqrt(direction.x * direction.x + direction.z * direction.z) || 1;
        const normalizedDirection = {
            x: direction.x / directionMagnitude,
            y: direction.y,
            z: direction.z / directionMagnitude
        };
        
        const impulse = {
            x: normalizedDirection.x * dropForce.horizontal,
            y: dropForce.vertical,
            z: normalizedDirection.z * dropForce.horizontal
        };

        // Create the main physics entity
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

        // Update visual stack after main entity is spawned
        this.updateVisualStack();

        // Try to merge after a short delay
        setTimeout(() => {
            if (this.entity && this.entity.isSpawned) {
                this.tryMergeWithNearbyItems();
            }
        }, 300); 
    }

    public despawn(): void {
        // Despawn visual entities first
        this.visualEntities.forEach(visual => {
            if (visual.isSpawned) {
                visual.despawn();
            }
        });
        this.visualEntities = []; // Clear the array
        
        // Despawn the main entity
        if (this.entity) {
            this.entity.despawn();
            this.entity = null;
        }
    }
} 