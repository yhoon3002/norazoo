export const N_PLAYERS_DEFAULT = 8; // change in UI
export const RING_RADIUS = 8; // circle radius for players
export const BASKET_HEIGHT = 1.85; // basket Y position above ground
export const BASKET_INNER_RADIUS = 0.45; // catch radius horizontally
export const BASKET_DEPTH = 0.35; // vertical acceptance window
export const MARBLE_COUNT_DEFAULT = 600; // total marbles (half winning)
export const SPAWN_HEIGHT = 12; // Y spawn base
export const GRAVITY = -9.8; // gravity m/s^2
export const ROUND_SECONDS_DEFAULT = 50; // gameplay seconds
export const INITIAL_BURST_SECONDS = 3; // early heavier rain window

// Physics & basket tuning
export const RIM_THICKNESS = 0.06; // collision band around inner rim radius
export const ELASTICITY_RIM = 0.55; // bounce factor when hitting rim/net
export const ELASTICITY_GROUND = 0.35; // ground bounce
export const AIR_DRAG = 0.06; // per-second drag factor
export const SPEED_ATTACH_THRESHOLD = 1.2; // if slower than this near basket, it can settle/attach
export const MAX_LAYERS = 3; // basket fill layers (visual capacity)
export const LAYER_CAPACITY = 19; // slots per layer (layoutSlot uses this)

export function basketCapacity(): number {
    return MAX_LAYERS * LAYER_CAPACITY;
}
