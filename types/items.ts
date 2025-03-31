import { Player } from 'hytopia';
import type { World, Entity } from 'hytopia';
import { 
  DEFAULT_ITEM_SCALE, 
  DEFAULT_HAND_OFFSET,
  DEFAULT_HAND_ROTATION,
  DEFAULT_DROP_FORCE,
  DEFAULT_COLLIDER_SIZE,
  MAX_STACK_SIZE
} from '../config/constants';
import type { PlayerInventory } from '../player/PlayerInventory';

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface ItemConfig {
    maxItems: number;
    spawnInterval: number;
    spawnPosition: Position3D;
    uiPosition: Position3D;
}

// Interface for item instances with unique IDs and properties
export interface ItemInstance {
    instanceId: string;
    type: string;
    count: number;
    durability?: number;
    maxDurability?: number;
    properties?: Record<string, any>;
}

// Updated ItemSlot to support item instances
export interface ItemSlot {
    type: string | null;
    count: number;
    instance?: ItemInstance;
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

export type ItemCategory = 'resource' | 'resources' | 'tool' | 'tools' | 'weapon' | 'weapons' | 'armor' | 'food' | 'misc' | 'unknown' | 'key';

export interface ItemProperties {
  type: string;
  modelUri: string;
  displayName: string;
  category: ItemCategory;
  maxStackSize?: number;
  scale?: number;
  dropForce?: { horizontal: number; vertical: number };
  colliderSize?: { x: number; y: number; z: number };
  handOffset?: { x: number; y: number; z: number };
  handRotation?: { x: number; y: number; z: number; w: number };
  imageUrl: string;
}

// Resources
export interface ResourceItemProperties extends ItemProperties {
  category: 'resource' | 'resources';
}

// Tools
export interface ToolItemProperties extends ItemProperties {
  category: 'tool' | 'tools';
  durability: number;
  maxDurability: number;
  damage: number;
  canBreak: string[];
  miningSpeed?: number;
  soulbound?: boolean;
}

// Weapons
export interface WeaponItemProperties extends ItemProperties {
  category: 'weapon' | 'weapons';
  durability: number;
  maxDurability: number;
  damage: number;
  soulbound?: boolean;
}

// Armor
export interface ArmorItemProperties extends ItemProperties {
  category: 'armor';
  durability: number;
  maxDurability: number;
  armorPoints: number;
}

// Food
export interface FoodItemProperties extends ItemProperties {
  category: 'food';
  hunger: number;
  saturation: number;
}

// Keys
export interface KeyItemProperties extends ItemProperties {
  category: 'key';
  // Key-specific properties can be added here
}

// Default item properties
export function getDefaultItemProperties(type: string, displayName: string, category: ItemCategory): ItemProperties {
  return {
    type,
    modelUri: `models/items/${type}.gltf`,
    displayName,
    category,
    maxStackSize: MAX_STACK_SIZE,
    scale: DEFAULT_ITEM_SCALE,
    dropForce: DEFAULT_DROP_FORCE,
    colliderSize: DEFAULT_COLLIDER_SIZE,
    handOffset: DEFAULT_HAND_OFFSET,
    handRotation: DEFAULT_HAND_ROTATION,
    imageUrl: `items/${type}.png`
  };
}

// Constants for item configuration
export const PICKUP_COOLDOWN = 500; // ms
export const SWORD_DROP_FORCE = { horizontal: 0.6, vertical: 0.15 };
export const SWORD_COLLIDER_HEIGHT = 0.5;

// Base item interfaces 
export interface BaseItemProperties {
    readonly type: string;
    readonly modelUri: string;
    readonly displayName?: string;
    readonly category: string;
    readonly maxStackSize: number;
    readonly scale?: number;
    readonly imageUrl?: string;
    readonly soulbound?: boolean;
    readonly dropForce?: {
        horizontal: number;
        vertical: number;
    };
    readonly colliderSize?: {
        x: number;
        y: number;
        z: number;
    };
    readonly handOffset?: {
        x: number;
        y: number;
        z: number;
    };
    readonly handRotation?: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
}

// Combined item type that can be any of the specific types
export type ItemType = 
    | ResourceItemProperties 
    | WeaponItemProperties 
    | ToolItemProperties 
    | ArmorItemProperties
    | KeyItemProperties; 