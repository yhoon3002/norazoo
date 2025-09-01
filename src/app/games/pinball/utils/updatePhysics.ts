import {
    BALL_R,
    CANVAS_HEIGHT,
    CANVAS_WALL,
    CANVAS_WIDTH,
    DAMP,
    GRAVITY,
    PEG_R,
    REST,
    SLOT_H,
} from "../data/constants";
import { AudioPing, BoardState } from "../types/PinballTypes";

export default function updatePhysics(
    s: BoardState,
    dt: number,
    onHitSlot: (slotIndex: number) => void,
    audioPing: AudioPing
) {
    const b = s.ball;
    if (!b.alive) return;

    b.vy += GRAVITY * dt;
    b.vx *= Math.pow(DAMP, dt * 60);
    b.vy *= Math.pow(DAMP, dt * 60);

    let nx = b.x + b.vx * dt;
    let ny = b.y + b.vy * dt;

    // 벽
    if (nx - BALL_R < CANVAS_WALL) {
        nx = CANVAS_WALL + BALL_R;
        b.vx = Math.abs(b.vx) * REST;
        audioPing();
    }

    if (nx + BALL_R > CANVAS_WIDTH - CANVAS_WALL) {
        nx = CANVAS_WIDTH - CANVAS_WALL - BALL_R;
        b.vx = -Math.abs(b.vx) * REST;
        audioPing();
    }

    if (ny - BALL_R < CANVAS_WALL) {
        ny = CANVAS_WALL + BALL_R;
        b.vy = Math.abs(b.vy) * REST;
        audioPing();
    }

    // 핀 충돌
    for (const p of s.pegs) {
        const dx = nx - p.x;
        const dy = ny - p.y;
        const d = Math.hypot(dx, dy);
        const r = BALL_R + PEG_R;

        if (d < r) {
            const nxn = dx / (d || 1);
            const nyn = dy / (d || 1);
            const push = r - d + 0.2;
            nx += nxn * push;
            ny += nyn * push;

            // 상대속도 반사 + 랜덤성
            const vn = b.vx * nxn + b.vy * nyn;
            b.vx = b.vx - (1 + 1.0) * vn * nxn + (s.rng() - 0.5) * 18;
            b.vy = b.vy - (1 + 1.0) * vn * nyn + (s.rng() - 0.5) * 18;
            audioPing();
        }
    }

    const slotTop = CANVAS_HEIGHT - SLOT_H - CANVAS_WALL;

    if (ny + BALL_R >= slotTop) {
        const slot = s.slots.find((sl) => nx >= sl.x && nx < sl.x + sl.w);

        if (slot) {
            b.alive = false;
            onHitSlot(slot.i);
            return;
        }
    }

    s.ball.x = nx;
    s.ball.y = ny;
}
