import { PlayerEntity } from 'hytopia';
import { BaseNPC } from './BaseNPC';
import { GameManager } from '../GameManager';
import { EntityEvent } from 'hytopia';

export class DungeonNPC extends BaseNPC {
    private gameManager: GameManager | null = null;

    constructor(world: any, config: any) {
        super(world, config);
        this.findGameManager();
    }

    private findGameManager(): void {
        const gameManagers = this.world.entityManager.getAllEntities()
            .filter(entity => entity.name === 'GameManager');
        
        if (gameManagers.length > 0) {
            this.gameManager = gameManagers[0] as unknown as GameManager;
        } else {
            console.warn('[DungeonNPC] GameManager not found in entity list');
        }
    }

    protected onInteract(player: PlayerEntity): void {
        // Handle E key interaction
        this.handleDungeonInteraction(player);
    }

    private handleDungeonInteraction(player: PlayerEntity): void {
        console.log('[DungeonNPC] Handling dungeon interaction');
        
        // Send initial message using broadcast
        this.world.chatManager.sendBroadcastMessage(this.config.message);

        // Open dungeon UI using DungeonManager
        if (this.gameManager) {
            console.log('[DungeonNPC] Opening dungeon UI');
            this.gameManager.getDungeonManager().toggleDungeon(player.player, true);
        } else {
            console.warn('[DungeonNPC] Cannot open dungeon UI - GameManager not found');
        }

        // Start the "talking" animation
        this.entity.startModelOneshotAnimations(['simple_interact']);
    }

    protected setupInteraction(): void {
        super.setupInteraction(); // Keep the base interaction setup

        // Add right-click handler
        this.world.on(EntityEvent.TICK, () => {
            const players = this.world.entityManager.getEntitiesByTag('player')
                .filter(e => e instanceof PlayerEntity) as PlayerEntity[];

            for (const playerEntity of players) {
                const player = playerEntity.player;
                
                // Check for right mouse button
                if (player.input.rightMouse) {
                    const direction = player.camera.facingDirection;
                    const origin = {
                        x: playerEntity.position.x,
                        y: playerEntity.position.y + player.camera.offset.y,
                        z: playerEntity.position.z
                    };

                    // Cast a ray to detect what's in front of the player
                    const raycastResult = this.world.simulation.raycast(origin, direction, 5, {
                        filterExcludeRigidBody: playerEntity.rawRigidBody
                    });

                    if (raycastResult?.hitEntity === this.entity) {
                        console.log(`[DungeonNPC] Right-click hit detected`);
                        this.handleDungeonInteraction(playerEntity);
                    }

                    player.input.rightMouse = false;
                }
            }
        });
    }
} 