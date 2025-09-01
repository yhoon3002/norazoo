import { BoardState } from "../types/PinballTypes";
import { CANVAS_WIDTH } from "../data/constants";

export default function createInitialBoard(): BoardState {
    return {
        pegs: [],
        slots: [],
        rng: Math.random,
        ball: { x: CANVAS_WIDTH * 0.5, y: 90, vx: 0, vy: 0, alive: false },
        dpr: 1,
        tPrev: 0,
    };
}
