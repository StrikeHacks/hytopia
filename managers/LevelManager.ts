import { World, Entity, PlayerEntity } from 'hytopia';
import { GameManager } from './GameManager';

// XP needed for each level, indexed by level number (level 1 is at index 0)
const XP_REQUIREMENTS = [
    0,      // Level 1 (starting level) - no XP needed
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    1000,   // Level 5
    2000,   // Level 6
    3500,   // Level 7
    5500,   // Level 8
    8000,   // Level 9
    11000,  // Level 10
    15000,  // Level 11
    20000,  // Level 12
    26000,  // Level 13
    33000,  // Level 14
    41000,  // Level 15
    50000,  // Level 16
    60000,  // Level 17
    72000,  // Level 18
    85000,  // Level 19
    100000  // Level 20
];

const MAX_LEVEL = XP_REQUIREMENTS.length;

// Structure to store player level data
interface PlayerLevelData {
    level: number;
    xp: number;
    nextLevelXp: number;
}

export class LevelManager {
    private playerLevels: Map<string, PlayerLevelData> = new Map();
    private world: World;
    private gameManager: GameManager;

    constructor(world: World, gameManager: GameManager) {
        this.world = world;
        this.gameManager = gameManager;
        console.log('[LevelManager] Initialized');
    }

    /**
     * Initialize a player's level data when they join the game
     */
    public initializePlayer(playerId: string): void {
        if (!this.playerLevels.has(playerId)) {
            this.playerLevels.set(playerId, {
                level: 1,
                xp: 50,
                nextLevelXp: XP_REQUIREMENTS[1]
            });
            
            console.log(`[LevelManager] Initialized player ${playerId} at level 1`);
            
            // Send level update to UI
            this.sendLevelUpdateToPlayer(playerId);
        }
    }

    /**
     * Get the player's current level
     */
    public getPlayerLevel(playerId: string): number {
        if (!this.playerLevels.has(playerId)) {
            this.initializePlayer(playerId);
        }
        
        return this.playerLevels.get(playerId)?.level || 1;
    }

    /**
     * Get the player's current XP
     */
    public getPlayerXP(playerId: string): number {
        if (!this.playerLevels.has(playerId)) {
            this.initializePlayer(playerId);
        }
        
        return this.playerLevels.get(playerId)?.xp || 0;
    }

    /**
     * Get the player's complete level data
     */
    public getPlayerLevelData(playerId: string): PlayerLevelData {
        if (!this.playerLevels.has(playerId)) {
            this.initializePlayer(playerId);
        }
        
        return this.playerLevels.get(playerId) || { level: 1, xp: 0, nextLevelXp: XP_REQUIREMENTS[1] };
    }

    /**
     * Add XP to a player and handle level ups
     */
    public addPlayerXP(playerId: string, amount: number): boolean {
        console.log(`[LevelManager] Adding ${amount} XP to player ${playerId}`);
        
        if (!playerId || amount <= 0) {
            console.log(`[LevelManager] Invalid parameters: playerId=${playerId}, amount=${amount}`);
            return false;
        }
        
        let levelData = this.playerLevels.get(playerId);
        if (!levelData) {
            console.log(`[LevelManager] Initializing player ${playerId} because no level data found`);
            this.initializePlayer(playerId);
            levelData = this.playerLevels.get(playerId);
            
            if (!levelData) {
                console.error(`[LevelManager] Failed to initialize player ${playerId}`);
                return false;
            }
        }
        
        console.log(`[LevelManager] Before XP: Level=${levelData.level}, XP=${levelData.xp}, NextLevelXP=${levelData.nextLevelXp}`);
        
        // Add XP
        levelData.xp += amount;
        let leveledUp = false;
        
        // Check for level up
        while (levelData.xp >= levelData.nextLevelXp) {
            // Level up
            levelData.level += 1;
            levelData.xp -= levelData.nextLevelXp;
            levelData.nextLevelXp = Math.floor(100 * Math.pow(1.4, levelData.level - 1));
            leveledUp = true;
            
            console.log(`[LevelManager] Player ${playerId} leveled up to ${levelData.level}!`);
            console.log(`[LevelManager] New XP threshold: ${levelData.nextLevelXp}`);
            
            // Increase player max health with level (handled automatically in sendLevelUpdateToPlayer)
        }
        
        // Update the player data
        this.playerLevels.set(playerId, levelData);
        
        // Send the new level data to the player UI
        this.sendLevelUpdateToPlayer(playerId);
        
        console.log(`[LevelManager] After XP: Level=${levelData.level}, XP=${levelData.xp}, NextLevelXP=${levelData.nextLevelXp}`);
        console.log(`[LevelManager] Player ${playerId} leveled up: ${leveledUp}`);
        
        return leveledUp;
    }

