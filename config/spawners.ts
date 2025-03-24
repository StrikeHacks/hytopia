// Definieer een simpeler type voor de hoekpunten
export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface AnimationConfig {
    name: string;
    uri: string;
}

// Configuratie voor een dier
export interface AnimalConfig {
    modelUri: string;
    modelScale: number;
    animations: AnimationConfig[];
    mass: number;
}

// Alle beschikbare dier configuraties
export const animalConfigs: Record<string, AnimalConfig> = {
    cow: {
        modelUri: 'models/npcs/cow.gltf',
        modelScale: 0.7,
        animations: [
            { name: 'idle', uri: 'animations/idle' },
            { name: 'walk', uri: 'animations/walk' },
            { name: 'admiring', uri: 'animations/admiring' }
        ],
        mass: 100
    }
    // Hier kunnen meer dieren worden toegevoegd
};

export interface SpawnAreaConfig {
    corners: Point3D[];
    minEntityDistance: number;
    maxEntities: number;
    spawnInterval: number;
    spawnChance: number;
    enabled: boolean;
    animalType: string;
}

// Array met alle spawn gebieden
export const spawnAreas: SpawnAreaConfig[] = [
    // Gebied 1: Boerderij
    {
        corners: [
            { x: -5, y: 3, z: 20 },
            { x: -15, y: 3, z: 20 },
            { x: -15, y: 3, z: 30 },
            { x: -5, y: 3, z: 30 }
        ],
        minEntityDistance: 1,
        maxEntities: 5,
        spawnInterval: 10000, // 10 seconden
        spawnChance: 1,
        enabled: true,
        animalType: 'cow'
    },
    
    // Gebied 2: Weiland
    {
        corners: [
            { x: 20, y: 0, z: 20 },
            { x: 10, y: 0, z: 20 },
            { x: 10, y: 0, z: 10 },
            { x: 20, y: 0, z: 10 }
        ],
        minEntityDistance: 4,
        maxEntities: 3,
        spawnInterval: 15000, // 15 seconden
        spawnChance: 0.2,
        enabled: true,
        animalType: 'cow'
    },
    
    // Gebied 3: Kleine weide
    {
        corners: [
            { x: -10, y: 0, z: -10 },
            { x: -20, y: 0, z: -10 },
            { x: -20, y: 0, z: -20 },
            { x: -10, y: 0, z: -20 }
        ],
        minEntityDistance: 2,
        maxEntities: 2,
        spawnInterval: 20000, // 20 seconden
        spawnChance: 0.5,
        enabled: true,
        animalType: 'cow'
    }
]; 