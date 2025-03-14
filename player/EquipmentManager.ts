import { PlayerEntity, Entity, RigidBodyType } from 'hytopia';
import { getItemConfig, DEFAULT_HAND_OFFSET } from '../config/items';

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
        
        this.equippedEntity.spawn(
            world,
            positionOffset, // Apply the item-specific position offset
            { x: -Math.PI / 3, y: 0, z: 0, w: 1 }
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