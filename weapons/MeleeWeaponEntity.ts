import {
    Audio,
    Entity,
    Quaternion,
    World,
} from 'hytopia';

import type {
    RaycastHit,
    Vector3Like,
    EntityOptions,
} from 'hytopia';

interface GameEntity extends Entity {
    facingDirection: Vector3Like;
    isPlayer: boolean;
    isDead: boolean;
    addMaterial?: (count: number) => void;
    dealtDamage?: (damage: number) => void;
    takeDamage?: (damage: number, direction: Vector3Like, attacker: Entity) => void;
}

export interface MeleeWeaponEntityOptions extends EntityOptions {
    damage: number;           // The damage dealt by the weapon
    attackRate: number;       // Attacks per second
    range: number;            // The range of the melee attack
    attackAudioUri: string;   // The audio played when attacking
    hitAudioUri: string;      // The audio played when hitting an entity or block
    minesMaterials: boolean;  // Whether the weapon mines materials when it hits a block
    mlAnimation: string;      // The animation to play when attacking
}

export default abstract class MeleeWeaponEntity extends Entity {
    protected readonly damage: number;
    protected readonly attackRate: number;
    protected readonly range: number;
    protected readonly minesMaterials: boolean;
    protected readonly mlAnimation: string;

    private _lastAttackTime: number = 0;
    private _attackAudio: Audio;
    private _hitAudio: Audio;

    public constructor(options: MeleeWeaponEntityOptions) {
        super(options);

        this.damage = options.damage;
        this.attackRate = options.attackRate;
        this.range = options.range;
        this.minesMaterials = options.minesMaterials;
        this.mlAnimation = options.mlAnimation;

        this._attackAudio = new Audio({
            attachedToEntity: this,
            uri: options.attackAudioUri,
            volume: 0.3,
            referenceDistance: 3,
        });

        this._hitAudio = new Audio({
            attachedToEntity: this,
            uri: options.hitAudioUri,
            volume: 0.3,
            referenceDistance: 3,
        });
    }

    public equip(): void {
        if (!this.world) return;
        
        this.setRotation(Quaternion.fromEuler(-90, 0, 0));
    }

    public attack(): void {
        if (!this.parent?.world) return;

        if (!this.processAttack()) return;

        const { origin, direction } = this.getAttackOriginDirection();
        
        this._performAttackEffects();
        this.attackRaycast(origin, direction, this.range);
    }

    protected getAttackOriginDirection(): { origin: Vector3Like, direction: Vector3Like } {
        const parent = this.parent as GameEntity | undefined;
        if (!parent) return { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 0 } };

        const { x, y, z } = parent.position;
        const direction = parent.facingDirection;

        return {
            origin: { x, y: y + 1.6, z }, // Approximate eye height
            direction
        };
    }

    protected processAttack(): boolean {
        const now = performance.now();
        if (this._lastAttackTime && now - this._lastAttackTime < 1000 / this.attackRate) return false;

        this._lastAttackTime = now;
        return true;
    }

    protected attackRaycast(origin: Vector3Like, direction: Vector3Like, length: number): RaycastHit | null | undefined {
        if (!this.parent?.world) return;
       
        const { world } = this.parent;
        const raycastHit = world.simulation.raycast(origin, direction, length, {
            filterExcludeRigidBody: this.parent.rawRigidBody,
        });

        if (raycastHit?.hitBlock) {
            const brokeBlock = world.chunkLattice.setBlock(raycastHit.hitBlock.globalCoordinate, 0);

            if (this.minesMaterials && brokeBlock) {
                const blockId = raycastHit.hitBlock.blockType.id;
                const materialCount = 1; // Default to 1 material per block

                const parent = this.parent as GameEntity;
                if (parent.addMaterial) {
                    parent.addMaterial(materialCount);
                }
            }
        }

        if (raycastHit?.hitEntity) {
            this._handleHitEntity(raycastHit.hitEntity, direction);
        }

        if (raycastHit?.hitBlock || raycastHit?.hitEntity) {
            this._hitAudio.play(world, true);
        }

        return raycastHit;
    }

    private _performAttackEffects(): void {
        if (!this.parent) return;
        
        this.parent.startModelOneshotAnimations([ this.mlAnimation ]);
        this._attackAudio.play(this.parent.world!, true);
    }

    protected _handleHitEntity(hitEntity: Entity, hitDirection: Vector3Like): void {
        const gameEntity = hitEntity as GameEntity;
        if (!gameEntity.isPlayer || gameEntity.isDead) return;
        
        const parent = this.parent as GameEntity;
        if (parent?.dealtDamage) {
            parent.dealtDamage(this.damage);
        }

        if (gameEntity.takeDamage && this.parent) {
            gameEntity.takeDamage(this.damage, hitDirection, this.parent);
        }
    }
} 