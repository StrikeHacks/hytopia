import type { StalkerBossOptions } from './StalkerBoss';

// Predefined Stalker Boss configurations
export const STALKER_BOSSES: Record<string, StalkerBossOptions> = {
    'fast-stalker': {
        name: "Fast Stalker",
        modelUri: 'models/npcs/stalker.gltf',
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
        knockbackForce: 20,
        knockbackCooldown: 800,
        
        // SpeedUp eigenschappen
        speedMultiplier: 2.5,
        speedUpDuration: 3000,
        speedUpCooldown: 12000,
        
        // Pathfinding options - optimized for speed
        pathfindOptions: {
            maxFall: 5,
            maxJump: 1,
            verticalPenalty: 1.0,
            waypointTimeoutMs: 2000
        },
        
        // Drop items
        dropItems: ['elderwood-scrap'],
        
        // XP reward for defeating this boss
        xpReward: 8
    },
    
    'tank-stalker': {
        name: "Tank Stalker",
        modelUri: 'models/npcs/stalker.gltf',
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
        knockbackForce: 40,
        knockbackCooldown: 2000,
        
        // SpeedUp eigenschappen
        speedMultiplier: 1.5,
        speedUpDuration: 4000,
        speedUpCooldown: 15000,
        
        // Pathfinding options
        pathfindOptions: {
            maxFall: 3,
            maxJump: 1,
            verticalPenalty: 2.0,
            waypointTimeoutMs: 4000
        },
        
        // Drop items
        dropItems: ['elderwood-scrap'],
        
        // XP reward for defeating this boss
        xpReward: 10
    },
    
    'balanced-stalker': {
        name: "Balanced Stalker",
        modelUri: 'models/npcs/stalker.gltf',
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
        knockbackForce: 20,
        knockbackCooldown: 1000,
        
        // SpeedUp eigenschappen
        speedMultiplier: 2.0,
        speedUpDuration: 3000,
        speedUpCooldown: 10000,
        
        // Pathfinding options
        pathfindOptions: {
            maxFall: 4,
            maxJump: 1,
            verticalPenalty: 1.2,
            waypointTimeoutMs: 3000
        },
        
        // Drop items
        dropItems: ['elderwood-scrap'],
        
        // XP reward for defeating this boss
        xpReward: 15
    }
};

// Helper function to get a stalker boss configuration
export function getStalkerBossConfig(type: string): StalkerBossOptions | undefined {
    return STALKER_BOSSES[type];
} 