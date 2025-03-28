import { Entity, World, RigidBodyType, ColliderShape, EntityEvent, CollisionGroup, PathfindingEntityController, PlayerEntity } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import { globalItemSpawner } from '../managers/GameManager';

// Interface voor het configureren van een boss
export interface BossOptions {
  name: string;
  modelUri: string;
  modelScale?: number;
  health?: number;
  maxHealth?: number;
  moveSpeed?: number;
  detectionRange?: number;
  canPatrol?: boolean;
  patrolRadius?: number;
  controller?: PathfindingEntityController; // Add support for custom controller
  rigidBodyOptions?: any; // Allow passing custom rigid body options
  pathfindOptions?: {
    maxFall?: number;
    maxJump?: number;
    verticalPenalty?: number;
    waypointTimeoutMs?: number;
  };
  dropItems?: string[]; // Items that the boss drops when defeated
}

// Export pathfinding opties voor gemakkelijk hergebruik
export const DEFAULT_PATHFIND_OPTIONS = {
  maxFall: 3,       // Default maximum fall height (blocks)
  maxJump: 1,       // Default maximum jump height (blocks)
  verticalPenalty: 1.2,  // Slightly prefer avoiding vertical movement
  waypointTimeoutMs: 3000 // Default timeout for reaching waypoints
};

// Basis abstracte Boss klasse
export abstract class Boss extends Entity {
  // Health eigenschappen
  protected _health: number;
  protected _maxHealth: number;
  
  // Beweging en gedrag
  protected _moveSpeed: number;
  protected _detectionRange: number;
  protected _canPatrol: boolean;
  protected _patrolRadius: number;
  protected _bossScale: number; // Opslag voor de modelScale
  
  // Pathfinding properties
  protected _pathfindingController: PathfindingEntityController | null = null;
  protected _lastPathfindTime: number = 0;
  protected _PATHFIND_INTERVAL: number = 3000; // Time between pathfinding updates
  protected _PATHFIND_MINIMUM_DISTANCE: number = 2.5; // Minimum distance for pathfinding
  protected _pathfindOptions: {
    maxFall: number;
    maxJump: number;
    verticalPenalty: number;
    waypointTimeoutMs: number;
  };
  protected _isWaitingAtJump: boolean = false;
  protected _jumpWaitTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Drop item properties
  protected _dropItems: string[] = []; // Default empty array if no drops specified
  
  // Track of er recent een log is geweest
  private _lastLogTime: number = 0;
  private _logInterval: number = 2000; // 2 seconden tussen logs
  
  // Cached copies of entities to reduce frequent searches
  private _cachedItemSpawner: any | null = null;
  private _cachedBossManager: any | null = null;
  private _cachedGameManager: any | null = null;
  private _lastCacheTime: number = 0;
  private _cacheRefreshInterval: number = 10000; // 10 seconds between cache refreshes
  
  // Voeg target position property toe
  protected _targetPosition: Vector3Like | null = null;
  
