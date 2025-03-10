import { Entity, PlayerEntity, World } from 'hytopia';

export interface ItemConfig {
    maxItems: number;
    spawnInterval: number;
    spawnPosition: {
        x: number;
        y: number;
        z: number;
    };
    uiPosition: {
        x: number;
        y: number;
        z: number;
    };
}

export interface GeneratorState {
    activeIronCount?: number;
    activeGoldCount?: number;
    maxItems: number;
}

export interface ItemGenerator {
    create: () => void;
    getActiveCount: () => number;
    updateUI: () => void;
} 