import type { Vector3Like } from 'hytopia';

export type NPCType = 'dungeon' | 'market' | 'quest';

export interface NPCConfig {
    id: string;
    name: string;
    type: NPCType;
    position: Vector3Like;
    rotation?: Vector3Like; // Optional rotation in Euler angles (degrees)
    modelUri: string;      // Path to the model file
    modelScale?: number;   // Optional model scale (defaults to 1)
    message: string;
    animations?: {
        idle?: string[];   // Idle animations to play
        interact?: string[]; // Animations to play when interacting
    };
}

export const NPC_CONFIGS: NPCConfig[] = [
    {
        id: 'dungeon_master',
        name: 'Dungeon Master',
        type: 'dungeon',
        position: { x: 0, y: 4, z: 4 },
        rotation: { x: 0, y: 235, z: 0 }, // Facing south (180 degrees)
        modelUri: 'models/players/player.gltf',
        modelScale: 0.7,
        message: "Welcome adventurer! Would you like to enter a dungeon?",
        animations: {
            idle: ['idle_upper', 'idle_lower'],
            interact: ['simple_interact']
        }
    },
    {
        id: 'traveler',
        name: 'Traveler',
        type: 'dungeon',
        position: { x: 10, y: 4, z: 10 },
        rotation: { x: 0, y: 90, z: 0 }, // Facing east (270 degrees)
        modelUri: 'models/players/player.gltf',
        modelScale: 0.7,
        message: "Welcome to the market! Take a look at my wares.",
        animations: {
            idle: ['idle_upper', 'idle_lower'],
            interact: ['simple_interact']
        }
    },
    // Add more NPCs here as needed
]; 