import type { EntityOptions } from 'hytopia';
import MeleeWeaponEntity from './MeleeWeaponEntity';

export interface PickaxeEntityOptions extends EntityOptions {
    modelScale?: number;
}

export default class PickaxeEntity extends MeleeWeaponEntity {
    constructor(options: PickaxeEntityOptions) {
        super({
            ...options,
            modelUri: 'models/tools/pickaxe.gltf',
            modelScale: options.modelScale ?? 0.5,
            damage: 10,
            attackRate: 4.5,
            range: 2,
            minesMaterials: true,
            attackAudioUri: 'audio/tools/pickaxe_swing.mp3',
            hitAudioUri: 'audio/tools/pickaxe_hit.mp3',
            mlAnimation: 'swing',
            rigidBodyOptions: {
                enabledRotations: { x: false, y: true, z: false },
            },
        });
    }

    public override attack(): void {
        if (!this.parent || !this.processAttack()) return;

        super.attack();
    }

    public override equip(): void {
        super.equip();

        this.setPosition({ x: 0, y: 0.2, z: 0 });
        this.setRotation(Quaternion.fromEuler(-90, 0, 90));
    }
} 