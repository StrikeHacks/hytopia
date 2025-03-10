import { PlayerEntity } from 'hytopia';

export interface HealthChangeEvent {
    previousHealth: number;
    currentHealth: number;
    change: number;
    type: 'damage' | 'heal' | 'set';
}

export class PlayerHealth {
    private maxHealth: number = 100;
    private currentHealth: number = 100;
    private isDead: boolean = false;

    constructor(
        private playerEntity: PlayerEntity,
        private onHealthChange?: (event: HealthChangeEvent) => void
    ) {}


    public damage(amount: number): number {
        if (this.isDead || amount <= 0) return 0;

        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        const actualDamage = previousHealth - this.currentHealth;

        this.notifyHealthChange({
            previousHealth,
            currentHealth: this.currentHealth,
            change: -actualDamage,
            type: 'damage'
        });

        if (this.currentHealth === 0) {
            this.die();
        }

        return actualDamage;
    }

    public heal(amount: number): number {
        if (this.isDead || amount <= 0) return 0;

        const previousHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        const actualHeal = this.currentHealth - previousHealth;

        this.notifyHealthChange({
            previousHealth,
            currentHealth: this.currentHealth,
            change: actualHeal,
            type: 'heal'
        });

        return actualHeal;
    }


    public setHealth(amount: number): void {
        if (this.isDead) return;

        const previousHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, Math.max(0, amount));

        this.notifyHealthChange({
            previousHealth,
            currentHealth: this.currentHealth,
            change: this.currentHealth - previousHealth,
            type: 'set'
        });

        if (this.currentHealth === 0) {
            this.die();
        }
    }


    public setMaxHealth(amount: number): void {
        if (amount < 1) return;

        const previousMax = this.maxHealth;
        this.maxHealth = amount;

        // If current health was at max, increase it to new max
        if (this.currentHealth === previousMax) {
            this.currentHealth = this.maxHealth;
        }
        // If new max is less than current health, cap current health
        else if (this.currentHealth > this.maxHealth) {
            this.setHealth(this.maxHealth);
        }
    }


    public revive(health?: number): void {
        if (!this.isDead) return;

        this.isDead = false;
        this.setHealth(health ?? this.maxHealth);
        // Additional revival logic can be added here
    }

    public getCurrentHealth(): number {
        return this.currentHealth;
    }


    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public getHealthPercentage(): number {
        return (this.currentHealth / this.maxHealth) * 100;
    }


    public getIsDead(): boolean {
        return this.isDead;
    }

    private die(): void {
        this.isDead = true;
        // Additional death logic can be added here
    }

    private notifyHealthChange(event: HealthChangeEvent): void {
        this.onHealthChange?.(event);
        
        // Send health update to UI
        this.playerEntity.player.ui.sendData({
            health: {
                current: this.currentHealth,
                max: this.maxHealth,
                percentage: this.getHealthPercentage()
            }
        });
    }
} 