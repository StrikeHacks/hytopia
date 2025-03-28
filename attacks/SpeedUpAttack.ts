import { PlayerEntity, Audio } from 'hytopia';
import type { Boss } from '../bosses/Boss';
import { BaseBossAttack } from './BossAttack';

// Opties interface voor speedup aanvallen
export interface SpeedUpAttackOptions {
  id?: string;
  name?: string;
  description?: string;
  cooldown?: number;
  speedMultiplier?: number;
  duration?: number;
  triggerSound?: string;
  activateAnimation?: string;
  minHealthPercentage?: number;  // Minimum gezondheidspercentage om te activeren
}

// SpeedUpAttack: Aanval die de boss tijdelijk sneller laat bewegen
export class SpeedUpAttack extends BaseBossAttack {
  private _speedMultiplier: number;
  private _duration: number;
  private _triggerSound?: string;
  private _activateAnimation?: string;
  private _minHealthPercentage: number;
  private _isActive: boolean = false;
  private _originalSpeed: number = 0;
  
  constructor(options: SpeedUpAttackOptions = {}) {
    super({
      id: options.id || 'speed_up',
      name: options.name || 'Berserk Speed',
      type: 'buff',
      description: options.description || 'Temporarily increases movement speed',
      cooldown: options.cooldown || 15000
    });
    
    this._speedMultiplier = options.speedMultiplier || 2.0;
    this._duration = options.duration || 5000;
    this._triggerSound = options.triggerSound;
    this._activateAnimation = options.activateAnimation || 'roar';
    this._minHealthPercentage = options.minHealthPercentage || 0;
  }
  
  // Controleer of de boss deze aanval kan uitvoeren
  canExecute(boss: Boss, target: PlayerEntity | null): boolean {
    if (!boss.world) return false;
    
    // Als deze aanval al actief is, niet nog eens uitvoeren
    if (this._isActive) return false;
    
    // Controleer of de boss onder het minimum gezondheidspercentage is
    if (this._minHealthPercentage > 0) {
      const healthPercentage = (boss.getHealth() / boss.getMaxHealth()) * 100;
      if (healthPercentage > this._minHealthPercentage) {
        return false;
      }
    }
    
    return true;
  }
  
  // Voer de aanval uit: verhoog de bewegingssnelheid tijdelijk
  execute(boss: Boss, target: PlayerEntity | null): void {
    if (!boss.world) return;
    
    console.log(`${boss.name} activates ${this.name} (speed x${this._speedMultiplier} for ${this._duration}ms)`);
    
    // Markeer de aanval als actief
    this._isActive = true;
    
    // We kunnen de moveSpeed niet direct aanpassen omdat het privé is,
    // dus we moeten een hack gebruiken om de bewegingssnelheid aan te passen
    // door een privé property in de boss class aan te passen via 'als any' 
    // en dan de oorspronkelijke waarde op te slaan zodat we die later kunnen herstellen
    if (typeof (boss as any)._moveSpeed === 'number') {
      this._originalSpeed = (boss as any)._moveSpeed;
      (boss as any)._moveSpeed = this._originalSpeed * this._speedMultiplier;
      
      console.log(`${boss.name}'s speed increased from ${this._originalSpeed} to ${(boss as any)._moveSpeed}`);
    }
    
    // Speel activatie-animatie
    if (this._activateAnimation) {
      boss.stopModelAnimations(['walk', 'idle', 'run']);
      boss.startModelLoopedAnimations([this._activateAnimation]);
      
      // Ga terug naar run of walk animatie na korte tijd
      setTimeout(() => {
        if (boss.isSpawned) {
          boss.stopModelAnimations([this._activateAnimation || '']);
          boss.startModelLoopedAnimations(['run']);
        }
      }, 1000);
    }
    
    // Speel geluid af als gespecificeerd
    if (this._triggerSound && boss.world) {
      const audioInstance = new Audio({
        uri: this._triggerSound,
        attachedToEntity: boss,
        volume: 1,
        referenceDistance: 30
      });
      audioInstance.play(boss.world);
    }
    
    // Reset na duur verstreken is
    setTimeout(() => {
      if (boss.isSpawned) {
        console.log(`${boss.name}'s ${this.name} effect wore off`);
        
        // Reset de bewegingssnelheid naar de oorspronkelijke waarde
        if (this._originalSpeed > 0) {
          (boss as any)._moveSpeed = this._originalSpeed;
          console.log(`${boss.name}'s speed reset to ${this._originalSpeed}`);
        }
        
        this._isActive = false;
      }
    }, this._duration);
  }
} 