  constructor(options: BossOptions) {
    const modelScale = options.modelScale || 1.0;
    
    // Default pathfinding options
    const defaultPathfindOptions = {
      maxFall: DEFAULT_PATHFIND_OPTIONS.maxFall,
      maxJump: DEFAULT_PATHFIND_OPTIONS.maxJump,
      verticalPenalty: DEFAULT_PATHFIND_OPTIONS.verticalPenalty,
      waypointTimeoutMs: DEFAULT_PATHFIND_OPTIONS.waypointTimeoutMs
    };
    
    // Initialize pathfinding controller if not provided
    const pathfindingController = options.controller || new PathfindingEntityController();
    
    // Store pathfinding options, merging defaults with provided options
    const pathfindOptions = {
      maxFall: options.pathfindOptions?.maxFall || defaultPathfindOptions.maxFall,
      maxJump: options.pathfindOptions?.maxJump || defaultPathfindOptions.maxJump,
      verticalPenalty: options.pathfindOptions?.verticalPenalty || defaultPathfindOptions.verticalPenalty,
      waypointTimeoutMs: options.pathfindOptions?.waypointTimeoutMs || defaultPathfindOptions.waypointTimeoutMs
    };
    
    // Default rigid body options optimized for smooth pathfinding
    const defaultRigidBodyOptions = {
      type: RigidBodyType.DYNAMIC,
      enabledRotations: { x: false, y: true, z: false }, // Prevent tilting but allow Y rotation
      colliders: [
        {
          shape: ColliderShape.CAPSULE,
          halfHeight: modelScale * 1.1, // Increased for better ground clearance
          radius: 0.4 * modelScale,
          friction: 1.0,  // Higher friction for better climbing
          restitution: 0.0 // No bounce
        }
      ],
      gravityScale: 0.9, // Slightly reduced gravity for better jumping
      ccdEnabled: true, // Enable continuous collision detection
      mass: 50 // Lighter mass for better physics
    };
    
    // Basisopties voor de Entity constructor
    super({
      name: options.name,
      modelUri: options.modelUri,
      modelScale: modelScale,
      modelLoopedAnimations: ['idle'],
      rigidBodyOptions: options.rigidBodyOptions || defaultRigidBodyOptions,
      controller: pathfindingController
    });
    
    // Store reference to pathfinding controller
    this._pathfindingController = pathfindingController;
    
    // Store pathfinding options
    this._pathfindOptions = pathfindOptions;
    
    // Boss-specifieke eigenschappen
    this._health = options.health || 100;
    this._maxHealth = options.maxHealth || options.health || 100;
    this._moveSpeed = options.moveSpeed || 5;
    this._detectionRange = options.detectionRange || 10;
    this._canPatrol = options.canPatrol !== undefined ? options.canPatrol : true;
    this._patrolRadius = options.patrolRadius || 10;
    this._bossScale = modelScale; // Sla modelScale op
    
    // Store drop items
    this._dropItems = options.dropItems || [];
    console.log(`[Boss] ${this.name} initialized with drop items:`, this._dropItems);
    
    // Setup event listeners for pathfinding and more frequent vertical orientation checks
    this.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
      this._maintainVerticalOrientation();
      
      // Handle pathfinding tick
      this._handlePathfindingTick(tickDeltaMs);
      
      // If we're waiting at a jump, reduce gravity temporarily for higher jumps
      if (this._isWaitingAtJump && this.isSpawned) {
        // Ease the entity up and over obstacles by temporarily modifying gravity
        this.setGravityScale(0.5); // Reduce gravity to 50% during jumps
      } else if (this.isSpawned) {
        // Make sure we reset to normal gravity when not jumping
        this.setGravityScale(0.9); // Use the default reduced gravity (0.9)
      }
    });
  }
  
  // Handle pathfinding tick logic
  private _handlePathfindingTick(deltaTimeMs: number): void {
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
        // Controleer of we opnieuw pathfinding moeten doen
        const now = Date.now();
        
        // Alleen pathfinding doen als:
        // 1. Er genoeg tijd verstreken is sinds laatste poging
        // 2. De speler ver genoeg weg is
        // 3. De speler niet te ver weg is (voorkom onmogelijke paden)
        // 4. De speler niet te hoog of te laag is (voorkom onmogelijke verticale paden)
        const verticalDiff = Math.abs(this.position.y - closestPlayer.position.y);
        const shouldAttemptPathfinding = 
          now - this._lastPathfindTime > this._PATHFIND_INTERVAL &&
          closestDistance > this._PATHFIND_MINIMUM_DISTANCE &&
          closestDistance < 30 && // Reduced from 50 to 30 for more manageable paths
          verticalDiff < 5; // Don't attempt pathfinding if height difference is too large
        
        if (shouldAttemptPathfinding) {
          // Update de laatste pathfind tijd
          this._lastPathfindTime = now;
          
          // Break the path into segments if distance is large
          const segmentDistance = 15; // Maximum segment length
          let targetPosition: Vector3Like;
          
          if (closestDistance > segmentDistance) {
            // Calculate intermediate target position
            const direction = this._getDirectionToTarget(closestPlayer.position);
            targetPosition = {
              x: this.position.x + direction.x * segmentDistance,
              y: closestPlayer.position.y,
              z: this.position.z + direction.z * segmentDistance
            };
          } else {
            targetPosition = closestPlayer.position;
          }
          
          // Try pathfinding with error handling
          let pathfindingSucceeded = false;
          try {
            pathfindingSucceeded = this.pathfindToTarget(targetPosition);
          } catch (error) {
            console.warn(`[${this.name}] Pathfinding failed, falling back to direct movement`);
          }
          
          if (pathfindingSucceeded) {
            this._updateMovementAnimation(true);
          } else {
            // If pathfinding fails, use direct movement with obstacle avoidance
            this._moveDirectlyTowardsTarget(closestPlayer.position, deltaTimeMs);
          }
        } else {
          // If we're not pathfinding but still need to move
          if (closestDistance > this._PATHFIND_MINIMUM_DISTANCE) {
            this._moveDirectlyTowardsTarget(closestPlayer.position, deltaTimeMs);
          }
        }
        
        // Face the player when close
        if (closestDistance <= this._detectionRange) {
          this._faceTarget(closestPlayer.position);
        }
      }
      
    } catch (error) {
      console.error(`Error in Boss _handlePathfindingTick:`, error);
    }
  }
  
  // Helper method to move directly towards a target when pathfinding fails
  private _moveDirectlyTowardsTarget(targetPosition: Vector3Like, deltaTimeMs: number): void {
    if (!this.isSpawned) return;
    
    try {
      const direction = this._getDirectionToTarget(targetPosition);
      
      // Apply movement with reduced speed
      const moveSpeed = this._moveSpeed * 0.5;
      const movement = {
        x: direction.x * moveSpeed * (deltaTimeMs / 1000),
        y: 0,
        z: direction.z * moveSpeed * (deltaTimeMs / 1000)
      };
      
      // Update position
      const newPosition = {
        x: this.position.x + movement.x,
        y: this.position.y,
        z: this.position.z + movement.z
      };
      
      // Only move if we're not at the exact target position
      if (this._getDistance(this.position, newPosition) > 0.01) {
        this.setPosition(newPosition);
        this._updateMovementAnimation(true);
        }
      } catch (error) {
      console.warn(`[${this.name}] Error in direct movement, skipping:`, error);
    }
  }
  
  // Force vertical orientation to prevent tipping over
  protected _maintainVerticalOrientation(): void {
    if (!this.isSpawned) return;
    
    const currentRotation = this.rotation;
    
    // Extract the Y rotation (keep only rotation around Y axis)
    const yRotationAngle = Math.atan2(
      2.0 * (currentRotation.w * currentRotation.y + currentRotation.x * currentRotation.z),
      1.0 - 2.0 * (currentRotation.y * currentRotation.y + currentRotation.z * currentRotation.z)
    );
    
    // Create a quaternion with only rotation around the Y axis
    const fixedRotation = {
      x: 0,
      y: Math.sin(yRotationAngle / 2),
      z: 0,
      w: Math.cos(yRotationAngle / 2)
    };
    
    // Apply the corrected rotation
    this.setRotation(fixedRotation);
  }
  
  // Face a target position (rotate towards it)
  protected _faceTarget(targetPosition: Vector3Like): void {
    if (!this.isSpawned) return;
    
    // Calculate direction to target
    const direction = {
      x: targetPosition.x - this.position.x,
      z: targetPosition.z - this.position.z
    };
    
    // Only rotate if we have a direction
    if (Math.abs(direction.x) > 0.001 || Math.abs(direction.z) > 0.001) {
      // Calculate angle to target
      const angle = Math.atan2(direction.x, direction.z);
      
      // Create quaternion for this rotation around Y axis
      const rotation = {
        x: 0,
        y: Math.sin(angle / 2),
        z: 0,
        w: Math.cos(angle / 2)
      };
      
      // Apply rotation
      this.setRotation(rotation);
    }
  }
  
  // Update animation based on movement state
  protected _updateMovementAnimation(isMoving: boolean): void {
    if (!this.isSpawned) return;
    
    try {
      if (isMoving) {
        this.startModelLoopedAnimations(['walk']);
      } else {
        this.startModelLoopedAnimations(['idle']);
      }
    } catch (e) {
      // Silent fail for animation errors
    }
  }
  
  // Pathfind to a target position
  public pathfindToTarget(targetPosition: Vector3Like): boolean {
    if (!this.isSpawned || !this._pathfindingController) return false;
    
    try {
      // Don't log every pathfinding attempt to reduce spam
      const distance = this._getDistance(this.position, targetPosition);
      
      // Skip pathfinding if target is too close or too far
      if (distance < this._PATHFIND_MINIMUM_DISTANCE || distance > 30) {
        return false;
      }
      
      // Adjust pathfinding options based on distance and boss scale
      const adjustedOptions = {
        ...this._pathfindOptions,
        maxFall: Math.min(this._pathfindOptions.maxFall, 3), // Limit max fall to prevent risky paths
        maxJump: Math.min(this._pathfindOptions.maxJump, 2), // Limit max jump to prevent impossible jumps
        verticalPenalty: this._pathfindOptions.verticalPenalty * (1 + distance / 15), // Increase penalty with distance
        waypointTimeoutMs: Math.min(3000, this._pathfindOptions.waypointTimeoutMs) // Cap timeout
      };
      
      return this._pathfindingController.pathfind(
        targetPosition,
        this._PATHFIND_MINIMUM_DISTANCE,
        {
          ...adjustedOptions,
          debug: false, // Disable debug to reduce console spam
          pathfindCompleteCallback: () => {
            this._updateMovementAnimation(false);
            this._isWaitingAtJump = false;
          },
          waypointMoveCompleteCallback: () => {
            if (this._isWaitingAtJump) {
              this._isWaitingAtJump = false;
              if (this._jumpWaitTimer) {
                clearTimeout(this._jumpWaitTimer);
                this._jumpWaitTimer = null;
              }
            }
          },
          waypointMoveSkippedCallback: () => {
            if (!this._isWaitingAtJump) {
              this._handleStuckState(targetPosition);
            }
          }
        }
      );
    } catch (error) {
      // Don't log every error to reduce console spam
      return false;
    }
  }
  
  // Handle stuck state with jump attempts
  private _handleStuckState(targetPosition: Vector3Like): void {
    this._isWaitingAtJump = true;
    
    const dirToTarget = this._getDirectionToTarget(targetPosition);
    
    // Scale-based impulses with reduced magnitude
    const forwardMultiplier = this._bossScale <= 1.0 ? 6 : 12;
    const upwardForce = this._bossScale <= 1.0 ? 8 : 15;
    
    // Apply initial jump impulse
    this.applyImpulse({ 
      x: dirToTarget.x * forwardMultiplier,
      y: upwardForce,
      z: dirToTarget.z * forwardMultiplier
    });
    
    // Reset state after a shorter delay
    this._jumpWaitTimer = setTimeout(() => {
      this._isWaitingAtJump = false;
      this._jumpWaitTimer = null;
    }, 500);
  }
  
  // Helper method to get direction to a target position
  private _getDirectionToTarget(targetPosition: Vector3Like): {x: number, y: number, z: number} {
    if (!this.isSpawned) return {x: 0, y: 0, z: 0};
    
    const direction = {
      x: targetPosition.x - this.position.x,
      y: targetPosition.y - this.position.y,
      z: targetPosition.z - this.position.z
    };
    
    // Normalize the direction vector
    const magnitude = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    if (magnitude > 0.001) {
      direction.x /= magnitude;
      direction.z /= magnitude;
    }
    
    return direction;
  }
  
  // Helper functie om te bepalen of we moeten loggen
  private _shouldLog(): boolean {
    const now = Date.now();
    if (now - this._lastLogTime > this._logInterval) {
      this._lastLogTime = now;
      return true;
    }
    return false;
  }
  
  // Spawnt de boss in de wereld
  public spawn(world: World, position: Vector3Like): void {
    try {
      // Fix: gedifferentieerde aanpak voor grote vs kleine bosses
      let heightAdjustment = 0;
      
      // Alleen significante hoogte-aanpassing voor grote bosses
      if (this._bossScale > 1.0) {
        // Voor grotere bosses, bereken een progressieve aanpassing
        const scaleModifier = this._bossScale - 1.0;
        // Basis is nu 1.0 voor ALLEEN grote bosses
        const baseHeightAdjustment = 1.0;  
        // Verminderde proportionele aanpassing (4x schaalverschil ipv 6x)
        const proportionalAdjustment = scaleModifier * 4;
        // Veiligheidsbuffer alleen voor grote bosses
        const safetyBuffer = 0.2;
        
        heightAdjustment = baseHeightAdjustment + proportionalAdjustment + safetyBuffer;
      } else {
        // Voor normale bosses (schaal 1.0), slechts een kleine aanpassing van 0.2
        heightAdjustment = 0.2;
      }
      
      // Spawn positie met gedifferentieerde hoogte-aanpassing
      const spawnPosition = {
        x: position.x,
        y: position.y + heightAdjustment,
        z: position.z
      };
      
      console.log(`[${this.name}] Spawning with scale ${this._bossScale}, height adjustment ${heightAdjustment.toFixed(2)}`);
      console.log(`[${this.name}] Original position: ${JSON.stringify(position)}, adjusted: ${JSON.stringify(spawnPosition)}`);
      
      super.spawn(world, spawnPosition);
      
      // Explicitly set physics options after spawn for better ground interaction
      this.setCollisionGroupsForSolidColliders({
        belongsTo: [CollisionGroup.ENTITY],
        collidesWith: [CollisionGroup.BLOCK, CollisionGroup.ENTITY]
      });
      
      // FIX: Alleen upward impuls voor grote bosses, NIET voor kleine bosses
      if (this._bossScale > 1.0) {
        setTimeout(() => {
          if (this.isSpawned) {
            // Gematigde opwaartse impuls ALLEEN voor grote bosses
            this.applyImpulse({ x: 0, y: 5, z: 0 });
            
            // Second impulse with delay for larger bosses
            setTimeout(() => {
              if (this.isSpawned) {
                this.applyImpulse({ x: 0, y: 2, z: 0 });
              }
            }, 100);
          }
        }, 50);
      }
      
      try {
        this.startModelLoopedAnimations(['idle']);
      } catch (e) {
        console.warn(`Kon animaties niet starten voor ${this.name}:`, e);
      }
    } catch (error) {
      console.error(`Fout bij spawnen van boss ${this.name}:`, error);
    }
  }
  
  // Helper function to calculate distance between positions
  protected _getDistance(pos1: Vector3Like, pos2: Vector3Like): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // Damage nemen
  public takeDamage(amount: number, fromPlayerAttack: boolean = false): void {
    if (!this.isSpawned) return;
    
    console.log(`[Boss] ${this.name} neemt ${amount} schade, van speler: ${fromPlayerAttack}`);
    
    // Update health
      this._health -= amount;
      
    // Stuur een damage event
    this.emit('damage', { amount, health: this._health, maxHealth: this._maxHealth, fromPlayerAttack });
    
    // Stuur direct een health-update event voor UI updates
    this.emit('health-update', {
      health: this._health,
      maxHealth: this._maxHealth
    });
    
    // Check for death
      if (this._health <= 0) {
      console.log(`[Boss] ${this.name} is verslagen`);
      this.emit('death', { name: this.name });
      // Geen despawn meer hier, dat gebeurt nu in de subclass voor onmiddellijke despawn
    }
  }
  
  // Getters voor health waarden
  public getHealth(): number {
    return this._health;
  }
  
  public getMaxHealth(): number {
    return this._maxHealth;
  }
  
  // Schade toebrengen
  public dealDamage(target: Entity, amount: number): void {
    try {
      // Controleer of entity nog bestaat en spawned is
      if (!this.isSpawned || !target || !target.isSpawned) {
        return;
      }
      
      if (this._shouldLog()) {
        console.log(`${this.name} valt ${target.name} aan voor ${amount} schade`);
      }
      
      // Als het target een takeDamage methode heeft, roep het aan
      if (typeof (target as any).takeDamage === 'function') {
        (target as any).takeDamage(amount);
      }
    } catch (error) {
      console.error(`Fout bij dealDamage voor ${this.name}:`, error);
    }
  }
  
  // Beweeg naar een positie
  protected _move(targetPosition: Vector3Like, deltaTimeMs: number): void {
    try {
      if (!this.isSpawned) return;
      
      const position = this.position;
    const direction = {
        x: targetPosition.x - position.x,
        y: 0, // Geen verticale beweging
        z: targetPosition.z - position.z
      };
      
      // Bereken afstand tot target
      const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
      
      // Alleen bewegen als we verder dan 2.5 units van het target zijn
      if (distance > 0.01) {
        // Normaliseer de richting
        direction.x /= distance;
        direction.z /= distance;
        
        // Bereken bewegingssnelheid
        const moveSpeed = this._moveSpeed;
        
        // Pas direct de positie aan
        const newPosition = {
          x: position.x + direction.x * moveSpeed * deltaTimeMs / 1000,
          y: position.y, // Behoud huidige Y om de zwaartekracht te laten werken
          z: position.z + direction.z * moveSpeed * deltaTimeMs / 1000
        };
        
        // Gebruik setPosition
        this.setPosition(newPosition);
        
        // Kijk in de bewegingsrichting
        const lookAngle = Math.atan2(direction.x, direction.z);
        this.setRotation({
          x: 0,
          y: Math.sin(lookAngle / 2),
          z: 0,
          w: Math.cos(lookAngle / 2)
        });
        
        // Probeer animaties te wisselen
        try {
          this.startModelLoopedAnimations(['walk']);
        } catch (e) {}
      } else {
        // Als we dichtbij genoeg zijn, ga terug naar idle
        try {
          this.startModelLoopedAnimations(['idle']);
        } catch (e) {}
      }
    } catch (error) {
      console.error(`Fout in Boss _move:`, error);
    }
  }
  
  // Geeft de modelScale terug
  public getBossScale(): number {
    return this._bossScale;
  }

  // Behandel damage aan de boss
  public damage(amount: number, source?: Entity): void {
    if (!this.isSpawned || this._health <= 0) return;
    
    // Verlaag health
    const oldHealth = this._health;
    this._health = Math.max(0, this._health - amount);
    
    // Toon damage feedback ALLEEN als we echt damage nemen (health verlies)
    if (this._health < oldHealth && this.isSpawned) {
      // Korte flash effect
      this.setOpacity(0.6);
      setTimeout(() => {
        if (this.isSpawned) {
          this.setOpacity(1.0);
        }
      }, 150);
    }
    
    // Stuur health update event
    this.emit('health-update', {
      health: this._health,
      maxHealth: this._maxHealth,
      source
    });
    
    // Controleer op dood
    if (this._health <= 0) {
      this._onDeath(source);
    }
  }
  
  // Interne methode voor afhandeling van dood
  protected _onDeath(source?: Entity): void {
    if (!this.isSpawned || !this.world) return;
    
    console.log(`Boss ${this.name} is defeated by ${source ? source.name : 'unknown'}`);
    console.log(`[Boss] Drop items configured:`, this._dropItems);
    
    // Geen items om te droppen
    if (!this._dropItems || this._dropItems.length === 0) {
      console.log(`[Boss] No drop items configured for ${this.name}`);
      return;
    }
    
    // Drop geconfigureerde items
    this._dropItems.forEach(itemType => {
      try {
        console.log(`[Boss] Attempting to drop item ${itemType}`);
        
        let itemSpawnerFound = false;
        
        // METHODE 0: Probeer de globale ItemSpawner te gebruiken via GameManager
        if (globalItemSpawner && typeof globalItemSpawner.handleBlockDrop === 'function') {
          console.log(`[Boss] Gevonden globale ItemSpawner via GameManager, gebruiken voor drop`);
          globalItemSpawner.handleBlockDrop(itemType, this.position);
          console.log(`[Boss] Dropped item ${itemType} via globale ItemSpawner`, this.position);
          itemSpawnerFound = true;
        } else {
          console.log(`[Boss] Geen globale ItemSpawner gevonden in GameManager (${globalItemSpawner ? 'object bestaat' : 'null'}), probeer andere methodes`);
        }
        
        // Als de globale ItemSpawner niet werkt, probeer andere methoden
        if (!itemSpawnerFound) {
          // METHODE 1: Zoek de ItemSpawner in de wereld
          const itemSpawners = this.world?.entityManager.getAllEntities()
            .filter(entity => entity.name === 'ItemSpawner') || [];
          
          console.log(`[Boss] Found ${itemSpawners.length} ItemSpawners directly`);
          
          if (itemSpawners.length > 0) {
            const itemSpawner = itemSpawners[0] as any;
            console.log(`[Boss] ItemSpawner found directly:`, itemSpawner.name);
            
            if (itemSpawner && typeof itemSpawner.handleBlockDrop === 'function') {
              // Drop het item op de positie van de boss
              console.log(`[Boss] Calling handleBlockDrop for ${itemType} at position`, this.position);
              itemSpawner.handleBlockDrop(itemType, this.position);
              console.log(`[Boss] Dropped item ${itemType} at position via direct ItemSpawner`, this.position);
              itemSpawnerFound = true;
            } else {
              console.warn(`[Boss] ItemSpawner found directly but handleBlockDrop method is not available`, 
                typeof itemSpawner === 'object' ? Object.keys(itemSpawner) : typeof itemSpawner);
            }
          } 
          
          // METHODE 2: Als er geen ItemSpawner is, probeer via de BossManager
          if (!itemSpawnerFound) {
            console.log(`[Boss] Looking for BossManager to get ItemSpawner`);
            const bossManagers = this.world?.entityManager.getAllEntities()
              .filter(entity => entity.name === 'BossManager') || [];
            
            console.log(`[Boss] Found ${bossManagers.length} BossManagers`);
            
            if (bossManagers.length > 0) {
              const bossManager = bossManagers[0] as any;
              console.log(`[Boss] BossManager found:`, bossManager.name);
              
              if (bossManager && bossManager.getItemSpawner && typeof bossManager.getItemSpawner === 'function') {
                console.log(`[Boss] BossManager has getItemSpawner method`);
                const itemSpawner = bossManager.getItemSpawner();
                console.log(`[Boss] Retrieved ItemSpawner from BossManager:`, itemSpawner ? 'success' : 'null');
                
                if (itemSpawner && typeof itemSpawner.handleBlockDrop === 'function') {
                  console.log(`[Boss] Calling handleBlockDrop via BossManager for ${itemType}`);
                  itemSpawner.handleBlockDrop(itemType, this.position);
                  console.log(`[Boss] Dropped item ${itemType} at position via BossManager`, this.position);
                  itemSpawnerFound = true;
                } else {
                  console.warn(`[Boss] ItemSpawner from BossManager doesn't have handleBlockDrop method`);
                  if (itemSpawner) {
                    console.log(`[Boss] ItemSpawner from BossManager methods:`, Object.keys(itemSpawner));
                  }
                }
              } else {
                console.warn(`[Boss] BossManager doesn't have getItemSpawner method`);
                if (bossManager) {
                  console.log(`[Boss] BossManager methods:`, Object.keys(bossManager));
                }
              }
            }
          }
          
          // METHODE 3: Als er nog steeds geen ItemSpawner is, probeer via de GameManager
          if (!itemSpawnerFound) {
            console.log(`[Boss] No ItemSpawner or BossManager found, looking for GameManager`);
            const gameManagers = this.world?.entityManager.getAllEntities()
              .filter(entity => entity.name === 'GameManager') || [];
            
            console.log(`[Boss] Found ${gameManagers.length} GameManagers`);
            
            if (gameManagers.length > 0) {
              const gameManager = gameManagers[0] as any;
              console.log(`[Boss] GameManager found:`, gameManager.name);
              
              if (gameManager && gameManager.getItemSpawner && typeof gameManager.getItemSpawner === 'function') {
                console.log(`[Boss] GameManager has getItemSpawner method`);
                const itemSpawner = gameManager.getItemSpawner();
                console.log(`[Boss] Retrieved ItemSpawner from GameManager:`, itemSpawner ? 'success' : 'null');
                
                if (itemSpawner && typeof itemSpawner.handleBlockDrop === 'function') {
                  console.log(`[Boss] Calling handleBlockDrop through GameManager for ${itemType}`);
                  itemSpawner.handleBlockDrop(itemType, this.position);
                  console.log(`[Boss] Dropped item ${itemType} at position via GameManager`, this.position);
                  itemSpawnerFound = true;
                } else {
                  console.warn(`[Boss] ItemSpawner from GameManager doesn't have handleBlockDrop method`);
                  if (itemSpawner) {
                    console.log(`[Boss] ItemSpawner methods:`, Object.keys(itemSpawner));
                  }
                }
              } else {
                console.warn(`[Boss] GameManager doesn't have getItemSpawner method`);
                if (gameManager) {
                  console.log(`[Boss] GameManager methods:`, Object.keys(gameManager));
                }
              }
            } else {
              console.warn(`[Boss] No ItemSpawner, BossManager or GameManager found to drop items`);
            }
          }
          
          // FALLBACK: Als we helemaal niets konden vinden, probeer een directe manier
          if (!itemSpawnerFound) {
            console.log(`[Boss] FALLBACK: Attempting to access world._itemSpawner`);
            const worldAny = this.world as any;
            if (worldAny._itemSpawner && typeof worldAny._itemSpawner.handleBlockDrop === 'function') {
              console.log(`[Boss] Found world._itemSpawner, using it for drop`);
              worldAny._itemSpawner.handleBlockDrop(itemType, this.position);
              console.log(`[Boss] Dropped item ${itemType} using world._itemSpawner`);
            } else {
              console.error(`[Boss] FAILED TO FIND ANY METHOD TO DROP ITEMS for ${this.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`[Boss] Error dropping item ${itemType}:`, error);
      }
    });
    
    // Stop alle animaties
    this.stopModelAnimations(['idle', 'walk', 'run', 'attack']);
    
    // Speel dood animatie (indien beschikbaar)
    if (this.hasModelAnimation('death')) {
      this.startModelAnimation('death', false);
      
      // Despawn na animatie
      setTimeout(() => {
        if (this.isSpawned) {
          this.despawn();
        }
      }, 2000); // Tijd voor death animatie
    } else {
      // Geen dood animatie, despawn direct
      this.despawn();
    }
    
    // Stuur specifiek dood event
    this.emit('boss-death', {
      boss: this,
      source
    });
  }
  
  // Controleer of een animatie beschikbaar is
  public hasModelAnimation(animationName: string): boolean {
    // Standaard implementatie: we gaan ervan uit dat alle bosses 
    // dezelfde basis animaties hebben
    const commonAnimations = ['idle', 'walk', 'run', 'attack', 'death'];
    return commonAnimations.includes(animationName);
  }
  
  // Start een specifieke animatie
  public startModelAnimation(animationName: string, looped: boolean = false): void {
    if (!this.isSpawned) return;
    
    if (looped) {
      this.startModelLoopedAnimations([animationName]);
    } else {
      // Voor non-looped animaties gebruiken we een timeout om ze later te stoppen
      this.startModelLoopedAnimations([animationName]);
      
      // Stop de animatie na een redelijke tijd
      setTimeout(() => {
        if (this.isSpawned) {
          this.stopModelAnimations([animationName]);
          // Ga terug naar idle
          this.startModelLoopedAnimations(['idle']);
        }
      }, 1000); // Standaard animatieduur
    }
  }
  
  // Forceer focus op de dichtstbijzijnde speler
  protected _forceFocusOnPlayer(): void {
    if (!this.isSpawned || !this.world) return;
    
    // Zoek dichtstbijzijnde speler
    const nearbyPlayers = this.world.entityManager.getAllEntities()
      .filter((entity: Entity) => entity instanceof PlayerEntity && entity.isSpawned) as PlayerEntity[];
    
    if (nearbyPlayers && nearbyPlayers.length > 0) {
      // Type safety: zorg dat closestPlayer altijd een geldige waarde heeft
      const firstPlayer = nearbyPlayers[0];
      
      // Controleer of we een geldige eerste speler hebben
      if (!firstPlayer) return;
      
      // Vind de dichtstbijzijnde speler
      let closestPlayer: PlayerEntity = firstPlayer;
      let closestDistance = this._getDistance(this.position, firstPlayer.position);
      
      for (let i = 1; i < nearbyPlayers.length; i++) {
        const player = nearbyPlayers[i];
        // Zorg dat we een geldige speler hebben voordat we de afstand berekenen
        if (player && player.position) {
          const distance = this._getDistance(this.position, player.position);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = player;
          }
        }
      }
      
      // Extra check om te zorgen dat closestPlayer aanwezig is en een positie heeft
      if (closestPlayer && closestPlayer.position) {
        // Reset de laatste pathfinding tijd om onmiddellijk opnieuw te pathfinden
        this._lastPathfindTime = 0;
        
        // Start immediate pathfinding to player
        if (closestPlayer && closestPlayer.position) {
          const succeeded = this.pathfindToTarget(closestPlayer.position);
          
          console.log(`[${this.name}] Emergency pathfinding after knockback: ${succeeded ? 'success' : 'failed'}`);
        }
        
        // Face the player
        this._faceTarget(closestPlayer.position);
        
        // Set target position
        this.setTargetPosition(closestPlayer.position);
      }
    }
  }
  
  // Stelt een doelpositie in voor pathfinding
  public setTargetPosition(position: Vector3Like): void {
    try {
      if (!position) return;
      
      // Kopieer de positie om referentieproblemen te voorkomen
      this._targetPosition = {
        x: position.x,
        y: position.y,
        z: position.z
      };
      
    } catch (error) {
      console.error(`[${this.name}] Fout in setTargetPosition:`, error);
    }
  }
  
  // Reset doelpositie voor pathfinding
  public resetTargetPosition(): void {
    this._targetPosition = null;
  }
  
  // Method to find the item spawner with caching
  protected _findItemSpawner(): any | null {
    // Use cache if available and not expired
    if (this._cachedItemSpawner && Date.now() - this._lastCacheTime < this._cacheRefreshInterval) {
      return this._cachedItemSpawner;
    }
    
    // Check globally defined item spawner first (more efficient)
    if (globalItemSpawner) {
      this._cachedItemSpawner = globalItemSpawner;
      this._lastCacheTime = Date.now();
      return globalItemSpawner;
    }
    
    // Fallback to searching entities
    const itemSpawners = this.world?.entityManager.getAllEntities()
      .filter(entity => entity.name === 'ItemSpawner') || [];
      
    if (itemSpawners.length > 0) {
      this._cachedItemSpawner = itemSpawners[0];
      this._lastCacheTime = Date.now();
      return itemSpawners[0];
    }
    
    // Try finding through game manager
    const gameManager = this._findGameManager();
    if (gameManager && typeof gameManager.getItemSpawner === 'function') {
      try {
        this._cachedItemSpawner = gameManager.getItemSpawner();
        this._lastCacheTime = Date.now();
        return this._cachedItemSpawner;
      } catch (e) {
        console.error('[Boss] Error getting ItemSpawner through GameManager:', e);
      }
    }
    
    return null;
  }
  
  // Method to find the boss manager with caching
  protected _findBossManager(): any | null {
    // Use cache if available and not expired
    if (this._cachedBossManager && Date.now() - this._lastCacheTime < this._cacheRefreshInterval) {
      return this._cachedBossManager;
    }
    
    const bossManagers = this.world?.entityManager.getAllEntities()
      .filter(entity => entity.name === 'BossManager') || [];
      
    if (bossManagers.length > 0) {
      this._cachedBossManager = bossManagers[0];
      this._lastCacheTime = Date.now();
      return bossManagers[0];
    }
    
    return null;
  }
  
  // Method to find the game manager with caching
  protected _findGameManager(): any | null {
    // Use cache if available and not expired
    if (this._cachedGameManager && Date.now() - this._lastCacheTime < this._cacheRefreshInterval) {
      return this._cachedGameManager;
    }
    
    const gameManagers = this.world?.entityManager.getAllEntities()
      .filter(entity => entity.name === 'GameManager') || [];
      
    if (gameManagers.length > 0) {
      this._cachedGameManager = gameManagers[0];
      this._lastCacheTime = Date.now();
      return gameManagers[0];
    }
    
    return null;
  }

  /**
   * Drop items when boss is defeated
   */
  protected dropItems(): void {
    if (!this.isSpawned || !this.world || this._dropItems.length === 0) {
      console.log(`[Boss] No items to drop or boss not spawned`);
      return;
    }
    
    try {
      // Get the ItemSpawner using cached method
      const itemSpawner = this._findItemSpawner();
      
      if (!itemSpawner) {
        console.error(`[Boss] Could not find ItemSpawner for dropping items`);
        return;
      }
      
      console.log(`[Boss] Dropping items: ${this._dropItems.join(', ')}`);
      
      // Drop each item with a small delay to prevent physics glitches
      let i = 0;
      for (const itemType of this._dropItems) {
        setTimeout(() => {
          if (!this.isSpawned) return; // Boss could be despawned during delay
          
          try {
            const position = {
              x: this.position.x + (Math.random() * 2 - 1),
              y: this.position.y + 1,
              z: this.position.z + (Math.random() * 2 - 1)
            };
            
            itemSpawner.handleBlockDrop(itemType, position);
          } catch (e) {
            console.error(`[Boss] Error dropping item ${itemType}:`, e);
          }
        }, i * 150); // Spacing out the drops for better physics and performance
        i++;
      }
    } catch (error) {
      console.error(`[Boss] Error in dropItems:`, error);
    }
  }
  
  /**
   * Try to get the player manager from a boss manager or player entity
   */
  protected getPlayerManager(playerId: string): any | null {
    try {
      // Try through BossManager (cached)
      const bossManager = this._findBossManager();
      
      if (bossManager && typeof bossManager.getPlayerManager === 'function') {
        return bossManager.getPlayerManager(playerId);
      }
      
      // Try through GameManager (cached)
      const gameManager = this._findGameManager();
      
      if (gameManager && typeof gameManager.getPlayerManager === 'function') {
        return gameManager.getPlayerManager(playerId);
      }
      
      return null;
    } catch (error) {
      console.error(`[Boss] Error getting PlayerManager:`, error);
      return null;
    }
  }
} 