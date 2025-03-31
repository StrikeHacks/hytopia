import { World, Player, PlayerEvent, startServer } from 'hytopia';
import { PlayerManager } from './managers/PlayerManager';
import { GameManager } from './managers/GameManager';
import { BossManager } from './managers/BossManager';

// Start de wereld op met de startServer functie
const world = startServer(world => {
  const playerInventories = new Map();

  // Create GameManager (eerste om de wereld op te zetten)
  const gameManager = new GameManager(world);
  
  // Log of de globale ItemSpawner succesvol is geïnitialiseerd via GameManager
  console.log('[Index] Verificatie dat GameManager de globale ItemSpawner heeft geïnitialiseerd');

  // Maak de BossManager
  const bossManager = new BossManager(world);

  // Initialize de BossManager
  bossManager.init();
  
  // Spawn bosses
  bossManager.spawnBosses();

  // Handler voor speler join event
  world.on(PlayerEvent.JOINED_WORLD, ({ player }: { player: Player }) => {
    new PlayerManager(
      world, 
      player, 
      gameManager.getPlayerInventories(), 
      gameManager.getItemSpawner(), 
      gameManager
    );
    
    //player.ui.sendData(gameManager.getGeneratorCounts());
  });

  // Event handler voor wanneer een speler de wereld verlaat
  world.on(PlayerEvent.LEFT_WORLD, ({ player }: { player: Player }) => {
    // Cleanup van player resources
    gameManager.cleanup(player.id);
    
    // Find and dispose of player entities properly
    const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
    playerEntities.forEach(entity => {
      // Get the PlayerManager for this entity if available through the GameManager
      const playerManager = gameManager.getPlayerManagerById?.(player.id);
      if (playerManager) {
        try {
          // Properly dispose of health system if method exists
          const playerHealth = playerManager.getPlayerHealth?.();
          if (playerHealth && typeof playerHealth.dispose === 'function') {
            playerHealth.dispose();
          }
        } catch (e) {
          console.error('Error disposing player health:', e);
        }
      }
      
      // Despawn the entity
      entity.despawn();
    });
  });
  
  return world;
});
