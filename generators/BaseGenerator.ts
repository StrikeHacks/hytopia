import { World, SceneUI, Entity, PlayerEntity, SimpleEntityController, RigidBodyType, ColliderShape, BlockType, Audio } from 'hytopia';
import type { ItemConfig, GeneratorState, ItemGenerator } from '../types/items';

export abstract class BaseGenerator implements ItemGenerator {
    protected activeCount: number = 0;
    protected ui!: SceneUI;
    
    constructor(
        protected world: World,
        protected config: ItemConfig,
        protected templateId: string,
        protected modelUri: string
    ) {
        this.setupUI();
    }

    private setupUI() {
        this.ui = new SceneUI({
            templateId: this.templateId,
            position: this.config.uiPosition
        });
        this.ui.setOffset({ x: 0, y: 2, z: 0 });
        this.updateUI();
        this.ui.load(this.world);
    }

    protected abstract onPickup(player: any): void;
    protected abstract getStateKey(): 'activeIronCount' | 'activeGoldCount';

    public create() {
        if (this.activeCount >= this.config.maxItems) {
            return;
        }

        this.activeCount++;
        this.updateUI();

        let isBeingPickedUp = false;
        const item = new Entity({
            controller: new SimpleEntityController(),
            modelUri: this.modelUri,
            modelScale: 0.5,
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_VELOCITY,
                angularVelocity: { x: 0, y: 2, z: 0 },
                colliders: [{
                    shape: ColliderShape.BLOCK,
                    halfExtents: { x: 0.2, y: 0.2, z: 0.2 },
                    onCollision: (other: BlockType | Entity, started: boolean) => {
                        if (started && other instanceof PlayerEntity && !isBeingPickedUp) {
                            isBeingPickedUp = true;
                            try {
                                this.onPickup(other.player);
                                if (this.activeCount > 0) {
                                    this.activeCount--;
                                    this.updateUI();
                                }
                                item.despawn();
                            } catch (error) {
                                console.error('[Generator] Error during pickup:', error);
                                isBeingPickedUp = false; // Reset flag if pickup fails
                            }
                        }
                    }
                }]
            }
        });

        item.spawn(this.world, this.config.spawnPosition);
    }

    public getActiveCount(): number {
        return Math.max(0, this.activeCount);
    }

    public updateUI() {
        const state: GeneratorState = {
            maxItems: this.config.maxItems,
            [this.getStateKey()]: this.getActiveCount()
        };
        this.ui.setState(state);
    }
} 