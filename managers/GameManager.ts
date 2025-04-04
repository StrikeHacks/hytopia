import { World, Entity, EntityEvent, PlayerEntity } from 'hytopia';
// import { IronGenerator } from '../generators/IronGenerator';
// import { GoldGenerator } from '../generators/GoldGenerator';
//import { ironConfig, goldConfig } from '../config/generators';
import { PlayerInventory } from '../player/PlayerInventory';
import worldMap from '../assets/terrain5.json';
import { ItemSpawner } from './ItemSpawner';
import { ToolManager } from './ToolManager';
import { CraftingManager } from './CraftingManager';
import { AnimalSpawner } from './AnimalSpawner';
import { spawnAreas } from '../config/spawners';
import { AnimalManager } from './AnimalManager';
import { FixedModelManager } from './FixedModelManager';
import { predefinedModelPlacements } from '../config/fixedModels';
import { TravelerManager } from './TravelerManager';
import { DungeonManager } from './DungeonManager';
import { LevelManager } from './LevelManager';
import { CrateManager } from './CrateManager';

// Statische singleton voor globale toegang tot ItemSpawner
export let globalItemSpawner: ItemSpawner | null = null;

export class GameManager {
    private playerInventories: Map<string, PlayerInventory> = new Map();
    private playerManagers: Map<string, any> = new Map(); // Track PlayerManager instances
    // private ironGenerator!: IronGenerator;
    // private goldGenerator!: GoldGenerator;
    private itemSpawner: ItemSpawner;
    private toolManager: ToolManager;
    private craftingManager: CraftingManager;
    private animalSpawner: AnimalSpawner;
    private animalManager: AnimalManager;
    private fixedModelManager: FixedModelManager;
    private travelerManager: TravelerManager;
    private dungeonManager: DungeonManager;
    private levelManager: LevelManager;
    private crateManager: CrateManager;
    private world: World;

    constructor(world: World) {
        this.world = world;
        this.setupGame();
        this.itemSpawner = new ItemSpawner(world, this.playerInventories);
        this.toolManager = new ToolManager(world, this.playerInventories, this.itemSpawner);
        this.craftingManager = new CraftingManager(world, this.playerInventories);
        this.animalManager = new AnimalManager(world, this.itemSpawner, this);
        this.fixedModelManager = new FixedModelManager(world);
        this.travelerManager = new TravelerManager(world, this);
        this.dungeonManager = new DungeonManager(world, this);
        this.levelManager = new LevelManager(world, this);
        this.crateManager = new CrateManager(world, this.itemSpawner);
        //this.setupGenerators();
        this.spawnInitialItems();
        this.placeFixedModels();
        
        // Create one AnimalSpawner that manages all areas
        this.animalSpawner = new AnimalSpawner(world, this, spawnAreas);

        // Maak de globale ItemSpawner beschikbaar
        globalItemSpawner = this.itemSpawner;
        console.log('[GameManager] Global ItemSpawner initialized:', globalItemSpawner ? 'success' : 'failed');
    }

    private setupGame(): void {
        // Enable debug raycasts
        this.world.simulation.enableDebugRaycasting(true);

        this.setupWorld();
    }

    private setupWorld(): void {
        this.world.loadMap(worldMap);
        this.world.simulation.setGravity({ x: 0, y: -37, z: 0 });
    }

    // private setupGenerators(): void {
    //     this.ironGenerator = new IronGenerator(this.world, ironConfig);
    //     this.goldGenerator = new GoldGenerator(this.world, goldConfig);

    //     // Increase interval times for better performance
    //     const ironInterval = Math.max(8000, ironConfig.spawnInterval); // At least 8 seconds
    //     const goldInterval = Math.max(15000, goldConfig.spawnInterval); // At least 15 seconds

    //     setInterval(() => this.ironGenerator.create(), ironInterval);
    //     setInterval(() => this.goldGenerator.create(), goldInterval);

    //     // Initial creation
    //     this.ironGenerator.create();
    //     this.goldGenerator.create();
    // }

