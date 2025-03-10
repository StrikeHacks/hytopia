import type { ItemConfig } from '../types/items';

export const ironConfig: ItemConfig = {
    maxItems: 20,
    spawnInterval: 5000,
    spawnPosition: { x: 5, y: 3.2, z: 4 },
    uiPosition: { x: 5, y: 7, z: 4 }
};

export const goldConfig: ItemConfig = {
    maxItems: 10,
    spawnInterval: 10000,
    spawnPosition: { x: 10, y: 3.2, z: 4 },
    uiPosition: { x: 10, y: 7, z: 4 }
}; 