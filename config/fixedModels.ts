import type { FixedModelConfig } from '../entities/FixedModelEntity';
import type { Vector3Like } from 'hytopia';

/**
 * Configuration for fixed models that act like blocks in the world.
 * These entities cannot be picked up and function as world fixtures.
 */
export const fixedModelConfigs: Record<string, FixedModelConfig> = {
    'workbench': {
        id: 'workbench',
        name: 'Workbench',
        modelUri: 'models/items/workbench.gltf',
        modelScale: 2,
        colliderSize: {
            x: 1,
            y: 2,
            z: 0.5
        },
        allowYMovement: false // Zet op false om te voorkomen dat het door de grond valt
    },
    'common-crate': {
        id: 'common-crate',
        name: 'Common Crate',
        modelUri: 'models/crates/common_crate.gltf',
        modelScale: 2.5,
        colliderSize: {
            x: 0.5,
            y: 1,
            z: 0.5
        },
        allowYMovement: false //
    },
    'epic-crate': {
        id: 'epic-crate',
        name: 'Epic Crate',
        modelUri: 'models/crates/common_crate.gltf',
        modelScale: 2.5,
        colliderSize: {
            x: 0.5,
            y: 1,
            z: 0.5
        },
        allowYMovement: false //
    },
    'legendary-crate': {
        id: 'legendary-crate',
        name: 'Legendary Crate',
        modelUri: 'models/crates/common_crate.gltf',
        modelScale: 2.5,
        colliderSize: {
            x: 0.5,
            y: 1,
            z: 0.5
        },
        allowYMovement: false //
    }
};

/**
 * Interface for model placement configuration
 */
export interface ModelPlacement {
    position: Vector3Like;
    rotation?: number; // Rotation around Y axis in radians
    scale?: number; // Optional scale override
}

/**
 * Predefined model placements for the world.
 * These are placed when the game loads and cannot be moved by players.
 */
export const predefinedModelPlacements: Record<string, ModelPlacement[]> = {
    // Workbench placements - only hardcoding these for now
    workbench: [
        { 
            position: { x: 0, y: 3.45, z: 8 },
            rotation: Math.PI * 1.5// Default rotation (facing forward)
        }
    ],
    'common-crate': [
        {
            position: { x: -6, y: 3.2, z: 8 },
        }
    ],
    'epic-crate': [
        {
            position: { x: -9, y: 3.2, z: 8 },
        }
    ],
    'legendary-crate': [    
        {
            position: { x: -12, y: 3.2, z: 8 },
        }
    ]
};

/**
 * Get configuration for a fixed model by ID
 */
export function getFixedModelConfig(id: string): FixedModelConfig {
    const config = fixedModelConfigs[id];
    if (!config) {
        throw new Error(`No fixed model configuration found for ID: ${id}`);
    }
    return { ...config }; // Return a copy to avoid modifying the original
} 