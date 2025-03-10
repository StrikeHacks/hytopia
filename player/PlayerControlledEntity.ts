import { PlayerEntity } from 'hytopia';
import type { PlayerEntityOptions } from 'hytopia';
import { type ManaChangeEvent, PlayerMana } from './PlayerMana';
import { type HealthChangeEvent, PlayerHealth } from './PlayerHealth';

export class PlayerControlledEntity extends PlayerEntity {
    private health: PlayerHealth;
    private mana: PlayerMana;

    constructor(options: PlayerEntityOptions) {
        super(options);
        this.health = new PlayerHealth(this, this.onHealthChange.bind(this));
        this.mana = new PlayerMana(this, this.onManaChange.bind(this));
    }

    private onHealthChange(event: HealthChangeEvent) {
        // Existing health change handling
    }

    private onManaChange(event: ManaChangeEvent) {
        // Handle mana change events if needed
    }

    public getMana(): PlayerMana {
        return this.mana;
    }

    public dispose(): void {
        // Clear any intervals or timeouts in the mana and health systems
        if (this.mana instanceof PlayerMana) {
            clearInterval((this.mana as any).manaRegenInterval);
        }
    }
} 