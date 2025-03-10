import { PlayerEntity } from 'hytopia';

export interface ManaChangeEvent {
    type: 'use' | 'regen';
    change: number;
    current: number;
    max: number;
    percentage: number;
}

export class PlayerMana {
    private maxMana: number = 100;
    private currentMana: number = 100;
    private manaRegenRate: number = 1; // Mana points per second
    private manaRegenInterval: NodeJS.Timer | null = null;

    constructor(
        private playerEntity: PlayerEntity,
        private onManaChange: (event: ManaChangeEvent) => void
    ) {
        this.startManaRegen();
    }

    private startManaRegen() {
        // Regenerate mana every second if not at max
        this.manaRegenInterval = setInterval(() => {
            if (this.currentMana < this.maxMana) {
                this.addMana(this.manaRegenRate);
            }
        }, 1000);
    }

    private stopManaRegen() {
        if (this.manaRegenInterval) {
            clearInterval(this.manaRegenInterval);
            this.manaRegenInterval = null;
        }
    }

    private notifyManaChange(event: ManaChangeEvent) {
        // Update UI with current mana state
        this.playerEntity.player.ui.sendData({
            mana: {
                current: this.currentMana,
                max: this.maxMana,
                percentage: this.getManaPercentage()
            }
        });

        // Notify listeners
        this.onManaChange(event);
    }

    public useMana(amount: number): boolean {
        if (amount <= 0) return false;
        if (this.currentMana < amount) return false;

        this.currentMana = Math.max(0, this.currentMana - amount);
        
        this.notifyManaChange({
            type: 'use',
            change: -amount,
            current: this.currentMana,
            max: this.maxMana,
            percentage: this.getManaPercentage()
        });

        return true;
    }

    public addMana(amount: number): number {
        if (amount <= 0) return 0;
        
        const oldMana = this.currentMana;
        this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
        const actualAdded = this.currentMana - oldMana;

        if (actualAdded > 0) {
            this.notifyManaChange({
                type: 'regen',
                change: actualAdded,
                current: this.currentMana,
                max: this.maxMana,
                percentage: this.getManaPercentage()
            });
        }

        return actualAdded;
    }

    public setMana(amount: number): void {
        const oldMana = this.currentMana;
        this.currentMana = Math.min(this.maxMana, Math.max(0, amount));
        
        if (oldMana !== this.currentMana) {
            this.notifyManaChange({
                type: this.currentMana > oldMana ? 'regen' : 'use',
                change: this.currentMana - oldMana,
                current: this.currentMana,
                max: this.maxMana,
                percentage: this.getManaPercentage()
            });
        }
    }

    public setMaxMana(amount: number): void {
        if (amount <= 0) return;
        
        this.maxMana = amount;
        this.currentMana = Math.min(this.currentMana, this.maxMana);
        
        this.notifyManaChange({
            type: 'regen',
            change: 0,
            current: this.currentMana,
            max: this.maxMana,
            percentage: this.getManaPercentage()
        });
    }

    public setManaRegenRate(amount: number): void {
        if (amount < 0) return;
        this.manaRegenRate = amount;
    }

    public getCurrentMana(): number {
        return this.currentMana;
    }

    public getMaxMana(): number {
        return this.maxMana;
    }

    public getManaPercentage(): number {
        return (this.currentMana / this.maxMana) * 100;
    }

    public cleanup(): void {
        this.stopManaRegen();
    }
} 