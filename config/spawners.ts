// Definieer een simpeler type voor de hoekpunten
export interface Point3D {
    x: number;
    y: number;
    z: number;
}

// Meer geoptimaliseerde animatie configuratie
export interface AnimationConfig {
    name: string;
    uri: string;
    priority?: number; // Prioriteit voor het laden (lagere = hoger)
}

// Configuratie voor een dier
export interface AnimalConfig {
    modelUri: string;
    modelScale: number;
    animations: AnimationConfig[];
    mass: number;
    maxHP: number;
    dropItems?: string[];
    // Performance optimalisaties
    cullingDistance?: number; // Afstand waarop entiteiten inactief moeten worden
    updateInterval?: number; // Milliseconden tussen AI updates
    simplifiedPhysics?: boolean; // Of vereenvoudigde fysica moet worden gebruikt
}

// Alle beschikbare dier configuraties - geoptimaliseerd met standaardwaarden
export const animalConfigs: Record<string, AnimalConfig> = {
    cow: {
        modelUri: 'models/npcs/cow.gltf',
        modelScale: 0.7,
        animations: [
            { name: 'idle', uri: 'animations/idle', priority: 1 },
            { name: 'walk', uri: 'animations/walk', priority: 1 },
            { name: 'admiring', uri: 'animations/admiring', priority: 2 }
        ],
        mass: 100,
        maxHP: 50,
        dropItems: ['bone'],
        // Performance optimalisaties
        cullingDistance: 50, // Alleen actief binnen 50 blokken van speler
        updateInterval: 500, // Update AI elke 0.5 seconden (was voorheen elke frame)
        simplifiedPhysics: true // Gebruik eenvoudigere fysica voor betere performance
    }
    // Hier kunnen meer dieren worden toegevoegd
};

// Interface voor spawn gebied configuratie
export interface SpawnAreaConfig {
    corners: Point3D[];
    minEntityDistance: number;
    maxEntities: number;
    spawnInterval: number;
    spawnChance: number;
    enabled: boolean;
    animalType: string;
    // Performance optimalisaties
    playerActivationDistance?: number; // Afstand tot speler waarop gebied actief wordt
    spawnLimit?: number; // Maximum aantal spawns per interval
    batchSpawning?: boolean; // Of dieren in batches moeten worden gespawned
    simplifiedCollision?: boolean; // Of vereenvoudigde collision detection moet worden gebruikt
}

// Array met alle spawn gebieden - geoptimaliseerde configuraties
export const spawnAreas: SpawnAreaConfig[] = [
    // Gebied 1: Boerderij
    {
        corners: [
            { x: -5, y: 3, z: 20 },
            { x: -15, y: 3, z: 20 },
            { x: -15, y: 3, z: 30 },
            { x: -5, y: 3, z: 30 }
        ],
        minEntityDistance: 1.5,
        maxEntities: 4, 
        spawnInterval: 10000, // Verlaagd van 15s naar 10s
        spawnChance: 1.0,     // Verhoogd van 0.7 naar 1.0
        enabled: true,        // Zorg dat dit op true staat
        animalType: 'cow',
        playerActivationDistance: 50, // Verhoogd van 40 naar 50
        spawnLimit: 2,        // Verhoogd van 1 naar 2
        batchSpawning: false,
        simplifiedCollision: true
    },
    
    // Gebied 2: Weiland
    {
        corners: [
            { x: 20, y: 0, z: 20 },
            { x: 10, y: 0, z: 20 },
            { x: 10, y: 0, z: 10 },
            { x: 20, y: 0, z: 10 }
        ],
        minEntityDistance: 3, // Verlaagd van 4 naar 3
        maxEntities: 3,      // Verhoogd van 2 naar 3
        spawnInterval: 12000, // Verlaagd van 20s naar 12s
        spawnChance: 1.0,     // Verhoogd van 0.6 naar 1.0
        enabled: true,        // Zorg dat dit op true staat
        animalType: 'cow',
        playerActivationDistance: 50, // Verhoogd van 35 naar 50
        spawnLimit: 2,        // Verhoogd van 1 naar 2
        batchSpawning: false,
        simplifiedCollision: true
    },
    
    // Gebied 3: Kleine weide
    {
        corners: [
            { x: -10, y: 0, z: -10 },
            { x: -20, y: 0, z: -10 },
            { x: -20, y: 0, z: -20 },
            { x: -10, y: 0, z: -20 }
        ],
        minEntityDistance: 3,
        maxEntities: 2,       // Verhoogd van 1 naar 2
        spawnInterval: 15000, // Verlaagd van 25s naar 15s
        spawnChance: 1.0,     // Verhoogd van 0.5 naar 1.0
        enabled: true,        // Zorg dat dit op true staat
        animalType: 'cow',
        playerActivationDistance: 50, // Verhoogd van 30 naar 50
        spawnLimit: 2,        // Verhoogd van 1 naar 2
        batchSpawning: false,
        simplifiedCollision: true
    }
]; 