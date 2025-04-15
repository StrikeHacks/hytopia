import { World, Entity, PlayerEntity, EntityEvent, type Player, PlayerEvent, SceneUI } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import { Boss } from '../bosses/Boss';
import { StalkerBoss } from '../bosses/StalkerBoss';
import { getStalkerBossConfig } from '../bosses/stalkerBosses';

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
    
    // Event listener voor speler join om bosses te activeren
    this._world.on(PlayerEvent.JOINED_WORLD, ({ player }: { player: Player }) => {
      this._checkAndSpawnBosses();
    });
    
    // Start de update interval voor boss targeting met een lagere frequentie voor betere performance
    this._updateInterval = 1000; // Verhoog van 500ms naar 1000ms voor betere performance
    this._updateIntervalId = setInterval(() => this._updateBossTargets(), this._updateInterval);
  }
  
  // Helper function to get the global GameManager instance
  private getGameManager(): any {
    // @ts-ignore
    return global.gameManagerInstance;
  }
  
  // Verkrijg de ItemSpawner via de GameManager
  public getItemSpawner(): any | null {
    const gameManager = this.getGameManager();
    if (gameManager && typeof gameManager.getItemSpawner === 'function') {
      return gameManager.getItemSpawner();
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
      // Register default stalker boss spawners using configurations
      this.registerBossSpawner("stalker-fast", {
        position: { x: 20, y: 5, z: 20 },
        type: "StalkerBoss",
        options: getStalkerBossConfig('fast-stalker')
      });

      this.registerBossSpawner("stalker-tank", {
        position: { x: -10, y: 5, z: -10 },
        type: "StalkerBoss",
        options: getStalkerBossConfig('tank-stalker')
      });

      this.registerBossSpawner("stalker-balanced", {
        position: { x: 0, y: 5, z: 20 },
        type: "StalkerBoss",
        options: getStalkerBossConfig('balanced-stalker')
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
    // Spawn alleen als er nog geen actieve bosses zijn
    // if (this._activeBosses.size === 0) {
    //     for (const [id, spawner] of this._activeSpawners) {
    //         const bossId = `${spawner.type}-${this._nextBossId++}`;
    //         this._spawnBoss(bossId, spawner);
    //     }
    // }
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
            
            // Register boss-death event to handle XP rewards
            boss.on('boss-death', (data) => {
              // Ensure the boss and data are valid
              if (!boss || !data) {
                return;
              }
              
              // Check if we have a valid player source 
              if (!data.source || !(data.source instanceof PlayerEntity)) {
                return;
              }
              
              try {
                // Get the player who killed the boss
                const player = data.source as PlayerEntity;
                if (!player.player || !player.player.id) {
                  return;
                }
                
                const playerId = player.player.id;
                
                // Get the XP reward value
                const bossType = spawner.type.toLowerCase();
                let xpReward = 0;
                
                // Try to get the boss config
                try {
                  const bossConfig = spawner.options;
                  if (bossConfig && bossConfig.xpReward) {
                    xpReward = bossConfig.xpReward;
                  } else {
                    xpReward = 100; // Default XP
                  }
                } catch (error) {
                  xpReward = 100; // Default XP on error
                }
                
                // Direct access to global GameManager
                const gameManager = this.getGameManager();
                if (!gameManager) {
                  return;
                }
                
                // Get the LevelManager
                if (typeof gameManager.getLevelManager !== 'function') {
                  return;
                }
                
                const levelManager = gameManager.getLevelManager();
                if (!levelManager) {
                  return;
                }
                
                // Award XP to the player
                try {
                  // Get current stats
                  const currentLevel = levelManager.getPlayerLevel(playerId);
                  
                  // Add XP
                  const leveledUp = levelManager.addPlayerXP(playerId, xpReward);
                  
                  // Get new stats
                  const newLevel = levelManager.getPlayerLevel(playerId);
                  
                  // Send a message to the player
                  const message = leveledUp
                    ? `You defeated ${boss.name} and gained ${xpReward} XP! You leveled up to level ${newLevel}!`
                    : `You defeated ${boss.name} and gained ${xpReward} XP!`;
                  
                  player.player.ui.sendData({
                    notification: {
                      message,
                      type: 'success',
                      duration: 5000
                    }
                  });
                } catch (error) {
                  console.error('[BossManager] Error awarding XP:', error);
                }
              } catch (error) {
                console.error('[BossManager] Error in boss-death handler:', error);
              }
            });
            
            // Spawn de boss in de wereld
            boss.spawn(this._world, spawner.position);
            
            // Voeg toe aan active bosses
            this._activeBosses.set(bossId, boss);
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
  
  }
  
  // Stop de spawn timer
  public stopFastStalkerSpawnTimer(): void {
    if (this._spawnTimerId !== null) {
      clearInterval(this._spawnTimerId);
      this._spawnTimerId = null;
    }
  }
} 