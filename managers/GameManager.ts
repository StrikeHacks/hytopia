import { World } from 'hytopia';
import { IronGenerator } from '../generators/IronGenerator';
import { GoldGenerator } from '../generators/GoldGenerator';
import { ironConfig, goldConfig } from '../config/generators';
import { PlayerInventory } from '../player/PlayerInventory';
import worldMap from '../assets/terrain.json';
import { ItemSpawner } from './ItemSpawner';
import { ToolManager } from './ToolManager';

export class GameManager {
    private playerInventories: Map<string, PlayerInventory> = new Map();
    private ironGenerator!: IronGenerator;
    private goldGenerator!: GoldGenerator;
    private itemSpawner: ItemSpawner;
    private toolManager: ToolManager;

    constructor(private world: World) {
        this.setupWorld();
        this.itemSpawner = new ItemSpawner(world, this.playerInventories);
        this.toolManager = new ToolManager(world, this.playerInventories, this.itemSpawner);
        this.setupGenerators();
        this.spawnInitialItems();
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

    public cleanup(playerId: string): void {
        this.playerInventories.delete(playerId);
    }

    public getToolManager(): ToolManager {
        return this.toolManager;
    }
} 