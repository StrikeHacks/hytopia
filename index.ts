import { startServer, PlayerEvent } from 'hytopia';
import { GameManager } from './managers/GameManager';
import { PlayerManager } from './managers/PlayerManager';

startServer(world => {
    const gameManager = new GameManager(world);

    world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
        new PlayerManager(
            world,
            player,
            gameManager.getPlayerHotbars()
        );
        
        player.ui.sendData(gameManager.getGeneratorCounts());
    });

    world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
        gameManager.cleanup(player.id);
        world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    });
});
