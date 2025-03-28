import { PlayerEntity, Audio, CollisionGroup } from 'hytopia';
import type { Boss } from '../bosses/Boss';
import { BaseBossAttack } from './BossAttack';
import { PlayerManager } from '../managers/PlayerManager';

// Opties interface voor melee aanvallen
export interface MeleeAttackOptions {
  id?: string;
  name?: string;
  description?: string;
  damage?: number;
  range?: number;
  cooldown?: number;
  knockbackForce?: number;
  attackSound?: string;
  attackAnimation?: string;
  animationDuration?: number;
}

// Een basis melee aanval die schade doet en knockback geeft
export class MeleeAttack extends BaseBossAttack {
  private _damage: number;
  private _range: number;
  private _knockbackForce: number;
  private _attackSound?: string;
  private _attackAnimation?: string;
  private _animationDuration: number;
  
  constructor(options: MeleeAttackOptions = {}) {
    super({
      id: options.id || 'melee_attack',
      name: options.name || 'Melee Attack',
      type: 'melee',
      description: options.description || 'A basic melee attack that deals damage and knockback',
      cooldown: options.cooldown || 2000
    });
    
    this._damage = options.damage || 15;
    this._range = options.range || 4; // Standaard range van 4 units
    this._knockbackForce = options.knockbackForce || 10;
    this._attackSound = options.attackSound;
    this._attackAnimation = options.attackAnimation || 'attack';
    this._animationDuration = options.animationDuration || 500;
  }
  
  // Implementeer de getDamage methode
  getDamage(): number {
    return this._damage;
  }
  
  // Controleer of het doel aangevallen kan worden
  canExecute(boss: Boss, target: PlayerEntity | null): boolean {
    if (!boss.world || !target) return false;
    
    // Check of target binnen range is
    const distance = this._getDistance(boss.position, target.position);
    return distance <= this._range;
  }
  
  // Voer de aanval uit
  execute(boss: Boss, target: PlayerEntity | null): void {
    if (!boss.world || !target) return;
    
    // Geen range check meer - we vertrouwen op de speler input
    
    // Stop andere animaties
    boss.stopModelAnimations(['walk', 'idle', 'run']);
    
    // Start aanvalsanimatie
    if (this._attackAnimation) {
      boss.startModelLoopedAnimations([this._attackAnimation]);
    }
    
    // Speel geluid af indien beschikbaar
    if (this._attackSound && boss.world) {
      const audioInstance = new Audio({
        uri: this._attackSound,
        attachedToEntity: boss,
        volume: 1,
        referenceDistance: 20
      });
      audioInstance.play(boss.world);
    }
    
    // Damage fase
    setTimeout(() => {
      if (!boss.isSpawned || !target.isSpawned) return;
      
      // Vind de PlayerManager
      const managers = boss.world?.entityManager.getAllEntities().filter(
        entity => entity instanceof PlayerManager
      ) || [];
      
      const playerManager = managers.length > 0 ? managers[0] as PlayerManager : undefined;
      
      // Check of de speler damage kan krijgen
      if (playerManager && !playerManager.canReceiveDamage()) {
        console.log("[MeleeAttack] Speler is immuun voor schade, attack genegeerd");
        return;
      }
      
      // Bereken knockback richting
      const dx = target.position.x - boss.position.x;
      const dz = target.position.z - boss.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist > 0) {
        // Normaliseer richting
        const direction = {
          x: dx / dist,
          y: 0.3, // Kleine opwaartse kracht 
          z: dz / dist
        };
        
        // Pas damage en knockback toe via PlayerManager
        if (playerManager) {
          playerManager.tryApplyDamage(this._damage, true);
          playerManager.tryApplyKnockback(direction, this._knockbackForce, true);
        } else {
          // Fallback naar directe damage/knockback
          target.emit('damage', { amount: this._damage });
          target.applyImpulse({
            x: direction.x * this._knockbackForce,
            y: direction.y * this._knockbackForce,
            z: direction.z * this._knockbackForce
          });
        }
      }
    }, this._animationDuration * 0.3);
    
    // Reset animatie
    setTimeout(() => {
      if (boss.isSpawned) {
        boss.startModelLoopedAnimations(['walk']);
      }
    }, this._animationDuration);
  }
} 