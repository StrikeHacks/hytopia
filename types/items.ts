import type { World, Entity } from 'hytopia';
import type { PlayerInventory } from '../player/PlayerInventory';

export const MAX_STACK_SIZE = 64;

export const NON_STACKABLE_TYPES = [
    'sword-diamond',
    'sword-stone'
    // Add other tools/armor here
];

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

export interface ItemSlot {
    type: string | null;
    count: number;
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

export interface ItemProperties {
    readonly type: string;
    readonly modelUri: string;
    readonly scale?: number;
    readonly dropForce?: {
        horizontal: number;
        vertical: number;
    };
    readonly colliderSize?: {
        x: number;
        y: number;
        z: number;
    };
}

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface ItemBehavior {
    spawn(): void;
    drop(fromPosition: Position3D, direction: Position3D): void;
    despawn(): void;
}

export type ItemConstructor = {
    new (
        world: World,
        position: Position3D,
        playerInventories: Map<string, PlayerInventory>
    ): ItemBehavior;
    readonly PROPERTIES: ItemProperties;
};

// Constants for item configuration
export const DEFAULT_ITEM_SCALE = 0.5;
export const DEFAULT_COLLIDER_SIZE = { x: 0.2, y: 0.2, z: 0.2 };
export const DEFAULT_DROP_FORCE = { horizontal: 0.4, vertical: 0.1 };
export const PICKUP_COOLDOWN = 500; // ms
export const SWORD_DROP_FORCE = { horizontal: 0.6, vertical: 0.15 };
export const SWORD_COLLIDER_HEIGHT = 0.5; 