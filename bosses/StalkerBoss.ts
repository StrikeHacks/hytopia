import { PlayerEntity, RigidBodyType, ColliderShape, CollisionGroup, Entity, EntityEvent, World, SceneUI, Audio } from 'hytopia';
import { Boss, type BossOptions } from './Boss';
import { MeleeAttack } from '../attacks/MeleeAttack';
import { SpeedUpAttack } from '../attacks/SpeedUpAttack';
import { KnockbackAttack } from '../attacks/KnockbackAttack';
import type { Vector3Like } from 'hytopia';
import { PathfindingEntityController } from 'hytopia';
import { AttackerTracker } from '../utils/AttackerTracker';

// Interface voor StalkerBoss configuratie
export interface StalkerBossOptions extends BossOptions {
  attackRange?: number;
  attackDamage?: number;
  attackCooldown?: number;
  knockbackForce?: number;
  knockbackCooldown?: number;
  speedMultiplier?: number;
  speedUpDuration?: number;
  speedUpCooldown?: number;
  xpReward?: number; // XP reward for defeating this boss
}

// Interface voor StalkerBoss configuratie
export interface StalkerBossConfig {
  entityId: string;
  position: Vector3Like;
  modelName: string;
  health?: number;
  moveSpeed?: number;
  attackRange?: number;
  attackDamage?: number;
  attackCooldown?: number;
  speedUpCooldown?: number;
}

// Vereenvoudigde StalkerBoss implementatie
export class StalkerBoss extends Boss {
  private _attackRange: number;
  private _attackDamage: number;
  private _attackCooldown: number;
  private _lastAttackTime: number = 0;
  private _currentAttack: number = 0;
  private _attacks: (MeleeAttack | KnockbackAttack)[];
  private _speedUpAttack: SpeedUpAttack | null = null;
  private readonly MINIMUM_DISTANCE: number = 2.0;
  private readonly KNOCKBACK_DISTANCE: number = 3.5;
  private readonly KNOCKBACK_COOLDOWN: number = 100;
  private _lastKnockbackTime: number = 0;
  protected _lastPlayerAttacker: PlayerEntity | null = null; // Track last player who hit the boss
  
  // Voeg health bar UI toe
  private _healthBar: SceneUI | null = null;
  
