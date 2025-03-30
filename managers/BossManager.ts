import { World, Entity, PlayerEntity, EntityEvent, type Player, PlayerEvent, SceneUI } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import { Boss } from '../bosses/Boss';
import { StalkerBoss } from '../bosses/StalkerBoss';

// Types voor bosstoewijzing aan locaties
export interface BossSpawnLocation {
  position: Vector3Like;
  type: string;
  options?: any;
}

// Vooraf gedefinieerde boss types
export enum PredefinedBossType {
  MELEE_STALKER = 'melee-stalker',
  CHARGE_STALKER = 'charge-stalker',
  TANK_STALKER = 'tank-stalker'
}

// Manager voor het spawnen en beheren van bosses
export class BossManager {
  private _world: World;
  private _gameManager: any | null = null; // Referentie naar GameManager
  private _activeSpawners: Map<string, BossSpawnLocation> = new Map();
  private _activeBosses: Map<string, Boss> = new Map();
  private _nextBossId: number = 1;
  private _updateInterval: number = 1000; // Milliseconden tussen boss-target updates
  private _updateIntervalId: ReturnType<typeof setInterval> | null = null;
  private _lastHealthUpdate: number = 0; // Tijd van laatste health update
  private _healthUpdateInterval: number = 1000; // Update health elke 1000ms (was 500)
  private _spawnTimerId: NodeJS.Timer | null = null;
  private _fastStalkerSpawnCounter: number = 0;
  
  constructor(world: World) {
    this._world = world;
    
    // Zoek naar de GameManager in de wereld
    setTimeout(() => {
      this.findGameManager();
    }, 1000); // Geef de GameManager tijd om te initialiseren
    
    // Event listener voor speler join om bosses te activeren
    this._world.on(PlayerEvent.JOINED_WORLD, ({ player }: { player: Player }) => {
      this._checkAndSpawnBosses();
    });
    
    // Start de update interval voor boss targeting met een lagere frequentie voor betere performance
    this._updateInterval = 1000; // Verhoog van 500ms naar 1000ms voor betere performance
    this._updateIntervalId = setInterval(() => this._updateBossTargets(), this._updateInterval);
    
  }
  
  // Zoek de GameManager in de wereld
  private findGameManager(): void {
    try {
      // Cache gamemanager reference to avoid repeated searches
      if (this._gameManager) return;
      
      const gameManagers = this._world.entityManager.getAllEntities()
        .filter(entity => entity.name === 'GameManager');
      
      if (gameManagers.length > 0) {
        this._gameManager = gameManagers[0];
      } else {
        console.warn('[BossManager] GameManager not found in entity list');
      }
    } catch (error) {
      console.error('[BossManager] Error finding GameManager:', error);
    }
  }
  
  // Verkrijg de ItemSpawner via de GameManager
  public getItemSpawner(): any | null {
    if (!this._gameManager) {
      this.findGameManager(); // Probeer opnieuw te vinden als we het nog niet hebben
    }
    
    if (this._gameManager && typeof this._gameManager.getItemSpawner === 'function') {
      return this._gameManager.getItemSpawner();
    }
    
    return null;
  }
  
  // Initialize the boss system - centralized point for starting the boss system
  public init(): void {
    
    // Setup default boss spawners
    this.setupDefaultBosses();
    
    // Start met spawnen van initial bosses
    this.spawnBosses();
    
    // Luister naar player join event
    this._world.on('player-join', (event) => {
      this._checkAndSpawnBosses();
    });
    
    // Start een timer om elke 10 seconden een fast-stalker te spawnen
    this._startFastStalkerSpawnTimer();
    
  }
  
