import { Entity, PlayerEntity, type Vector3Like } from 'hytopia';
import type { Boss } from '../bosses/Boss';

// Interface voor boss aanvallen
export interface BossAttack {
  // Unieke identifier van de aanval
  id: string;
  
  // Naam van de aanval voor weergave
  name: string;
  
  // Type aanval (melee, range, buff, debuff, etc.)
  type: string;
  
  // Functie die bepaalt of een aanval kan worden uitgevoerd
  canExecute: (boss: Boss, target: PlayerEntity | null) => boolean;
  
  // Voert de aanval uit
  execute: (boss: Boss, target: PlayerEntity | null) => void;
  
  // Geeft de cooldown tijd in ms terug na gebruik
  getCooldown: () => number;
  
  // Geeft de basis schade van deze aanval terug (als van toepassing)
  getDamage?: () => number;
  
  // Beschrijving van de aanval
  description: string;
}

// Basisklasse voor alle aanvallen
export abstract class BaseBossAttack implements BossAttack {
  // Verplichte eigenschappen
  id: string;
  name: string;
  type: string;
  description: string;
  
  // Gemeenschappelijke eigenschappen
  protected _cooldown: number;
  
  constructor(options: {
    id: string,
    name: string,
    type: string,
    description: string,
    cooldown?: number
  }) {
    this.id = options.id;
    this.name = options.name;
    this.type = options.type;
    this.description = options.description;
    this._cooldown = options.cooldown || 5000;
  }
  
  // Te implementeren in subklassen
  abstract canExecute(boss: Boss, target: PlayerEntity | null): boolean;
  abstract execute(boss: Boss, target: PlayerEntity | null): void;
  
  // Algemene implementatie voor cooldown
  getCooldown(): number {
    return this._cooldown;
  }
  
  // Helper om afstand te berekenen tussen twee posities
  protected _getDistance(pos1: Vector3Like, pos2: Vector3Like): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
} 