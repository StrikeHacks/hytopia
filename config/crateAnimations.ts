import type { CrateAnimationConfig } from '../types/crates';

// Predefined animation configurations
export const CRATE_ANIMATIONS: Record<string, CrateAnimationConfig> = {
    // Standard arch animation (current default)
    'standard-arch': {
        type: 'arch',
        duration: {
            cycle: 250,
            total: 5100,
            final: 2000
        },
        scale: 0.6,
        params: {
            width: 3.5,
            height: 0.5
        }
    },


    // Fast spinning animation
    'fast-spin': {
        type: 'spin',
        duration: {
            cycle: 150,
            total: 3400,
            final: 1500
        },
        scale: 0.7,
        params: {
            width: 3,
            speed: 0.5
        }
    },

    // Bouncing animation
    'bounce': {
        type: 'bounce',
        duration: {
            cycle: 400,
            total: 5200,
            final: 2000
        },
        scale: 0.65,
        params: {
            height: 1.2,
            speed: 1.5
        }
    },

    // Scatter animation - items scatter in arcs around the crate
    'scatter': {
        type: 'scatter',
        duration: {
            cycle: 150,  // Delay between items
            total: 3200, // Total animation time
            final: 2000  // How long to show final item
        },
        scale: 0.6,     // Smaller scale for scattered items
        params: {
            height: 1.5,      // Maximum height of the arc (lowered to match original)
            radius: 1.5,      // Maximum radius items can scatter
            itemDuration: 1000 // Duration of each individual item animation
        }
    }
}; 