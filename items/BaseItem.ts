import { World, Entity, PlayerEntity, RigidBodyType, ColliderShape, BlockType, CollisionGroup } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';
import { getItemConfig } from '../config/items';
import { ItemInstanceManager } from './ItemInstanceManager';
import type { ItemInstance } from '../types/items';

export class BaseItem {
    protected entity: Entity | null = null;
    private isBeingPickedUp = false;
    private dropTimestamp = 0;
    private droppedFromInventory = false;
    private readonly itemConfig;
    private itemInstance: ItemInstance;

    constructor(
        protected world: World,
        protected position: { x: number; y: number; z: number },
        protected playerInventories: Map<string, PlayerInventory>,
        protected itemType: string,
        itemInstance?: ItemInstance
    ) {
        this.itemConfig = getItemConfig(itemType);
        console.log(`Creating ${itemType} at position:`, position);
        
        // Use provided instance or create a new one
        if (itemInstance) {
            this.itemInstance = itemInstance;
        } else {
            this.itemInstance = ItemInstanceManager.getInstance().createItemInstance(itemType);
        }
    }

    public getItemInstance(): ItemInstance {
        return this.itemInstance;
    }

    private canBePickedUp(): boolean {
        return this.droppedFromInventory ? 
            Date.now() - this.dropTimestamp >= 400 : 
            true;
    }

    private createPickupCollider(isSensor: boolean = true) {
        const collisionGroups = {
            belongsTo: [CollisionGroup.ENTITY],
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
        if (!inventory || !inventory.hasEmptySlot()) return;

        try {
            const selectedSlot = inventory.getSelectedSlot();
            const previousItemInSelectedSlot = inventory.getItem(selectedSlot);
            
            // Zorg dat we de meest actuele durability info hebben voordat we het item toevoegen
            const syncedInstance = ItemInstanceManager.getInstance().syncInstanceDurability(this.itemInstance);
            
            // Add item with its instance to preserve durability
            const result = inventory.addItemWithInstance(syncedInstance);
            
            if (result.success && result.addedToSlot !== undefined) {
                if (result.addedToSlot === selectedSlot && previousItemInSelectedSlot !== this.itemType) {
                    const displayName = this.itemConfig.displayName || this.itemType
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    
                    // Stuur direct durability informatie mee als het item dat heeft
                    if (syncedInstance.durability !== undefined && syncedInstance.maxDurability !== undefined) {
                        const durabilityPercentage = Math.floor((syncedInstance.durability / syncedInstance.maxDurability) * 100);
                        
                        other.player.ui.sendData({
                            showItemName: { name: displayName },
                            selectedItemDurability: {
                                durability: syncedInstance.durability,
                                maxDurability: syncedInstance.maxDurability,
                                durabilityPercentage: durabilityPercentage
                            }
                        });
                    } else {
                        other.player.ui.sendData({
                            showItemName: { name: displayName }
                        });
                    }

                    inventory.selectSlot(selectedSlot);
                }
                
                // Forceer UI update voor de slot waar het item is toegevoegd
                // Update UI direct in plaats van via een privé methode
                if (syncedInstance.durability !== undefined && syncedInstance.maxDurability !== undefined) {
                    const durabilityPercentage = Math.floor((syncedInstance.durability / syncedInstance.maxDurability) * 100);
                    
                    // Gebruik de inventoryState data update om direct de UI bij te werken
                    const inventoryUpdates: any = {};
                    inventoryUpdates[`slot${result.addedToSlot}`] = {
                        type: this.itemType,
                        count: syncedInstance.count || 1,
                        durability: syncedInstance.durability,
                        maxDurability: syncedInstance.maxDurability,
                        durabilityPercentage: durabilityPercentage
                    };
                    
                    other.player.ui.sendData({
                        inventoryState: inventoryUpdates
                    });
                }
                
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

        this.entity.spawn(this.world, {
            x: this.position.x,
            y: this.position.y + 0.3,
            z: this.position.z
        });
        this.droppedFromInventory = false;
    }

    public drop(fromPosition: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, isFromBlock: boolean = false): void {
        if (!this.entity || !this.world) return;

        this.entity.despawn();
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