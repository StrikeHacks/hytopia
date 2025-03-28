import { Audio, Entity, PlayerEntity } from 'hytopia';
import type { Boss } from '../bosses/Boss';
import { BaseBossAttack } from './BossAttack';
import { PlayerManager } from '../managers/PlayerManager';
import type { Vector3Like } from 'hytopia';

// Opties interface voor knockback aanvallen
export interface KnockbackAttackOptions {
  id?: string;
  name?: string;
  description?: string;
  damage?: number;
  knockbackForce?: number;
  cooldown?: number;
  aoeRadius?: boolean;
  attackSound?: string;
  attackAnimation?: string;
  animationDuration?: number;
  range?: number;
}

// KnockbackAttack: Aanval die spelers wegduwt met grote kracht
export class KnockbackAttack extends BaseBossAttack {
  private _knockbackForce: number;
  private _range: number;
  private _damage: number;
  private _aoeRadius: boolean;
  private _attackSound?: string;
  private _attackAnimation?: string;
  private _animationDuration: number;
  
  constructor(options: KnockbackAttackOptions = {}) {
    super({
      id: options.id || 'knockback_attack',
      name: options.name || 'Ground Slam',
      type: 'knockback',
      description: options.description || 'Knocks back nearby players with great force',
      cooldown: options.cooldown || 8000
    });
    
    this._knockbackForce = options.knockbackForce || 20;
    this._range = options.range || 6; // Hogere range voor knockback attacks (6 units)
    this._damage = options.damage || 10;
    this._aoeRadius = options.aoeRadius !== undefined ? options.aoeRadius : true;
    this._attackSound = options.attackSound;
    this._attackAnimation = options.attackAnimation || 'slam';
    this._animationDuration = options.animationDuration || 1000;
  }
  
  // Controleer of de boss deze aanval kan uitvoeren
  canExecute(boss: Boss, target: PlayerEntity | null): boolean {
    if (!boss.world) return false;
    
    // Als we een AOE aanval doen, is er geen specifieke target nodig
    if (this._aoeRadius) {
      return true;
    }
    
    // Als we een gerichte aanval doen, hebben we een target nodig binnen bereik
    if (!target) return false;
    
    const distance = this._getDistance(boss.position, target.position);
    return distance <= this._range;
  }
  
  // Voer de aanval uit: knockback op alle spelers binnen bereik
  execute(boss: Boss, target: PlayerEntity | null): void {
    if (!boss.world) return;
    
    // Speel de knockback animatie
    if (this._attackAnimation) {
      boss.stopModelAnimations(['walk', 'idle', 'run']);
      boss.startModelLoopedAnimations([this._attackAnimation]);
    }
    
    // Speel geluid af
    if (this._attackSound && boss.world) {
      const audioInstance = new Audio({
        uri: this._attackSound,
        attachedToEntity: boss,
        volume: 1,
        referenceDistance: 30
      });
      audioInstance.play(boss.world);
    }
    
    // Wacht even voordat we de knockback toepassen voor betere visuele feedback
    setTimeout(() => {
      if (!boss.isSpawned || !boss.world) return;
      
      // Als het een AOE aanval is, vind alle spelers
      if (this._aoeRadius) {
        // Haal alle spelers op
        const players = boss.world.entityManager.getAllEntities()
          .filter((e: Entity) => e instanceof PlayerEntity && e.isSpawned) as PlayerEntity[];
        
        // Pas effecten toe op spelers binnen range
        for (const player of players) {
          const distance = this._getDistance(boss.position, player.position);
          if (distance <= this._range) {
            this._applyKnockbackToPlayer(boss, player);
          }
        }
      } 
      // Anders alleen de target beïnvloeden
      else if (target && target.isSpawned) {
        this._applyKnockbackToPlayer(boss, target);
      }
      
      // Ga terug naar normale animatie na een korte tijd
      setTimeout(() => {
        if (boss.isSpawned) {
          boss.stopModelAnimations([this._attackAnimation || '']);
          boss.startModelLoopedAnimations(['walk']);
        }
      }, this._animationDuration / 2);
      
    }, this._animationDuration / 2);
  }
  
  // Helper functie om knockback toe te passen op een speler
  private _applyKnockbackToPlayer(boss: Boss, player: PlayerEntity): void {
    if (!boss.world || !player.isSpawned) return;
    
    // Vind de PlayerManager
    const managers = boss.world.entityManager.getAllEntities().filter(
      entity => entity instanceof PlayerManager
    );
    
    const playerManager = managers.length > 0 ? managers[0] as PlayerManager : undefined;
    
    // Check of de speler damage kan krijgen
    if (playerManager && !playerManager.canReceiveDamage()) {
      console.log("[KnockbackAttack] Speler is immuun voor damage/knockback, attack genegeerd");
      return;
    }
    
    // Bereken richting
    const direction = {
      x: player.position.x - boss.position.x,
      y: 0.4, // Opwaartse kracht
      z: player.position.z - boss.position.z
    };
    
    // Normaliseer de richting
    const length = Math.sqrt(
      direction.x * direction.x + 
      direction.y * direction.y + 
      direction.z * direction.z
    );
    
    if (length > 0) {
      direction.x /= length;
      direction.y /= length;
      direction.z /= length;
    }
    
    // Pas schade en knockback toe via PlayerManager
    if (playerManager) {
      playerManager.tryApplyDamage(this._damage, true);
      playerManager.tryApplyKnockback(direction, this._knockbackForce, true);
    } else {
      // Fallback naar directe damage/knockback
      player.emit('damage', { amount: this._damage });
      player.applyImpulse({
        x: direction.x * this._knockbackForce,
        y: direction.y * this._knockbackForce,
        z: direction.z * this._knockbackForce
      });
    }
  }
} 