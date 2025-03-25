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

            // Start panic mode
            this.startPanicMode(animal);
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

    private startPanicMode(animal: Entity): void {
        // Get the pathfinding controller
        const controller = animal.controller as PathfindingEntityController;
        if (!controller) return;

        // Cancel any existing panic mode
        if ((animal as any)._panicModeInterval) {
            clearInterval((animal as any)._panicModeInterval);
        }

        // Start running animation IMMEDIATELY
        animal.stopModelAnimations(['idle']);
        animal.startModelLoopedAnimations(['walk']);

        // Panic mode settings - BETERE HOOGTEVERSCHIL HANDLING
        const PANIC_DURATION = 2500; // 2.5 seconden paniek
        const PANIC_SPEED = 10; // Snelle snelheid
        const MIN_PANIC_DISTANCE = 4; // Kortere minimum voor snellere reacties
        const MAX_PANIC_DISTANCE = 8; // Kortere maximum voor snellere reacties
        const DIRECTION_CHANGE_INTERVAL = 250; // Veel snellere richting verandering (4x per seconde)

        // Start IMMEDIATE movement in a random direction
        const startMovement = () => {
            if (!animal.isSpawned) {
                clearInterval((animal as any)._panicModeInterval);
                return;
            }

            const currentPos = animal.position;
            const angle = Math.random() * Math.PI * 2; // Random richting
            
            // Random afstand tussen MIN en MAX
            const distance = MIN_PANIC_DISTANCE + (Math.random() * (MAX_PANIC_DISTANCE - MIN_PANIC_DISTANCE));
            
            const newPos = {
                x: currentPos.x + Math.cos(angle) * distance,
                y: currentPos.y,
                z: currentPos.z + Math.sin(angle) * distance
            };

            // Move to the new position met verbeterde hoogteverschil handling
            controller.pathfind(newPos, PANIC_SPEED, {
                maxJump: 1.5, // 1.5 blokken springen
                maxFall: 2, // 2 blokken vallen
                verticalPenalty: 1.2, // Kleine penalty voor verticale beweging -> voorkeur voor horizontaal bewegen
                waypointTimeoutMs: 300, // Meer tijd voor complexe paden
                maxOpenSetIterations: 100 // Meer iteraties voor betere paden bij hoogteverschillen
            });

            // Direct naar de nieuwe richting kijken
            const dx = newPos.x - currentPos.x;
            const dz = newPos.z - currentPos.z;
            const rotationAngle = Math.atan2(dx, dz);
            animal.setRotation(Quaternion.fromEuler(0, (rotationAngle * 180 / Math.PI) + 180, 0));
        };

        // Start moving immediately
        startMovement();

        // Continue with regular interval changes
        (animal as any)._panicModeInterval = setInterval(startMovement, DIRECTION_CHANGE_INTERVAL);

        // Stop panic mode after duration
        setTimeout(() => {
            if ((animal as any)._panicModeInterval) {
                clearInterval((animal as any)._panicModeInterval);
            }
            // Stop running animation when panic is over
            if (animal.isSpawned) {
                animal.stopModelAnimations(['walk']);
                animal.startModelLoopedAnimations(['idle']);
            }
        }, PANIC_DURATION);
    }
} 