  // Update waar bosses naar toe bewegen (volgen dichtstbijzijnde speler)
  private _updateBossTargets(): void {
    try {
      // Skip update if no bosses are active
      if (this._activeBosses.size === 0) return;
      
      // Verkrijg alle playerEntities - cache voor hergebruik binnen deze update cyclus
      const playerEntities = this._world.entityManager.getAllEntities().filter(
        entity => entity instanceof PlayerEntity && entity.isSpawned
      ) as PlayerEntity[];
      
      if (playerEntities.length === 0) return;
      
      // Voor elke actieve boss
      for (const boss of this._activeBosses.values()) {
        if (!boss.isSpawned) continue;
        
        // Vind de dichtstbijzijnde speler
        let closestPlayer: PlayerEntity | null = null;
        let closestDistance = Infinity;
        
        for (const playerEntity of playerEntities) {
          const distance = this._getDistance(boss.position, playerEntity.position);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = playerEntity;
          }
        }
        
        // Als we een speler hebben gevonden en de boss een StalkerBoss is
        if (closestPlayer && boss instanceof StalkerBoss) {
          // Alleen volgen binnen detectie range (met een kleine buffer)
          const detectionRangeWithBuffer = 20; // Vaste grootte voor eenvoud
          
          if (closestDistance <= detectionRangeWithBuffer) {
            boss.setTargetPosition(closestPlayer.position);
          } else {
            boss.resetTargetPosition();
          }
        }
      }
      
      // Check of we boss health moeten updaten naar UI - throttle health updates to 1 per second
      const now = Date.now();
      if (now - this._lastHealthUpdate >= this._healthUpdateInterval) {
        this._updateBossHealthUI();
        this._lastHealthUpdate = now;
      }
      
    } catch (error) {
      console.error('[BossManager] Error updating boss targets:', error);
    }
  }
  
  // Update boss health info naar alle spelers
  private _updateBossHealthUI(): void {
    try {
      // Verkrijg alle bosses
      const bosses = Array.from(this._activeBosses.values());
      if (bosses.length === 0) return;
      
      // Loop door alle bosses
      for (const boss of bosses) {
        if (!boss || !boss.isSpawned) continue;
        
        // Verkrijg health en maxHealth van de boss
        const health = boss.getHealth ? boss.getHealth() : (boss as any)._health || 100;
        const maxHealth = boss.getMaxHealth ? boss.getMaxHealth() : (boss as any)._maxHealth || 100;
        
        // Stuur updates naar alle spelers via de helper methode
        this._sendBossHealthUpdateToPlayers(boss, health, maxHealth);
      }
    } catch (error) {
      console.error('[BossManager] Error updating boss health UI:', error);
    }
  }
  
  // Helper functie voor het berekenen van afstand
  private _getDistance(pos1: Vector3Like, pos2: Vector3Like): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // Cleanup resources when no longer needed
  public destroy(): void {
    if (this._updateIntervalId !== null) {
      clearInterval(this._updateIntervalId);
      this._updateIntervalId = null;
    }
    
    this.despawnAllBosses();
  }
  
  // Spawn alle geregistreerde bosses
  public spawnBosses(): void {
    this._checkAndSpawnBosses();
  }
  
  // Clean up resources
  public dispose(): void {
    // Stop de spawn timer
    this.stopFastStalkerSpawnTimer();
    
    // Despawn alle bosses
    this.despawnAllBosses();
    
  }
  
  // Setup de standaard boss spawners
  public setupDefaultBosses(): void {
    try {
      // Boss 1: Fast Stalker - Snel en agressief
      this.registerBossSpawner("stalker_boss", {
        position: { x: 20, y: 5, z: 20 },
        type: "StalkerBoss",
        options: {
          name: "Fast Stalker",
          modelScale: 1.0,
          
          // Fast stalker stats
          health: 150,
          maxHealth: 150,
          moveSpeed: 6,
          detectionRange: 20,
          
          // Combat eigenschappen
          attackDamage: 15,
          attackCooldown: 500,
          attackRange: 4,
          
          // Knockback eigenschappen
          knockbackForce: 10,
          knockbackCooldown: 800,
          
          // SpeedUp eigenschappen
          speedMultiplier: 2.5,
          speedUpDuration: 3000,
          speedUpCooldown: 12000,
          
          // Pathfinding options - optimized for speed
          pathfindOptions: {
            maxFall: 5,  // Max fall height in blocks
            maxJump: 1,  // Max jump height in blocks
            verticalPenalty: 1.0, // Prefer flat paths
            waypointTimeoutMs: 2000 // Snellere timeout voor snellere boss
          }
        }
      });

      // Boss 2: Tank Stalker - Heavy but slow
      this.registerBossSpawner("tank-stalker", {
        position: { x: -10, y: 5, z: -10 }, // Base Y position (height adjustment happens in Boss.spawn)
        type: "StalkerBoss",
        options: {
          name: "Tank Stalker",
          modelScale: 1.5,
          
          // Tank stalker stats
          health: 400,
          maxHealth: 400,
          moveSpeed: 2,
          detectionRange: 15,
          
          // Combat eigenschappen
          attackDamage: 10,
          attackCooldown: 800,
          attackRange: 4,
          
          // Knockback eigenschappen
          knockbackForce: 20,
          knockbackCooldown: 2000,
          
          // SpeedUp eigenschappen
          speedMultiplier: 1.5,
          speedUpDuration: 4000,
          speedUpCooldown: 15000,
          
          // Pathfinding options - adapted for a heavier boss
          pathfindOptions: {
            maxFall: 3,  // Reduced fall height for the heavy boss
            maxJump: 1,  // Same jump height
            verticalPenalty: 2.0, // Greatly prefer flat paths due to size and weight
            waypointTimeoutMs: 4000 // Longer timeout since it's slower
          }
        }
      });

      // Boss 3: Balanced Stalker - Medium size
      this.registerBossSpawner("balanced-stalker", {
        position: { x: 0, y: 5, z: 20 }, // Base Y position (height adjustment happens in Boss.spawn)
        type: "StalkerBoss",
        options: {
          name: "Balanced Stalker",
          modelScale: 1.25,
          
          // Balanced stalker stats
          health: 250,
          maxHealth: 250,
          moveSpeed: 4,
          detectionRange: 18,
          
          // Combat eigenschappen
          attackDamage: 20,
          attackCooldown: 600,
          attackRange: 4,
          
          // Knockback eigenschappen
          knockbackForce: 15,
          knockbackCooldown: 1000,
          
          // SpeedUp eigenschappen
          speedMultiplier: 2.0,
          speedUpDuration: 3000,  
          speedUpCooldown: 10000,
          
          // Pathfinding options - optimized for balanced movement
          pathfindOptions: {
            maxFall: 4,  // Medium fall height
            maxJump: 1,  // Standard jump height
            verticalPenalty: 1.2, // Slightly prefer flat paths
            waypointTimeoutMs: 3000 // Standard timeout
          }
        }
      });
      
    } catch (error) {
      console.error("[BossManager] Error in setupDefaultBosses:", error);
    }
  }
  
  // Registreer een spawner op een locatie
  public registerBossSpawner(id: string, location: BossSpawnLocation): void {
    this._activeSpawners.set(id, location);
  }
  
  // Verwijder een bossspawner
  public unregisterBossSpawner(id: string): void {
    if (this._activeSpawners.has(id)) {
      this._activeSpawners.delete(id);
    }
  }
  
  // Check of bosses gespawned moeten worden (bijvoorbeeld wanneer een speler joint)
  private _checkAndSpawnBosses(): void {

    
    // Log all registered spawners for debugging
    this._activeSpawners.forEach((spawner, id) => {
    });
    
    // Spawn alleen als er nog geen actieve bosses zijn
    if (this._activeBosses.size === 0) {
      for (const [id, spawner] of this._activeSpawners) {
        const bossId = `${spawner.type}-${this._nextBossId++}`;
        this._spawnBoss(bossId, spawner);
      }
    }
  }
  
  // Spawn een specifieke boss
  private _spawnBoss(bossId: string, spawner: BossSpawnLocation): Boss | null {
    try {
      
      let boss: Boss | null = null;
      
      // De boss aanmaken op basis van het type
      switch(spawner.type) {
        case 'StalkerBoss':
          
        boss = new StalkerBoss({
          name: spawner.options?.name || `Stalker Boss ${this._nextBossId - 1}`,
          ...spawner.options
        });
          
          if (boss) {
            // Registreer health update event
            boss.on('health-update', (data) => {
              if (data && data.health !== undefined && data.maxHealth !== undefined) {
                
                // Stuur update naar alle spelers
                this._sendBossHealthUpdateToPlayers(boss as Boss, data.health, data.maxHealth);
              }
            });
            
            // Spawn de boss in de wereld
            boss.spawn(this._world, spawner.position);
            
            // Voeg toe aan active bosses
            this._activeBosses.set(bossId, boss);
            
            // We maken geen health bar meer aan vanuit de BossManager, omdat StalkerBoss dit zelf al doet
            // this._createBossHealthSceneUI(boss);
            
          }
        break;
        
      default:
        console.warn(`[BossManager] Unknown boss type: ${spawner.type}`);
        return null;
    }
    
      return boss;
    } catch (error) {
      console.error('[BossManager] Error spawning boss:', error);
      return null;
    }
  }
  
  // Helper functie om boss health updates te sturen naar alle spelers
  private _sendBossHealthUpdateToPlayers(boss: Boss, health: number, maxHealth: number): void {
    try {
      if (!boss || !boss.isSpawned) return;
      
      // Get all players
      const players = this._world.entityManager.getAllEntities().filter(
        entity => entity instanceof PlayerEntity && entity.isSpawned
      ).map(entity => (entity as PlayerEntity).player);
      
      // Stuur health update naar alle players
      for (const player of players) {
        if (!player || !player.ui) continue;
        
        try {
          player.ui.sendData({
            type: 'boss-health-update',
            current: health,
            max: maxHealth
          });
      } catch (error) {
          console.error('[BossManager] Failed to send health update:', error);
        }
      }
    } catch (error) {
      console.error('[BossManager] Error sending boss health update:', error);
    }
  }
  
  // Spawn een boss manueel op een locatie
  public spawnBossAt(type: string, position: Vector3Like, options?: any): Boss | null {
    const bossId = `${type}-${this._nextBossId++}`;
    return this._spawnBoss(bossId, {
      position,
      type,
      options
    });
  }
  
  // Verwijder alle actieve bosses
  public despawnAllBosses(): void {
    
    for (const [id, boss] of this._activeBosses) {
      if (boss && boss.isSpawned) {
        boss.despawn();
      }
    }
    
    this._activeBosses.clear();
  }
  
  // Geef een actieve boss op basis van ID
  public getBossById(id: string): Boss | undefined {
    return this._activeBosses.get(id);
  }
  
  // Geef alle actieve bosses
  public getActiveBosses(): Boss[] {
    return Array.from(this._activeBosses.values());
  }
  
  // Start de spawn timer voor fast-stalker bosses
  private _startFastStalkerSpawnTimer(): void {
    
    // Voorkom meerdere timers
    if (this._spawnTimerId !== null) {
      clearInterval(this._spawnTimerId);
    }
    
    // Start een nieuwe timer die elke 15 seconden een fast-stalker spawnt
    // Verhoog interval van 10 naar 15 seconden voor betere performance
    this._spawnTimerId = setInterval(() => {
      // Alleen spawn als er actieve spelers zijn en nog niet teveel bosses zijn
      if (this._world.entityManager.getAllPlayerEntities().length > 0 &&
          this._activeBosses.size < 8) { // Limit to 8 active bosses maximum
        this._spawnFastStalker();
      }
    }, 15000); // 15 seconden (was 10 seconden)
  }
  
  // Stop de spawn timer
  public stopFastStalkerSpawnTimer(): void {
    if (this._spawnTimerId !== null) {
      clearInterval(this._spawnTimerId);
      this._spawnTimerId = null;
    }
  }
  
  // Spawn een nieuwe fast-stalker op een random locatie rond de starter positie
  private _spawnFastStalker(): void {
    this._fastStalkerSpawnCounter++;
    
    // Bepaal een random offset voor de spawn positie
    const randomX = (Math.random() * 20) - 10; // -10 tot 10
    const randomZ = (Math.random() * 20) - 10; // -10 tot 10
    
    // Basis positie plus random offset
    const basePosition = { x: 10, y: 5, z: 10 };
    const spawnPosition = {
      x: basePosition.x + randomX,
      y: basePosition.y,  // Standard Y height is fine for scale 1.0
      z: basePosition.z + randomZ
    };
    
    const bossId = `fast-stalker-${this._fastStalkerSpawnCounter}`;
    
    // The modelScale for fast stalkers is 1.0, so no height adjustment is needed
    
    // Spawn de boss met unieke naam
    const spawner = {
      position: spawnPosition,
      type: 'StalkerBoss',
      options: {
        name: `Snelle Stalker #${this._fastStalkerSpawnCounter}`,
        modelScale: 1.0, // Explicitly set 1.0 scale
        
        // Snelle stalker stats
        health: 150,
        maxHealth: 150,
        moveSpeed: 5,
        detectionRange: 20,
        
        // Combat eigenschappen
        attackDamage: 5,
        attackCooldown: 400,
        attackRange: 4,
        
        // Knockback eigenschappen
        knockbackForce: 15,
        knockbackCooldown: 300,
        
        // SpeedUp eigenschappen
        speedMultiplier: 2.5,
        speedUpDuration: 2000,
        speedUpCooldown: 7000,
        
        // Pathfinding options optimized for fast movement
        pathfindOptions: {
          maxFall: 5,    // Can fall from higher places
          maxJump: 1.5,  // Can jump a bit higher
          verticalPenalty: 0.8, // Less penalty for vertical movement (more agile)
          waypointTimeoutMs: 2000 // Faster waypoint timeout
        }
      }
    };
    
    // Spawn de boss
    this._spawnBoss(bossId, spawner);
  }

  // Helper functie voor een boss callback
  private _spawnFromCallback(boss: Boss, position: Vector3Like): void {
    if (!boss) return;
    
    // Voeg de boss toe aan de active bosses
    const bossId = `callback-${this._nextBossId++}`;
    
    // Spawn de boss in de wereld
    boss.spawn(this._world, position);
    
    // Registreer health update events
    boss.on('health-update', (data) => {
      if (data && data.health !== undefined && data.maxHealth !== undefined) {
        const health = data.health;
        const maxHealth = data.maxHealth;
        
        
        // Stuur update naar alle spelers
        this._sendBossHealthUpdateToPlayers(boss, health, maxHealth);
      }
    });
    
    // Sla de boss op in de active bosses map
    this._activeBosses.set(bossId, boss);
  }
} 