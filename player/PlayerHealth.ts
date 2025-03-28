import { PlayerEntity } from 'hytopia';

export interface HealthChangeEvent {
    previousHealth: number;
    currentHealth: number;
    change: number;
    type: 'damage' | 'heal' | 'set';
}

export class PlayerHealth {
    private maxHealth: number = 1000;
    private currentHealth: number = 700;
    private isDead: boolean = false;
    
    // Passive healing configuration
    private readonly REGEN_AMOUNT: number = 5; // Amount of health to regenerate per tick
    private readonly REGEN_INTERVAL_MS: number = 3000; // Regeneration interval in milliseconds (3 seconds)
    private regenIntervalId: NodeJS.Timer | null = null;
    private lastDamageTime: number = 0;
    private readonly REGEN_DELAY_AFTER_DAMAGE_MS: number = 5000; // Delay regeneration for 5 seconds after taking damage

    constructor(
        private playerEntity: PlayerEntity,
        private onHealthChange?: (event: HealthChangeEvent) => void
    ) {
        // Start the passive regeneration interval
        this.startRegeneration();
    }

    // Start the health regeneration interval
    private startRegeneration(): void {
        // Clear any existing interval first
        this.stopRegeneration();
        
        // Start a new interval for regeneration
        this.regenIntervalId = setInterval(() => {
            this.regenerateHealth();
        }, this.REGEN_INTERVAL_MS);
        
        console.log('[PlayerHealth] Started health regeneration system');
    }
    
    // Stop the health regeneration interval
    private stopRegeneration(): void {
        if (this.regenIntervalId) {
            clearInterval(this.regenIntervalId);
            this.regenIntervalId = null;
        }
    }
    
    // Handle regeneration tick
    private regenerateHealth(): void {
        // Skip regeneration if player is dead
        if (this.isDead) return;
        
        // Skip regeneration if we recently took damage
        const now = Date.now();
        if (now - this.lastDamageTime < this.REGEN_DELAY_AFTER_DAMAGE_MS) return;
        
        // Skip if already at max health
        if (this.currentHealth >= this.maxHealth) return;
        
        // Apply the regeneration
        this.heal(this.REGEN_AMOUNT);
    }

    public damage(amount: number): number {
        if (this.isDead || amount <= 0) return 0;

        // Update last damage time for regeneration delay
        this.lastDamageTime = Date.now();

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

        if (actualHeal > 0) {
            this.notifyHealthChange({
                previousHealth,
                currentHealth: this.currentHealth,
                change: actualHeal,
                type: 'heal'
            });
        }

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
        
        // Restart regeneration when player revives
        this.startRegeneration();
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
        // Stop regeneration when player dies
        this.stopRegeneration();
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
    
    // Clean up resources when player is removed
    public dispose(): void {
        this.stopRegeneration();
    }
} 