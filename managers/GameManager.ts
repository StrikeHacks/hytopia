import { World } from 'hytopia';
import { IronGenerator } from '../generators/IronGenerator';
import { GoldGenerator } from '../generators/GoldGenerator';
import { ironConfig, goldConfig } from '../config/generators';
import { HotbarManager } from '../player/HotbarManager';
import worldMap from '../assets/terrain1.json';
import { ItemSpawner } from './ItemSpawner';

export class GameManager {
    private playerHotbars: Map<string, HotbarManager> = new Map();
    private ironGenerator!: IronGenerator;
    private goldGenerator!: GoldGenerator;
    private itemSpawner: ItemSpawner;

    constructor(private world: World) {
        this.setupWorld();
        this.setupGenerators();
        this.itemSpawner = new ItemSpawner(world, this.playerHotbars);
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

    public getPlayerHotbars(): Map<string, HotbarManager> {
        return this.playerHotbars;
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
        this.playerHotbars.delete(playerId);
    }
} 