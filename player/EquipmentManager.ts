import { PlayerEntity, Entity, RigidBodyType } from 'hytopia';

export class EquipmentManager {
    private currentItem: string | null = null;
    private equippedEntity: Entity | null = null;

    constructor(private playerEntity: PlayerEntity) {}

    public equipItem(itemType: string) {
        // Unequip current item first
        this.unequipItem();

        const world = this.playerEntity.world;
        if (!world) return;

        console.log('[EquipmentManager] Equipping item:', itemType);

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

        // Spawn the item in the player's hand
        this.equippedEntity.spawn(
            world,
            { x: 0, y: 0.3, z: 0.5 },
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