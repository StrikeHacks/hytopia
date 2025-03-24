import { World } from 'hytopia';
import { IronGenerator } from '../generators/IronGenerator';
import { GoldGenerator } from '../generators/GoldGenerator';
import { ironConfig, goldConfig } from '../config/generators';
import { PlayerInventory } from '../player/PlayerInventory';
import worldMap from '../assets/terrain4.json';
import { ItemSpawner } from './ItemSpawner';
import { ToolManager } from './ToolManager';
import { CraftingManager } from './CraftingManager';
import { testItemSystem } from '../items/TestItems';
import { AnimalSpawner } from './AnimalSpawner';
import { spawnAreas } from '../config/spawners';
import { AnimalManager } from './AnimalManager';

export class GameManager {
    private playerInventories: Map<string, PlayerInventory> = new Map();
    private ironGenerator!: IronGenerator;
    private goldGenerator!: GoldGenerator;
    private itemSpawner: ItemSpawner;
    private toolManager: ToolManager;
    private craftingManager: CraftingManager;
    private animalSpawner: AnimalSpawner;
    private animalManager: AnimalManager;

    constructor(private world: World) {
        this.setupWorld();
        this.itemSpawner = new ItemSpawner(world, this.playerInventories);
        this.toolManager = new ToolManager(world, this.playerInventories, this.itemSpawner);
        this.craftingManager = new CraftingManager(world, this.playerInventories);
        this.animalManager = new AnimalManager(world);
        this.setupGenerators();
        this.spawnInitialItems();
        
        // Maak één AnimalSpawner aan die alle gebieden beheert
        this.animalSpawner = new AnimalSpawner(world, this, spawnAreas);
        
        // Run tests in development mode
        if (process.env.NODE_ENV !== 'production') {
            this.runTests();
        }
    }

    private runTests(): void {
        console.log('Running tests in development mode...');
        testItemSystem();
    }

    private setupWorld(): void {
        this.world.loadMap(worldMap);
        this.world.simulation.setGravity({ x: 0, y: -37, z: 0 });
    }

    private setupGenerators(): void {
        this.ironGenerator = new IronGenerator(this.world, ironConfig);
        this.goldGenerator = new GoldGenerator(this.world, goldConfig);

        setInterval(() => this.ironGenerator.create(), ironConfig.spawnInterval);
        setInterval(() => this.goldGenerator.create(), goldConfig.spawnInterval);

        this.ironGenerator.create();
        this.goldGenerator.create();
    }

    private spawnInitialItems(): void {
        this.itemSpawner.spawnInitialItems();
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
} 