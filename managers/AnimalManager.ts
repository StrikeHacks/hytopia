import { Entity, World, Quaternion, PathfindingEntityController } from 'hytopia';
import { ItemSpawner } from './ItemSpawner';
import { GameManager } from './GameManager';

interface AnimalState {
    hp: number;
    lastHitTime: number;
}

export class AnimalManager {
    private animals: Map<number, Entity> = new Map();
    private animalStates: Map<number, AnimalState> = new Map();
    private readonly MAX_HP = 10;
    private readonly HIT_COOLDOWN = 400; // ms tussen hits
    private readonly DEATH_EFFECT_DURATION = 300; // ms (aangepast naar zelfde waarde als animatie)

    constructor(
        private world: World,
        private itemSpawner: ItemSpawner,
        private gameManager: GameManager
    ) {}

    public registerAnimal(animal: Entity) {
        if (animal.id) {
            this.animals.set(animal.id, animal);
            // Start met volle HP en reset lastHitTime
            this.animalStates.set(animal.id, { 
                hp: this.MAX_HP,
                lastHitTime: 0
            });
        }
    }

    public unregisterAnimal(animalId: number) {
        this.animals.delete(animalId);
        this.animalStates.delete(animalId);
    }

    public handleAnimalHit(animal: Entity, direction: { x: number, y: number, z: number }, weaponDamage?: number) {
        if (!animal.id || !this.animals.has(animal.id)) return;

        const animalState = this.animalStates.get(animal.id);
        if (!animalState) return;

        // Check cooldown
        const now = Date.now();
        if (now - animalState.lastHitTime < this.HIT_COOLDOWN) {
            return; // Nog in cooldown
        }
        animalState.lastHitTime = now;

        // Bereken damage
        const damage = weaponDamage ?? 0.5; // 0.5 damage voor hand hits, anders weapon damage
        animalState.hp -= damage;

        console.log(`[AnimalManager] Animal hit! HP: ${animalState.hp}, Damage: ${damage}`);

        // Check voor dood
        if (animalState.hp <= 0) {
            this.handleAnimalDeath(animal);
            return;
        }

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

        // Hit effect (alleen als het dier niet dood is)
        if (animalState.hp > 0) {
            // Sla de timer op zodat we deze kunnen cancellen bij death
            animal.setTintColor({ r: 255, g: 0, b: 0 });
            const hitTimer = setTimeout(() => {
                // Alleen resetten als het dier nog leeft
                if (animalState.hp > 0) {
                    animal.setTintColor({ r: 255, g: 255, b: 255 });
                }
            }, 100);

            // Sla timer op voor later cancellen indien nodig
            if (!(animal as any)._hitEffectTimers) {
                (animal as any)._hitEffectTimers = [];
            }
            (animal as any)._hitEffectTimers.push(hitTimer);
        }

        console.log('[AnimalManager] Applied knockback to animal:', {
            animalId: animal.id,
            knockbackForce,
            verticalForce,
            normalizedDirection,
            currentHp: animalState.hp
        });
    }

    private handleAnimalDeath(animal: Entity) {
        const animalId = animal.id;
        if (typeof animalId !== 'number') return;

        // Drop a bone
        this.itemSpawner.handleBlockDrop('bone', animal.position);

        // Cancel eventuele actieve hit effect timers
        const existingTimers = (animal as any)._hitEffectTimers || [];
        existingTimers.forEach((timer: NodeJS.Timeout) => clearTimeout(timer));
        (animal as any)._hitEffectTimers = [];

        // Zet physics uit voor volledige controle over beweging
        animal.setEnabledRotations({ x: false, y: false, z: false });
        animal.setEnabledPositions({ x: false, y: false, z: false });
        
        // Start positie onthouden
        const startPosition = { ...animal.position };
        const fallDistance = 0.5; // Hoeveel blokken naar beneden
        
        // Start tijd voor de animatie
        const startTime = Date.now();
        const animationDuration = 250; // Snellere animatie (was 400ms)

        // Forceer pure rode tint zonder wit
        animal.setTintColor({ r: 255, g: 0, b: 0 });
        animal.setOpacity(0.7); // Verhoogde opacity voor sterkere rode tint
        
        // Animatie interval
        const animationInterval = setInterval(() => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            
            // Bereken voortgang (0 tot 1)
            const progress = Math.min(elapsed / animationDuration, 1);
            
            // Interpoleer de rotatie van 0 naar 90 graden
            const currentAngle = progress * 90;
            animal.setRotation(Quaternion.fromEuler(0, 0, currentAngle));
            
            // Interpoleer de Y positie (0.5 blokken naar beneden)
            animal.setPosition({
                x: startPosition.x,
                y: startPosition.y - (progress * fallDistance),
                z: startPosition.z
            });

            // Force pure red tint elke frame, met hogere opacity
            animal.setTintColor({ r: 255, g: 0, b: 0 });
            animal.setOpacity(0.7);
            
            // Stop de animatie als we klaar zijn
            if (progress >= 1) {
                clearInterval(animationInterval);
            }
        }, 16); // Update ongeveer elke frame (60fps)

        // Remove after effect duration
        setTimeout(() => {
            clearInterval(animationInterval); // Voor de zekerheid

            // Informeer de spawner dat deze entity dood is
            this.gameManager.getAnimalSpawner().removeEntityFromArea(animal);

            if (animal.isSpawned) {
                animal.despawn();
            }
            this.unregisterAnimal(animalId);
        }, this.DEATH_EFFECT_DURATION);
    }
} 