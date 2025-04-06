import { PlayerEntity, Entity } from 'hytopia';

/**
 * A utility class to track which player last attacked each boss
 */
export class AttackerTracker {
  private static instance: AttackerTracker;
  private attackerMap = new Map<number, PlayerEntity>();

  // Private constructor for singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AttackerTracker {
    if (!AttackerTracker.instance) {
      AttackerTracker.instance = new AttackerTracker();
    }
    return AttackerTracker.instance;
  }

  /**
   * Record an attack from a player on a boss
   */
  public recordAttack(bossId: number, player: PlayerEntity): void {
    this.attackerMap.set(bossId, player);
  }

  /**
   * Get the last player who attacked a boss
   */
  public getLastAttacker(bossId: number): PlayerEntity | undefined {
    return this.attackerMap.get(bossId);
  }

  /**
   * Clear the record for a boss (typically when it dies)
   */
  public clearRecord(bossId: number): void {
    this.attackerMap.delete(bossId);
  }
} 