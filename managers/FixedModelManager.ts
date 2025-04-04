import { World } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import { FixedModelEntity } from '../entities/FixedModelEntity';
import { getFixedModelConfig } from '../config/fixedModels';

export class FixedModelManager {
    private placedModels: Map<string, FixedModelEntity[]> = new Map();
    
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
     * Find the closest model of a specific type to a position
     * @param modelId The type of model to find
     * @param position The position to measure from
     * @param maxDistance Optional maximum distance to consider
     */
    public findClosestModel(modelId: string, position: Vector3Like, maxDistance?: number): FixedModelEntity | null {
        const models = this.getModelInstances(modelId);
        if (models.length === 0) {
            return null;
        }
        
        let closestModel: FixedModelEntity | null = null;
        let closestDistance = Number.MAX_VALUE;
        
        for (const model of models) {
            if (!model.isSpawned) continue;
            
            const modelPos = model.position;
            const dx = position.x - modelPos.x;
            const dy = position.y - modelPos.y;
            const dz = position.z - modelPos.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            
            // If maxDistance is specified, check if this model is within range
            if (maxDistance !== undefined && distanceSquared > maxDistance * maxDistance) {
                continue;
            }
            
            if (distanceSquared < closestDistance) {
                closestDistance = distanceSquared;
                closestModel = model;
            }
        }
        
        return closestModel;
    }
    
    /**
     * Check if a position is close to any model of a specific type
     * @param modelId The type of model to check for
     * @param position Position to check
     * @param maxDistance Maximum distance considered "close"
     */
    public isNearModel(modelId: string, position: Vector3Like, maxDistance: number = 3): boolean {
        const closestModel = this.findClosestModel(modelId, position, maxDistance);
        return closestModel !== null;
    }
    
    // Backwards compatibility methods for workbench functionality
    public getWorkbenches(): FixedModelEntity[] {
        return this.getModelInstances('workbench');
    }
    
    public findClosestWorkbench(position: Vector3Like): FixedModelEntity | null {
        return this.findClosestModel('workbench', position);
    }
    
    public isNearWorkbench(position: Vector3Like, maxDistance: number = 3): boolean {
        return this.isNearModel('workbench', position, maxDistance);
    }
} 