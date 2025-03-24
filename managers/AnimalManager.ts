import { Entity, World, Quaternion, PathfindingEntityController } from 'hytopia';

export class AnimalManager {
    private animals: Map<number, Entity> = new Map();

    constructor(private world: World) {}

    public registerAnimal(animal: Entity) {
        if (animal.id) {
            this.animals.set(animal.id, animal);
        }
    }

    public unregisterAnimal(animalId: number) {
        this.animals.delete(animalId);
    }

    public handleAnimalHit(animal: Entity, direction: { x: number, y: number, z: number }) {
        if (!animal.id || !this.animals.has(animal.id)) return;

        // Knockback krachten
        const knockbackForce = 900;
        const verticalForce = 400;

        // Normaliseer de richting voor consistente knockback
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const normalizedDirection = {
            x: direction.x / length,
            z: direction.z / length
        };

        // Knockback toepassen met genormaliseerde richting
        animal.applyImpulse({
            x: normalizedDirection.x * knockbackForce,
            y: verticalForce,
            z: normalizedDirection.z * knockbackForce
        });

        // Flash effect
        animal.setTintColor({ r: 255, g: 0, b: 0 });
        setTimeout(() => animal.setTintColor({ r: 255, g: 255, b: 255 }), 100);

        console.log('[AnimalManager] Applied knockback to animal:', {
            animalId: animal.id,
            knockbackForce,
            verticalForce,
            normalizedDirection
        });
    }
} 