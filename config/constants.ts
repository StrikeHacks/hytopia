// Constants for item properties and configurations
export const DEFAULT_ITEM_SCALE = 0.5;
export const PICKUP_COOLDOWN = 500; // ms
export const MAX_STACK_SIZE = 64;

// Drop force constants
export const DEFAULT_DROP_FORCE = { horizontal: 0.4, vertical: 0.1 };
export const MID_DROP_FORCE = { horizontal: 0.7, vertical: 0.13 };
export const HEAVY_DROP_FORCE = { horizontal: 1, vertical: 0.15 };
export const GIGA_DROP_FORCE = { horizontal: 1.5, vertical: 0.2 };

// Collider constants
export const DEFAULT_COLLIDER_SIZE = { x: 0.2, y: 0.2, z: 0.2 };
export const HEAVY_COLLIDER_HEIGHT = 0.55;
export const MID_COLLIDER_HEIGHT = 0.4;

// Hand offset constants
export const DEFAULT_HAND_OFFSET = { x: 0.0, y: 0.07, z: 0.3 };
export const TOOLS_HAND_OFFSET = { x: -0.48, y: 0.5, z: 0.4 };
export const WEAPONS_HAND_OFFSET = { x: 0, y: 0.07, z: 0.6 };

// Hand rotation constants (x: pitch, y: yaw, z: roll, w: scalar)
export const DEFAULT_HAND_ROTATION = { x: -Math.PI / 3, y: 0, z: 0, w: 1 };
export const SIDEWAYS_HAND_ROTATION = { x: -Math.PI / 3, y: Math.PI / 2, z: 0, w: 1 };
export const TOOLS_HAND_ROTATION = { x: -Math.PI / 6, y: Math.PI / 3, z: -0.5, w: 1 }; 