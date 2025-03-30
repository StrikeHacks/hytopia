import { World, Entity, EntityEvent, PlayerEntity } from 'hytopia';
import { IronGenerator } from '../generators/IronGenerator';
import { GoldGenerator } from '../generators/GoldGenerator';
import { ironConfig, goldConfig } from '../config/generators';
import { PlayerInventory } from '../player/PlayerInventory';
import worldMap from '../assets/terrain4.json';
import { ItemSpawner } from './ItemSpawner';
import { ToolManager } from './ToolManager';
import { CraftingManager } from './CraftingManager';
import { AnimalSpawner } from './AnimalSpawner';
import { spawnAreas } from '../config/spawners';
import { AnimalManager } from './AnimalManager';
import { FixedModelManager } from './FixedModelManager';
import { predefinedModelPlacements } from '../config/fixedModels';
import { TravelerManager } from './TravelerManager';

// Statische singleton voor globale toegang tot ItemSpawner
export let globalItemSpawner: ItemSpawner | null = null;

export class GameManager {
    private playerInventories: Map<string, PlayerInventory> = new Map();
    private playerManagers: Map<string, any> = new Map(); // Track PlayerManager instances
    private ironGenerator!: IronGenerator;
    private goldGenerator!: GoldGenerator;
    private itemSpawner: ItemSpawner;
    private toolManager: ToolManager;
    private craftingManager: CraftingManager;
    private animalSpawner: AnimalSpawner;
    private animalManager: AnimalManager;
    private fixedModelManager: FixedModelManager;
    private travelerManager: TravelerManager;

    constructor(private world: World) {
        this.setupWorld();
        this.itemSpawner = new ItemSpawner(world, this.playerInventories);
        this.toolManager = new ToolManager(world, this.playerInventories, this.itemSpawner);
        this.craftingManager = new CraftingManager(world, this.playerInventories);
        this.animalManager = new AnimalManager(world, this.itemSpawner, this);
        this.fixedModelManager = new FixedModelManager(world);
        this.travelerManager = new TravelerManager(world, this);
        this.setupGenerators();
        this.spawnInitialItems();
        this.placeFixedModels();
        
        // Create one AnimalSpawner that manages all areas
        this.animalSpawner = new AnimalSpawner(world, this, spawnAreas);

        // Maak de globale ItemSpawner beschikbaar
        globalItemSpawner = this.itemSpawner;
        console.log('[GameManager] Global ItemSpawner initialized:', globalItemSpawner ? 'success' : 'failed');
    }

    private setupWorld(): void {
        this.world.loadMap(worldMap);
        this.world.simulation.setGravity({ x: 0, y: -37, z: 0 });
    }

    private setupGenerators(): void {
        this.ironGenerator = new IronGenerator(this.world, ironConfig);
        this.goldGenerator = new GoldGenerator(this.world, goldConfig);

        // Increase interval times for better performance
        const ironInterval = Math.max(8000, ironConfig.spawnInterval); // At least 8 seconds
        const goldInterval = Math.max(15000, goldConfig.spawnInterval); // At least 15 seconds

        setInterval(() => this.ironGenerator.create(), ironInterval);
        setInterval(() => this.goldGenerator.create(), goldInterval);

        // Initial creation
        this.ironGenerator.create();
        this.goldGenerator.create();
    }

    private spawnInitialItems(): void {
        this.itemSpawner.spawnInitialItems();
    }
    
    /**
     * Place fixed models in the world based on predefined placements
     */
    private placeFixedModels(): void {
        // Place workbenches at predefined locations
        if (predefinedModelPlacements.workbench) {
            console.log(`[GameManager] Placing ${predefinedModelPlacements.workbench.length} workbenches at predefined locations`);
            
            for (const placement of predefinedModelPlacements.workbench) {
                const workbench = this.fixedModelManager.placeModel(
                    'workbench', 
                    placement.position, 
                    placement.rotation
                );
                console.log(
                    `[GameManager] Workbench placed at: x=${placement.position.x}, y=${placement.position.y}, z=${placement.position.z}, ` + 
                    `rotation=${placement.rotation || 0}, entity ID: ${workbench.id}`
                );
            }
            
            // Log the total count of workbenches after placement
            setTimeout(() => {
                const workbenches = this.fixedModelManager.getWorkbenches();
                console.log(`[GameManager] Total workbenches placed: ${workbenches.length}`);
                workbenches.forEach((wb, index) => {
                    console.log(`[GameManager] Workbench ${index+1} position: `, wb.position);
                });
            }, 1000); // Small delay to ensure all are spawned
        } else {
            console.error("[GameManager] No workbench placements defined in configuration!");
        }
    }

    public getPlayerInventories(): Map<string, PlayerInventory> {
        return this.playerInventories;
    }

    public getItemSpawner(): ItemSpawner {
        return this.itemSpawner;
    }

    public getGeneratorCounts() {
        return {
            activeIronCount: this.ironGenerator.getActiveCount(),
            activeGoldCount: this.goldGenerator.getActiveCount()
        };
    }

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
} 