import { PlayerEntity, Entity, RigidBodyType } from 'hytopia';

/**
 * Manages the position of the player's arms by creating custom entities
 * that attach to the player's arm nodes.
 */
export class ArmPositionManager {
    private rightArmEntity: Entity | null = null;
    private leftArmEntity: Entity | null = null;
    private rightArmOffset = { x: 0, y: 0.1, z: 0 }; // Default offset to move arm up slightly
    private leftArmOffset = { x: 0, y: 0.1, z: 0 }; // Default offset to move arm up slightly

    constructor(private playerEntity: PlayerEntity) {}

    /**
     * Adjusts the position of the player's right arm
     * @param offset The position offset to apply to the arm
     */
    public adjustRightArm(offset?: { x: number, y: number, z: number }): void {
        if (offset) {
            this.rightArmOffset = offset;
        }

        // Remove existing arm entity if any
        if (this.rightArmEntity) {
            this.rightArmEntity.despawn();
            this.rightArmEntity = null;
        }

        const world = this.playerEntity.world;
        if (!world) return;

        // Create a new entity that will be attached to the arm_right node
        // This entity will serve as a new parent for the hand and weapon
        this.rightArmEntity = new Entity({
            name: 'right_arm_adjuster',
            parent: this.playerEntity,
            parentNodeName: 'arm_right',
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_VELOCITY,
                colliders: []
            }
        });

        // Spawn the entity with the specified offset
        this.rightArmEntity.spawn(
            world,
            this.rightArmOffset,
            { x: 0, y: 0, z: 0, w: 1 } // No rotation
        );

        console.log(`[ArmPositionManager] Right arm position adjusted to:`, this.rightArmOffset);
    }

    /**
     * Adjusts the position of the player's left arm
     * @param offset The position offset to apply to the arm
     */
    public adjustLeftArm(offset?: { x: number, y: number, z: number }): void {
        if (offset) {
            this.leftArmOffset = offset;
        }

        // Remove existing arm entity if any
        if (this.leftArmEntity) {
            this.leftArmEntity.despawn();
            this.leftArmEntity = null;
        }

        const world = this.playerEntity.world;
        if (!world) return;

        // Create a new entity that will be attached to the arm_left node
        this.leftArmEntity = new Entity({
            name: 'left_arm_adjuster',
            parent: this.playerEntity,
            parentNodeName: 'arm_left',
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_VELOCITY,
                colliders: []
            }
        });

        // Spawn the entity with the specified offset
        this.leftArmEntity.spawn(
            world,
            this.leftArmOffset,
            { x: 0, y: 0, z: 0, w: 1 } // No rotation
        );

        console.log(`[ArmPositionManager] Left arm position adjusted to:`, this.leftArmOffset);
    }

    /**
     * Resets the arm positions to their default state
     */
    public resetArmPositions(): void {
        if (this.rightArmEntity) {
            this.rightArmEntity.despawn();
            this.rightArmEntity = null;
        }

        if (this.leftArmEntity) {
            this.leftArmEntity.despawn();
            this.leftArmEntity = null;
        }

        console.log(`[ArmPositionManager] Arm positions reset to default`);
    }

    /**
     * Gets the current right arm offset
     */
    public getRightArmOffset(): { x: number, y: number, z: number } {
        return { ...this.rightArmOffset };
    }

    /**
     * Gets the current left arm offset
     */
    public getLeftArmOffset(): { x: number, y: number, z: number } {
        return { ...this.leftArmOffset };
    }
} 