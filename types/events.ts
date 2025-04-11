declare module 'hytopia' {
    interface EventPayloads {
        'damage': {
            amount: number;
            health: number;
            maxHealth: number;
            fromPlayerAttack: boolean;
        };
        'health-update': {
            health: number;
            maxHealth: number;
            source?: Entity;
        };
        'boss-death': {
            boss: Entity;
            source?: Entity;
        };
        'death': {
            name: string;
            player?: PlayerEntity;
        };
        'player-join': {
            player: Player;
        };
    }
} 