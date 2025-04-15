import {
    Audio,
    BaseEntityController,
    BlockType,
    CoefficientCombineRule,
    ColliderShape,
    CollisionGroup,
    Entity,
    PlayerEntity,
    type PlayerCameraOrientation,
    type PlayerInput,
  } from "hytopia";
  
  /** Options for creating a PlayerEntityController instance. @public */
  export interface PlayerEntityControllerOptions {
    /** Whether to automatically cancel left click input after first processed tick, defaults to true. */
    autoCancelMouseLeftClick?: boolean;
  
    /** A function allowing custom logic to determine if the entity can jump. */
    canJump?: () => boolean;
  
    /** A function allowing custom logic to determine if the entity can walk. */
    canWalk?: () => boolean;
  
    /** A function allowing custom logic to determine if the entity can run. */
    canRun?: () => boolean;
  
    /** Overrides the animation(s) that will play when the entity is idle. */
    idleLoopedAnimations?: string[];
  
    /** Overrides the animation(s) that will play when the entity interacts (left click) */
    interactOneshotAnimations?: string[];
  
    /** Overrides the animation(s) that will play when the entity is jumping. */
    jumpOneshotAnimations?: string[];
  
    /** The upward velocity applied to the entity when it jumps. */
    jumpVelocity?: number;
  
    /** The normalized horizontal velocity applied to the entity when it runs. */
    runVelocity?: number;
  
    /** Overrides the animation(s) that will play when the entity is running. */
    runLoopedAnimations?: string[];
  
    /** Whether the entity sticks to platforms, defaults to true. */
    sticksToPlatforms?: boolean;
  
    /** Overrides the animation(s) that will play when the entity is walking. */
    walkLoopedAnimations?: string[];
  
    /** The normalized horizontal velocity applied to the entity when it walks. */
    walkVelocity?: number;
  
    /** The default camera forward offset */
    defaultForwardOffset?: number;
  
    /** The camera forward offset when sprinting */
    sprintForwardOffset?: number;
  
    /** The default camera Y offset */
    defaultYOffset?: number;
  
    /** The camera Y offset when sprinting */
    sprintYOffset?: number;
    
    /** The minimum time in milliseconds between jumps */
    jumpCooldownMs?: number;
  }
  
  /**
   * The player entity controller implementation.
   *
   * @remarks
   * This class extends {@link BaseEntityController}
   * and implements the default movement logic for a
   * entity. This is used as the default for
   * players when they join your game. This class may be extended
   * if you'd like to implement additional logic on top of the
   * PlayerEntityController implementation.
   *
   * @example
   * ```typescript
   * // Create a custom entity controller for myEntity, prior to spawning it.
   * myEntity.setController(new PlayerEntityController(myEntity, {
   *   jumpVelocity: 10,
   *   runVelocity: 8,
   *   walkVelocity: 4,
   * }));
   *
   * // Spawn the entity in the world.
   * myEntity.spawn(world, { x: 53, y: 10, z: 23 });
   * ```
   *
   * @public
   */
  export default class PlayerEntityController extends BaseEntityController {
    /** Whether to automatically cancel left click input after first processed tick, defaults to true. */
    public autoCancelMouseLeftClick: boolean = true;
  
    /**
     * A function allowing custom logic to determine if the entity can walk.
     * @param playerEntityController - The entity controller instance.
     * @returns Whether the entity of the entity controller can walk.
     */
    public canWalk: (playerEntityController: PlayerEntityController) => boolean =
      () => true;
  
    /**
     * A function allowing custom logic to determine if the entity can run.
     * @param playerEntityController - The entity controller instance.
     * @returns Whether the entity of the entity controller can run.
     */
    public canRun: (playerEntityController: PlayerEntityController) => boolean =
      () => true;
  
    /**
     * A function allowing custom logic to determine if the entity can jump.
     * @param playerEntityController - The entity controller instance.
     * @returns Whether the entity of the entity controller can jump.
     */
    public canJump: (playerEntityController: PlayerEntityController) => boolean =
      () => true;
  
    /** The looped animation(s) that will play when the entity is idle. */
    public idleLoopedAnimations: string[] = ["idle_upper", "idle_lower"];
  
    /** The oneshot animation(s) that will play when the entity interacts (left click) */
    public interactOneshotAnimations: string[] = ["simple_interact"];
  
    /** The oneshot animation(s) that will play when the entity is jumping. */
    // public jumpOneshotAnimations: string[] = ["jump_loop"]; // Removed jump animation
  
    /** The upward velocity applied to the entity when it jumps. */
    public jumpVelocity: number = 10;
  
    /** The looped animation(s) that will play when the entity is running. */
    public runLoopedAnimations: string[] = ["run_upper", "run_lower"];
  
    /** The normalized horizontal velocity applied to the entity when it runs. */
    public runVelocity: number = 8;
  
    /** Whether the entity sticks to platforms. */
    public sticksToPlatforms: boolean = true;
  
    /** The looped animation(s) that will play when the entity is walking. */
    public walkLoopedAnimations: string[] = ["walk_upper", "walk_lower"];
  
    /** The normalized horizontal velocity applied to the entity when it walks. */
    public walkVelocity: number = 4;
  
    /** The default camera forward offset */
    public defaultForwardOffset: number = 0.3;
  
    /** The camera forward offset when sprinting */
    public sprintForwardOffset: number = 0.5;
  
    /** The default camera Y offset */
    public defaultYOffset: number = 0.5;
  
    /** The camera Y offset when sprinting */
    public sprintYOffset: number = 0.3;
    
    /** The minimum time in milliseconds between jumps */
    public jumpCooldownMs: number = 250;
  
    /** @internal */
    private _stepAudio: Audio | undefined;
  
    /** @internal */
    private _groundContactCount: number = 0;
  
    /** @internal */
    private _platform: Entity | undefined;
  
    /** @internal - Timestamp of the last jump */
    private _lastJumpTime: number = 0;
  
    /**
     * @param options - Options for the controller.
     */
    public constructor(options: PlayerEntityControllerOptions = {}) {
      super();
  
      this.autoCancelMouseLeftClick =
        options.autoCancelMouseLeftClick ?? this.autoCancelMouseLeftClick;
      this.jumpVelocity = options.jumpVelocity ?? this.jumpVelocity;
      this.runVelocity = options.runVelocity ?? this.runVelocity;
      this.walkVelocity = options.walkVelocity ?? this.walkVelocity;
      this.canWalk = options.canWalk ?? this.canWalk;
      this.canRun = options.canRun ?? this.canRun;
      this.canJump = options.canJump ?? this.canJump;
      this.sticksToPlatforms =
        options.sticksToPlatforms ?? this.sticksToPlatforms;
      this.defaultForwardOffset = options.defaultForwardOffset ?? this.defaultForwardOffset;
      this.sprintForwardOffset = options.sprintForwardOffset ?? this.sprintForwardOffset;
      this.defaultYOffset = options.defaultYOffset ?? this.defaultYOffset;
      this.sprintYOffset = options.sprintYOffset ?? this.sprintYOffset;
      this.jumpCooldownMs = options.jumpCooldownMs ?? this.jumpCooldownMs;
    }
  
    /** Whether the entity is grounded. */
    public get isGrounded(): boolean {
      return this._groundContactCount > 0;
    }
  
    /** Whether the entity is on a platform, a platform is any entity with a kinematic rigid body. */
    public get isOnPlatform(): boolean {
      return !!this._platform;
    }
  
    /** The platform the entity is on, if any. */
    public get platform(): Entity | undefined {
      return this._platform;
    }
  
    /**
     * Called when the controller is attached to an entity.
     * @param entity - The entity to attach the controller to.
     */
    public attach(entity: Entity) {
      this._stepAudio = new Audio({
        uri: "audio/sfx/step/stone/stone-step-04.mp3",
        loop: true,
        volume: 0.1,
        referenceDistance: 2,
        cutoffDistance: 15,
        attachedToEntity: entity,
      });
  
      entity.setCcdEnabled(true);
      entity.lockAllRotations(); // prevent physics from applying rotation to the entity, we can still explicitly set it.
    }
  
    /**
     * Called when the controlled entity is spawned.
     * In PlayerEntityController, this function is used to create
     * the colliders for the entity for wall and ground detection.
     * @param entity - The entity that is spawned.
     */
    public spawn(entity: Entity): void {
      if (!entity.isSpawned) {
        throw new Error(
          "PlayerEntityController.createColliders(): Entity is not spawned!"
        );
      }
  
      // Ground sensor
      entity.createAndAddChildCollider({
        shape: ColliderShape.CYLINDER,
        radius: 0.23,
        halfHeight: 0.125,
        collisionGroups: {
          belongsTo: [CollisionGroup.ENTITY_SENSOR],
          collidesWith: [CollisionGroup.BLOCK, CollisionGroup.ENTITY],
        },
        isSensor: true,
        relativePosition: { x: 0, y: -0.9, z: 0 },
        tag: "groundSensor",
        onCollision: (_other: BlockType | Entity, started: boolean) => {
          if (!entity.isSpawned) {
            return;
          }
  
          // Ground contact
          this._groundContactCount += started ? 1 : -1;
  
          if (!this._groundContactCount) {
            // Start jump animation when leaving the ground - Removed
            // entity.startModelOneshotAnimations(this.jumpOneshotAnimations);
          }
  
          // Platform contact
          if (!(_other instanceof Entity) || !_other.isKinematic) return;
  
          if (started && this.sticksToPlatforms) {
            this._platform = _other;
          } else if (_other === this._platform && !started) {
            this._platform = undefined;
          }
        },
      });
  
      // Wall collider
      entity.createAndAddChildCollider({
        shape: ColliderShape.CAPSULE,
        halfHeight: 0.33,
        radius: 0.6,
        collisionGroups: {
          belongsTo: [CollisionGroup.ENTITY_SENSOR],
          collidesWith: [CollisionGroup.BLOCK],
        },
        friction: 0,
        frictionCombineRule: CoefficientCombineRule.Min,
        tag: "wallCollider",
      });
    }
  
    /**
     * Ticks the player movement for the entity controller,
     * overriding the default implementation. If the entity to tick
     * is a child entity, only the event will be emitted but the default
     * movement logic will not be applied.
     *
     * @param entity - The entity to tick.
     * @param input - The current input state of the player.
     * @param cameraOrientation - The current camera orientation state of the player.
     * @param deltaTimeMs - The delta time in milliseconds since the last tick.
     */
    public tickWithPlayerInput(
      entity: PlayerEntity,
      input: PlayerInput,
      cameraOrientation: PlayerCameraOrientation,
      deltaTimeMs: number
    ) {
      if (!entity.isSpawned || !entity.world) return;
  
      super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);
  
      if (entity.parent) {
        return;
      }
  
      const { w, a, s, d, sp, sh, ml } = input;
      const { yaw } = cameraOrientation;
      const currentVelocity = entity.linearVelocity;
      const targetVelocities = { x: 0, y: 0, z: 0 };
      const isRunning = sh && w; // Only allow sprinting forward
  
      // Adjust camera forward offset based on sprinting state
      if (entity.player && entity.player.camera) { // Check if player and camera exist
        entity.player.camera.setForwardOffset(isRunning ? this.sprintForwardOffset : this.defaultForwardOffset);
        // Adjust camera Y offset based on sprinting state
        entity.player.camera.setOffset({
          x: 0,
          y: isRunning ? this.sprintYOffset : this.defaultYOffset,
          z: 0
        });
      }
  
      // Animation and sound logic based on state
      if (this.isGrounded) {
        if (w || a || s || d) { // Grounded and moving horizontally
          if (isRunning) {
            entity.stopModelAnimations(
              Array.from(entity.modelLoopedAnimations).filter(
                (v) => !this.runLoopedAnimations.includes(v)
              )
            );
            entity.startModelLoopedAnimations(this.runLoopedAnimations);
            this._stepAudio?.setPlaybackRate(0.75);
          } else {
            entity.stopModelAnimations(
              Array.from(entity.modelLoopedAnimations).filter(
                (v) => !this.walkLoopedAnimations.includes(v)
              )
            );
            entity.startModelLoopedAnimations(this.walkLoopedAnimations);
            this._stepAudio?.setPlaybackRate(0.51);
          }
          this._stepAudio?.play(entity.world, !this._stepAudio?.isPlaying);
        } else { // Grounded and idle
          this._stepAudio?.pause();
          entity.stopModelAnimations(
            Array.from(entity.modelLoopedAnimations).filter(
              (v) => !this.idleLoopedAnimations.includes(v)
            )
          );
          entity.startModelLoopedAnimations(this.idleLoopedAnimations);
        }
      } else { // In the air (jumping/falling)
        // Stop step sounds when airborne
        this._stepAudio?.pause();
        // Jump animation is handled by the ground sensor collision callback
      }
  
      if (ml) {
        entity.startModelOneshotAnimations(this.interactOneshotAnimations);
        input.ml = !this.autoCancelMouseLeftClick;
      }
  
      // Calculate target horizontal velocities (run/walk)
      if (
        (isRunning && this.canRun(this)) ||
        (!isRunning && this.canWalk(this))
      ) {
        const velocity = isRunning ? this.runVelocity : this.walkVelocity;
  
        if (w) {
          targetVelocities.x -= velocity * Math.sin(yaw);
          targetVelocities.z -= velocity * Math.cos(yaw);
        }
  
        if (s) {
          targetVelocities.x += velocity * Math.sin(yaw);
          targetVelocities.z += velocity * Math.cos(yaw);
        }
  
        if (a) {
          targetVelocities.x -= velocity * Math.cos(yaw);
          targetVelocities.z += velocity * Math.sin(yaw);
        }
  
        if (d) {
          targetVelocities.x += velocity * Math.cos(yaw);
          targetVelocities.z -= velocity * Math.sin(yaw);
        }
  
        // Normalize for diagonals
        const length = Math.sqrt(
          targetVelocities.x * targetVelocities.x +
            targetVelocities.z * targetVelocities.z
        );
        if (length > velocity) {
          const factor = velocity / length;
          targetVelocities.x *= factor;
          targetVelocities.z *= factor;
        }
      }
  
      // Calculate target vertical velocity (jump)
      const now = Date.now(); // Get current time for cooldown check
      if (
        sp &&
        this.canJump(this) &&
        this.isGrounded &&
        currentVelocity.y > -0.001 &&
        currentVelocity.y <= 0.1 &&
        now - this._lastJumpTime > this.jumpCooldownMs // Check cooldown
      ) {
        targetVelocities.y = this.jumpVelocity;
        this._lastJumpTime = now; // Update last jump time
      }
      
      // Apply impulse relative to target velocities, taking platform velocity into account
      const platformVelocity = this._platform
        ? this._platform.linearVelocity
        : { x: 0, y: 0, z: 0 };
      const deltaVelocities = {
        x: targetVelocities.x - currentVelocity.x + platformVelocity.x,
        y: targetVelocities.y + platformVelocity.y,
        z: targetVelocities.z - currentVelocity.z + platformVelocity.z,
      };
  
      const hasExternalVelocity =
        (this.runVelocity > 0 &&
          Math.abs(currentVelocity.x) > this.runVelocity) ||
        (this.jumpVelocity > 0 &&
          Math.abs(currentVelocity.y) > this.jumpVelocity) ||
        (this.runVelocity > 0 && Math.abs(currentVelocity.z) > this.runVelocity);
  
      if (!hasExternalVelocity || this.isOnPlatform) {
        // allow external velocities to resolve, otherwise our deltas will cancel them out.
        if (Object.values(deltaVelocities).some((v) => v !== 0)) {
          const mass = entity.mass;
  
          entity.applyImpulse({
            // multiply by mass for the impulse to result in applying the correct target velocity
            x: deltaVelocities.x * mass,
            y: deltaVelocities.y * mass,
            z: deltaVelocities.z * mass,
          });
        }
      }
  
      // Apply rotation
      if (yaw !== undefined) {
        const halfYaw = yaw / 2;
  
        entity.setRotation({
          x: 0,
          y: Math.fround(Math.sin(halfYaw)),
          z: 0,
          w: Math.fround(Math.cos(halfYaw)),
        });
      }
    }
  }
  