    /**
     * Set a player's level directly
     */
    public setPlayerLevel(playerId: string, level: number): void {
        if (level < 1) level = 1;
        if (level > MAX_LEVEL) level = MAX_LEVEL;
        
        if (!this.playerLevels.has(playerId)) {
            this.initializePlayer(playerId);
        }
        
        const playerData = this.playerLevels.get(playerId)!;
        playerData.level = level;
        
        // Set appropriate XP values
        playerData.xp = XP_REQUIREMENTS[level - 1] || 0;
        playerData.nextLevelXp = level < MAX_LEVEL ? XP_REQUIREMENTS[level] : playerData.xp;
        
        // Update player level data
        this.playerLevels.set(playerId, playerData);
        
        console.log(`[LevelManager] Set player ${playerId} level to ${level}`);
        
        // Send level update to player
        this.sendLevelUpdateToPlayer(playerId);
    }

    /**
     * Send level data to player UI
     */
    private sendLevelUpdateToPlayer(playerId: string): void {
        const playerData = this.playerLevels.get(playerId);
        if (!playerData) return;
        
        // Find player entity
        const playerEntities = this.world.entityManager.getAllEntities()
            .filter(entity => entity instanceof PlayerEntity && entity.player && entity.player.id === playerId) as PlayerEntity[];
        
        if (playerEntities.length === 0) return;
        
        const playerEntity = playerEntities[0];
        
        // Send data to player UI
        if (playerEntity.player && playerEntity.player.ui) {
            playerEntity.player.ui.sendData({
                playerStats: {
                    level: playerData.level,
                    xp: playerData.xp,
                    nextLevelXp: playerData.nextLevelXp,
                    // Also include health data if available
                    health: this.getPlayerHealth(playerId),
                    maxHealth: this.getPlayerMaxHealth(playerId)
                }
            });
            
            console.log(`[LevelManager] Sent level update to player ${playerId}: Level ${playerData.level}, XP ${playerData.xp}/${playerData.nextLevelXp}`);
        }
    }

    /**
     * Get player health from PlayerManager if available
     */
    private getPlayerHealth(playerId: string): number {
        const playerManager = this.gameManager.getPlayerManagerById(playerId);
        if (playerManager && typeof playerManager.getCurrentHealth === 'function') {
            return playerManager.getCurrentHealth();
        }
        return 100; // Default health value
    }

    /**
     * Get player max health from PlayerManager if available
     */
    private getPlayerMaxHealth(playerId: string): number {
        const playerManager = this.gameManager.getPlayerManagerById(playerId);
        if (playerManager && typeof playerManager.getMaxHealth === 'function') {
            return playerManager.getMaxHealth();
        }
        return 100; // Default max health value
    }

    /**
     * Clean up player data when they leave
     */
    public cleanup(playerId: string): void {
        this.playerLevels.delete(playerId);
        console.log(`[LevelManager] Cleaned up level data for player ${playerId}`);
    }

    /**
     * Set a player's level for testing purposes
     * This method skips normal validation and can set any value
     */
    public setTestLevel(playerId: string, level: number): void {
        console.log(`[LevelManager] Setting test level for player ${playerId} to ${level}`);
        
        if (!this.playerLevels.has(playerId)) {
            this.initializePlayer(playerId);
        }
        
        const playerData = this.playerLevels.get(playerId)!;
        playerData.level = level;
        
        // Set appropriate XP values
        if (level <= MAX_LEVEL) {
            playerData.xp = XP_REQUIREMENTS[level - 1] || 0;
            playerData.nextLevelXp = level < MAX_LEVEL ? XP_REQUIREMENTS[level] : playerData.xp;
        } else {
            // For test levels beyond MAX_LEVEL
            playerData.xp = XP_REQUIREMENTS[XP_REQUIREMENTS.length - 1];
            playerData.nextLevelXp = playerData.xp;
        }
        
        // Update player level data
        this.playerLevels.set(playerId, playerData);
        
        // Send level update to player
        this.sendLevelUpdateToPlayer(playerId);
        
        console.log(`[LevelManager] Test level set for player ${playerId}: Level ${level}, XP ${playerData.xp}/${playerData.nextLevelXp}`);
    }
} 