  constructor(options: StalkerBossOptions) {
    // Call the base Boss constructor with StalkerBoss specific options
    super({
      ...options,
      name: options.name || 'StalkerBoss',
      modelUri: options.modelUri || 'models/npcs/stalker.gltf',
      // Use the configured dropItems, or default to empty array if not provided
      dropItems: options.dropItems || []
    });
    
    // Combat eigenschappen
    this._attackRange = options.attackRange || 4;
    this._attackDamage = options.attackDamage || 15;
    this._attackCooldown = options.attackCooldown || 200;

    // Configureer de verschillende attacks met de opties uit de BossManager
    const meleeDamage = options.attackDamage || 15;
    const meleeRange = options.attackRange || 4;
    const meleeCooldown = options.attackCooldown || 200;
    
    const knockbackDamage = options.attackDamage || 15;
    const knockbackRange = options.attackRange ? options.attackRange * 1.5 : 6;
    const knockbackForce = options.knockbackForce || 25;
    const knockbackCooldown = options.knockbackCooldown || 500;

    this._attacks = [
      new MeleeAttack({ 
        damage: meleeDamage,
        range: meleeRange,
        cooldown: meleeCooldown,
        attackAnimation: 'slash'
      }),
      new KnockbackAttack({
        damage: knockbackDamage,
        range: knockbackRange,
        knockbackForce: knockbackForce,
        cooldown: knockbackCooldown,
        attackAnimation: 'slam'
      })
    ];
    
    // SpeedUp attack alleen gebruiken als laatste redmiddel
    const speedUpDuration = options.speedUpDuration || 3000;
    const speedUpCooldown = options.speedUpCooldown || 8000;
    const speedMultiplier = options.speedMultiplier || 2.0;
    
    this._speedUpAttack = new SpeedUpAttack({
      speedMultiplier: speedMultiplier,
      duration: speedUpDuration,
      cooldown: speedUpCooldown,
      minHealthPercentage: 30
    });
    
    // Voeg tick event toe om beweging en aanvallen te verwerken
    this.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
      try {
        this._onTick(tickDeltaMs);
        this._updateHealthBar(); // Nieuwe methode om health bar te updaten
      } catch (error) {
        console.error(`Fout in StalkerBoss tick handler:`, error);
      }
    });
    
    // Voeg event toe om te luisteren naar despawn en health updates
    this.on(EntityEvent.DESPAWN, () => {
      this._destroyHealthBar();
    });
  }
  
  // Tick event handler
  private _onTick(deltaTimeMs: number): void {
    try {
      // Als we niet gespawned zijn, doe niets
      if (!this.isSpawned || !this.world) return;
      
      // Zoek dichtstbijzijnde speler
      const nearbyPlayers = this.world.entityManager.getAllEntities()
        .filter((entity: Entity) => entity instanceof PlayerEntity && entity.isSpawned) as PlayerEntity[];
      
      let closestPlayer: PlayerEntity | null = null;
      let closestDistance = Infinity;
      
      for (const player of nearbyPlayers) {
        const distance = this._getDistance(this.position, player.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayer = player;
        }
      }
      
      // Als we een speler hebben gevonden
      if (closestPlayer) {
        // Check of we kunnen aanvallen
        if (closestDistance <= this._attackRange) {
          this._tryAttack(closestPlayer);
        }
      }
      
    } catch (error) {
      console.error(`Fout in StalkerBoss _onTick:`, error);
    }
  }
  
  // Probeer een speler aan te vallen
  private _tryAttack(player: PlayerEntity): void {
    const now = Date.now();
    if (now - this._lastAttackTime >= this._attackCooldown) {
      this._lastAttackTime = now;
      
      // Check eerst of we SpeedUp moeten gebruiken
      if (this._speedUpAttack && 
          this._speedUpAttack.canExecute(this, player) && 
          (this._health / this._maxHealth) <= 0.3) {
        this._speedUpAttack.execute(this, player);
        return;
      }
      
      // Anders, gebruik een normale attack
      this._currentAttack = Math.floor(Math.random() * this._attacks.length);
      const attack = this._attacks[this._currentAttack];
      
      // Voer de attack uit als deze beschikbaar is
      if (attack && attack.canExecute(this, player)) {
        attack.execute(this, player);
      }
    }
  }
  
  // Maak en update de health bar
  private _createHealthBar(): void {
    if (!this.isSpawned || !this.world || this._healthBar) return;
    
    try {
      // Maak een nieuwe SceneUI voor de health bar
      this._healthBar = new SceneUI({
        templateId: 'boss-health', // Gebruik het template uit de UI
        offset: { x: 0, y: 1.5 * this._bossScale, z: 0 }, // Positioneer boven de boss, verlaagd van 2.5 naar 1.5
        position: this.position, // Positie aan de entity koppelen
        state: {  // Gebruik state in plaats van initialState
          health: this._health,
          maxHealth: this._maxHealth,
          healthPercent: (this._health / this._maxHealth) * 100
        }
      });
      
      // Laad de UI in de wereld
      this._healthBar.load(this.world);
      
      // Update de positie bij elke tick om de UI te laten volgen
      // (We gebruiken een tick handler in plaats van attachedToEntity omdat dit een read-only property is)
      
    } catch (error) {
    }
  }
  
  // Update de health bar
  private _updateHealthBar(): void {
    if (!this._healthBar) {
      this._createHealthBar();
      return;
    }
    
    // Update de status van de health bar
    this._healthBar.setState({
      health: Math.round(this._health),
      maxHealth: this._maxHealth,
      healthPercent: (this._health / this._maxHealth) * 100
    });
    
    // Update de positie van de health bar om de boss te volgen
    if (this._healthBar && this.isSpawned) {
      const headPosition = {
        x: this.position.x,
        y: this.position.y + 1.5 * this._bossScale, // Verlaagd van 2.5 naar 1.5
        z: this.position.z
      };
      this._healthBar.setPosition(headPosition);
    }
  }
  
  // Verwijder de health bar
  private _destroyHealthBar(): void {
    if (this._healthBar) {
      this._healthBar.unload();
      this._healthBar = null;
    }
  }

  // Overschrijf spawn om de health bar te creëren
  public override spawn(world: World, position: Vector3Like): void {
    // Call the parent spawn method first
    super.spawn(world, position);
    
    // Create the health bar after spawning
    this._createHealthBar();
  }
  
  // Overschrijf despawn om de health bar op te ruimen
  public override despawn(): void {
    // Ruim health bar op voor despawn
    this._destroyHealthBar();
    
    // Call parent despawn
    super.despawn();
  }
  
  // Overschrijf damage om de health bar te updaten
  public override damage(amount: number, source?: Entity): void {
    // Reken damage uit en update gezondheid
    super.damage(amount, source);
    
    // Update de health bar
    this._updateHealthBar();
  }
  
  // Wanneer de boss damage neemt
  public takeDamage(amount: number, fromPlayerAttack: boolean = false, playerEntity?: PlayerEntity): void {
    if (!this.isSpawned || !this.world) return;
    
    // Find the player who dealt the damage
    if (fromPlayerAttack) {
      
      // Use the provided playerEntity if available
      if (playerEntity) {
        this._lastPlayerAttacker = playerEntity;
      } else {
        // Fallback: find a player in the world
        const players = this.world.entityManager.getAllEntities()
          .filter(entity => entity instanceof PlayerEntity && entity.isSpawned);
        
        if (players && players.length > 0) {
          // Get the player entity who attacked
          const foundPlayer = players[0] as PlayerEntity;
          this._lastPlayerAttacker = foundPlayer;
        } else {
        }
      }
    }
    
    // Roep de parent damage methode aan voor de health update
    super.damage(amount);
    
    // Update health bar
    this._updateHealthBar();
    
    // Check of de boss dood is
    if (this._health <= 0) {
      if (this._lastPlayerAttacker) {
      }
      this.despawn();
      return;
    }
    
    // Direct een health event versturen voor UI update
    this.emit('health-update', {
      health: this._health,
      maxHealth: this._maxHealth
    });
    
    // Als het een speler aanval is, pas knockback toe
    if (fromPlayerAttack) {
      // Zoek spelers in de wereld voor knockback
      const players = this.world.entityManager.getAllEntities()
        .filter(entity => entity instanceof PlayerEntity && entity.isSpawned);
      
      if (players && players.length > 0) {
        // Veilige type casting
        const playerEntity = players[0] as Entity;
        
        // Alleen als we een geldige positie hebben, knockback toepassen
        if (playerEntity && playerEntity.position) {
          this.receiveKnockback(playerEntity.position, 8);
        }
      }
    }
  }
  
  // Ontvangt knockback van een speler aanval
  public receiveKnockback(sourcePosition: Vector3Like, force: number = 10): void {
    if (!this.isSpawned || !this.world) return;
    
    
    // Bereken richting van speler naar boss (weg van de speler)
    const direction = {
      x: this.position.x - sourcePosition.x,
      y: 0,
      z: this.position.z - sourcePosition.z
    };
    
    // Normaliseer de richting vector
    const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    if (distance > 0) {
      direction.x /= distance;
      direction.z /= distance;
    } else {
      // Als de afstand 0 is, gebruik een standaard richting
      direction.x = 1;
      direction.z = 0;
    }
    
    // Bereken pushDistance gebaseerd op boss grootte
    // Kleinere bosses krijgen minder knockback
    const bossScale = super.getBossScale();
    const pushDistance = bossScale <= 1.0 ? 0.3 : 0.5;
    
    // Bereken nieuwe positie
    const newPosition = {
      x: this.position.x + direction.x * pushDistance,
      y: this.position.y + 0.1,
      z: this.position.z + direction.z * pushDistance
    };
    
    // Log de huidige en nieuwe posities

    
    // Pas impuls sterkte aan op basis van boss grootte
    const impulseMultiplier = bossScale <= 1.0 ? 0.2 : 0.3;
    const upwardMultiplier = bossScale <= 1.0 ? 0.1 : 0.2;
    
    // Combineer beide technieken: directe positie aanpassing EN fysica
    // 1. Verplaats eerste direct een klein beetje
    this.setPosition(newPosition);
    
    // 2. Voeg dan een impuls toe voor natuurlijke beweging
    this.applyImpulse({
      x: direction.x * force * impulseMultiplier,
      y: force * upwardMultiplier,
      z: direction.z * force * impulseMultiplier
    });
    

  }
  
  // Overschrijf de doodmethode voor stalker-specific gedrag
  protected override _onDeath(source?: Entity): void {
    if (!this.isSpawned || !this.world) return;
    
    // Get the player who last attacked this boss - first check internal storage
    let killerPlayer = this._lastPlayerAttacker;
    
    // If we don't have a lastPlayerAttacker, try to get it from the AttackerTracker
    if (!killerPlayer && this.id) {
      try {
        const attackerFromTracker = AttackerTracker.getInstance().getLastAttacker(this.id);
        if (attackerFromTracker) {
          killerPlayer = attackerFromTracker;
        }
      } catch (error) {
        console.error(`[StalkerBoss] Error getting attacker from tracker:`, error);
      }
    }
    
    // Use the source as a last resort
    if (!killerPlayer && source instanceof PlayerEntity) {
      killerPlayer = source;
    }
    
    // Verwijder de health bar
    this._destroyHealthBar();
    
    // Emit boss-death event with the killer player as source
    this.emit('boss-death', {
      boss: this,
      source: killerPlayer || source
    });
    
    // Clean up the AttackerTracker record for this boss
    if (this.id) {
      AttackerTracker.getInstance().clearRecord(this.id);
    }
    
    // Speel de dood sound
    try {
      // Soms is het beter om de audio gelijk aan de speler te koppelen in plaats van aan de positie
      const players = this.world.entityManager.getAllEntities()
        .filter(entity => entity instanceof PlayerEntity && entity.isSpawned) as PlayerEntity[];
      
      const deathSound = new Audio({
        uri: 'audio/sfx/entity/stalker/stalker-death.mp3', // Merk op: zonder 'assets/' prefix
        volume: 0.6,
        referenceDistance: 30, // Grotere afstand om het beter te horen
        position: players.length > 0 ? players[0].position : this.position, // Koppel aan speler indien mogelijk
        playbackRate: 1.0
      });
      
      // Speel het geluid af
      deathSound.play(this.world);
      
    } catch (error) {
      console.error('[StalkerBoss] Fout bij afspelen van death sound:', error);
    }
    
    // Roep de parent _onDeath aan om items te droppen
    super._onDeath(source);
    
    // Zet een LANGERE delay voor despawn om het geluid en item drops te laten afhandelen
    setTimeout(() => {
      // Despawn
      if (this.isSpawned) {
        this.despawn();
      }
    }, 1000); // Langere delay om geluid en drops de kans te geven
  }
} 