import { World } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import { FixedModelEntity } from '../entities/FixedModelEntity';
import { getFixedModelConfig } from '../config/fixedModels';

export class FixedModelManager {
    private placedModels: Map<string, FixedModelEntity[]> = new Map();
    private workbenches: FixedModelEntity[] = [];
    
    constructor(private world: World) {}
    
    /**
     * Place a fixed model in the world
     * @param modelId The ID of the model from fixedModels config
     * @param position The position to place the model
     * @returns The placed entity
     */
    public placeModel(modelId: string, position: Vector3Like, rotation?: number): FixedModelEntity {
        try {
            // Get the model configuration
            const config = getFixedModelConfig(modelId);
            
            // Add rotation to the config if provided
            if (rotation !== undefined) {
                config.rotation = rotation;
            }
            
            // Create the fixed model entity
            const entity = new FixedModelEntity(config);
            
            // Place it in the world
            entity.place(this.world, position);
            
            // Store in our map for tracking
            const models = this.placedModels.get(modelId) || [];
            models.push(entity);
            this.placedModels.set(modelId, models);
            
            // Track workbenches separately for easy access
            if (modelId === 'workbench') {
                this.workbenches.push(entity);
            }
            
            console.log(`[FixedModelManager] Placed ${modelId} at position:`, position, `rotation:`, rotation);
            
            return entity;
        } catch (error) {
            console.error(`[FixedModelManager] Error placing model ${modelId}:`, error);
            throw error;
        }
    }
    
    /**
     * Remove a specific fixed model from the world
     * @param entity The entity to remove
     */
    public removeModel(entity: FixedModelEntity): void {
        try {
            if (!entity.isSpawned) return;
            
            const modelId = entity.name;
            const models = this.placedModels.get(modelId);
            
            if (models) {
                // Remove from our tracking array
                const index = models.indexOf(entity);
                if (index !== -1) {
                    models.splice(index, 1);
                    
                    // Update the map
                    if (models.length === 0) {
                        this.placedModels.delete(modelId);
                    } else {
                        this.placedModels.set(modelId, models);
                    }
                }
            }
            
            // Despawn the entity
            entity.despawn();
            
        } catch (error) {
            console.error(`[FixedModelManager] Error removing model:`, error);
        }
    }
    
    /**
     * Remove all placed fixed models
     */
    public removeAllModels(): void {
        this.placedModels.forEach(models => {
            models.forEach(entity => {
                if (entity.isSpawned) {
                    entity.despawn();
                }
            });
        });
        
        this.placedModels.clear();
    }
    
    /**
     * Get all placed instances of a specific model type
     * @param modelId The model ID to find
     */
    public getModelInstances(modelId: string): FixedModelEntity[] {
        return this.placedModels.get(modelId) || [];
    }
    
    /**
     * Get all placed models
     */
    public getAllModelInstances(): FixedModelEntity[] {
        const allModels: FixedModelEntity[] = [];
        this.placedModels.forEach(models => {
            allModels.push(...models);
        });
        return allModels;
    }
    
    /**
     * Get all placed workbenches
     */
    public getWorkbenches(): FixedModelEntity[] {
        return this.workbenches;
    }
    
    /**
     * Find the closest workbench to a position
     */
    public findClosestWorkbench(position: Vector3Like): FixedModelEntity | null {
        if (this.workbenches.length === 0) {
            return null;
        }
        
        let closestWorkbench: FixedModelEntity | null = null;
        let closestDistance = Number.MAX_VALUE;
        
        for (const workbench of this.workbenches) {
            if (!workbench.isSpawned) continue;
            
            const workbenchPos = workbench.position;
            const dx = position.x - workbenchPos.x;
            const dy = position.y - workbenchPos.y;
            const dz = position.z - workbenchPos.z;
            const distance = dx * dx + dy * dy + dz * dz; // Square distance (faster than sqrt)
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestWorkbench = workbench;
            }
        }
        
        return closestWorkbench;
    }
    
    /**
     * Check if a position is close to any workbench
     * @param position Position to check
     * @param maxDistance Maximum distance considered "close"
     */
    public isNearWorkbench(position: Vector3Like, maxDistance: number = 3): boolean {
        const closestWorkbench = this.findClosestWorkbench(position);
        if (!closestWorkbench) return false;
        
        const workbenchPos = closestWorkbench.position;
        const dx = position.x - workbenchPos.x;
        const dy = position.y - workbenchPos.y;
        const dz = position.z - workbenchPos.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        return distanceSquared <= maxDistance * maxDistance;
    }
} 