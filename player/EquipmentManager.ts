import { PlayerEntity, Entity, RigidBodyType } from 'hytopia';
import { getItemConfig, DEFAULT_HAND_OFFSET, DEFAULT_HAND_ROTATION } from '../config/items';

export class EquipmentManager {
    private currentItem: string | null = null;
    private equippedEntity: Entity | null = null;

    constructor(private playerEntity: PlayerEntity) {}

    public equipItem(itemType: string) {
        // Unequip current item first
        this.unequipItem();

        const world = this.playerEntity.world;
        if (!world) return;

        // Get the item configuration to access its hand offset
        const itemConfig = getItemConfig(itemType);
        
        // Create the equipped item
        this.equippedEntity = new Entity({
            name: itemType,
            modelUri: `models/items/${itemType}.gltf`,
            parent: this.playerEntity,
            parentNodeName: 'hand_right_weapon_anchor',
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_VELOCITY,
                colliders: []
            }
        });

        // Use the item-specific hand offset or the default if not specified
        const positionOffset = itemConfig.handOffset || DEFAULT_HAND_OFFSET;
        
        // Use the item-specific rotation or the default if not specified
        const rotation = itemConfig.handRotation || DEFAULT_HAND_ROTATION;
        
        this.equippedEntity.spawn(
            world,
            positionOffset, // Apply the item-specific position offset
            rotation // Apply the item-specific rotation
        );
        this.currentItem = itemType;
    }

    public unequipItem() {
        if (this.equippedEntity) {
            this.equippedEntity.despawn();
            this.equippedEntity = null;
        }
        this.currentItem = null;
    }

    public getCurrentItem(): string | null {
        return this.currentItem;
    }
} 