    private spawnInitialItems(): void {
        this.itemSpawner.spawnInitialItems();
    }
    
    /**
     * Place fixed models in the world based on predefined placements
     */
    private placeFixedModels(): void {
        // Place all predefined models
        for (const [modelId, placements] of Object.entries(predefinedModelPlacements)) {
            if (!placements || placements.length === 0) {
                console.log(`[GameManager] No placements defined for model: ${modelId}`);
                continue;
            }

            console.log(`[GameManager] Placing ${placements.length} ${modelId} models at predefined locations`);
            
            for (const placement of placements) {
                const model = this.fixedModelManager.placeModel(
                    modelId, 
                    placement.position, 
                    placement.rotation
                );
                console.log(
                    `[GameManager] ${modelId} placed at: x=${placement.position.x}, y=${placement.position.y}, z=${placement.position.z}, ` + 
                    `rotation=${placement.rotation || 0}, entity ID: ${model.id}`
                );
            }
            
            // Log the total count of this model type after placement
            setTimeout(() => {
                const models = this.fixedModelManager.getModelInstances(modelId);
                console.log(`[GameManager] Total ${modelId} models placed: ${models.length}`);
                models.forEach((model, index) => {
                    console.log(`[GameManager] ${modelId} ${index + 1} position: `, model.position);
                });
            }, 1000); // Small delay to ensure all are spawned
        }
    }



    public getPlayerInventories(): Map<string, PlayerInventory> {
        return this.playerInventories;
    }

    public getItemSpawner(): ItemSpawner {
        return this.itemSpawner;
    }

    // public getGeneratorCounts() {
    //     return {
    //         activeIronCount: this.ironGenerator.getActiveCount(),
    //         activeGoldCount: this.goldGenerator.getActiveCount()
    //     };
    // }

    public getAnimalSpawner(): AnimalSpawner {
        return this.animalSpawner;
    }

    public cleanup(playerId: string): void {
        // Cleanup van speler inventories
        this.playerInventories.delete(playerId);
        
        // Cleanup of player managers
        this.playerManagers.delete(playerId);
        
        // Als er geen spelers meer zijn, cleanup van animal spawner
        if (this.playerInventories.size === 0) {
            this.animalSpawner.cleanup();
        }
    }

    public getToolManager(): ToolManager {
        return this.toolManager;
    }
    
    public getCraftingManager(): CraftingManager {
        return this.craftingManager;
    }

    public getAnimalManager(): AnimalManager {
        return this.animalManager;
    }
    
    /**
     * Get the fixed model manager
     */
    public getFixedModelManager(): FixedModelManager {
        return this.fixedModelManager;
    }

    // Statische methode om de globale ItemSpawner te verkrijgen
    public static getGlobalItemSpawner(): ItemSpawner | null {
        return globalItemSpawner;
    }

    /**
     * Register a PlayerManager instance for a player
     */
    public registerPlayerManager(playerId: string, playerManager: any): void {
        this.playerManagers.set(playerId, playerManager);
    }
    
    /**
     * Get a PlayerManager instance by player ID
     */
    public getPlayerManagerById(playerId: string): any | null {
        // First check our player managers map
        if (this.playerManagers.has(playerId)) {
            return this.playerManagers.get(playerId) || null;
        }
        
        // Fallback to searching entities if not in our map
        if (this.playerInventories.has(playerId)) {
            const playerEntities = this.world.entityManager.getAllEntities()
                .filter(entity => entity.name === `Player_${playerId}`);
                
            if (playerEntities.length > 0) {
                const playerEntity = playerEntities[0];
                return (playerEntity as any)._playerManager || null;
            }
        }
        
        return null;
    }

    public getTravelerManager(): TravelerManager {
        return this.travelerManager;
    }

    public getDungeonManager(): DungeonManager {
        return this.dungeonManager;
    }
    
    public getLevelManager(): LevelManager {
        return this.levelManager;
    }

    public getCrateManager(): CrateManager {
        return this.crateManager;
    }
} 