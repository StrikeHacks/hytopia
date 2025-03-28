import { startServer, PlayerEvent, World } from 'hytopia';
import { GameManager } from './managers/GameManager';
import { PlayerManager } from './managers/PlayerManager';

const world = startServer(world => {
    const gameManager = new GameManager(world);

    world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
        new PlayerManager(
            world,
            player,
            gameManager.getPlayerInventories(),
            gameManager.getItemSpawner(),
            gameManager
        );
        
        player.ui.sendData(gameManager.getGeneratorCounts());
    });

    world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
        gameManager.cleanup(player.id);
        world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    });

    return world;
});

// Export voor Hytopia
export default world;
