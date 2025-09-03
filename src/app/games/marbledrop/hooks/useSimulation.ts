import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Phase, Player, Marble } from "../types/MarbleDropTypes";
import {
    GRAVITY,
    AIR_DRAG,
    ELASTICITY_RIM,
    ELASTICITY_GROUND,
    RING_RADIUS,
    BASKET_HEIGHT,
    BASKET_INNER_RADIUS,
    BASKET_DEPTH,
    RIM_THICKNESS,
    SPEED_ATTACH_THRESHOLD,
} from "../data/constants";
import { mulberry32, hashToUint32 } from "../utils/rng";
import { layoutSlot } from "../utils/game";
import { basketCapacity } from "../data/constants";

export function useSimulation(
    phase: Phase,
    players: Player[],
    marbles: Marble[],
    roundSeconds: number,
    seed: string
) {
    const rngRef = useRef<() => number>(() => Math.random());
    const tRef = useRef(0); // elapsed seconds

    useEffect(() => {
        // reset integrator time on any (re)start or seed change
        tRef.current = 0;
        rngRef.current = mulberry32(hashToUint32(seed));

        // Only reset counts and marble states when we actually start playing
        if (phase === "PLAY") {
            marbles.forEach((m) => {
                m.state = "idle";
            });
            players.forEach((p) => {
                p.attachCount = 0;
                p.stackCount = 0;
            });
        }
    }, [phase, seed]);

    useFrame((_, dt) => {
        if (phase !== "PLAY") return;
        tRef.current += dt;
        const t = tRef.current;

        for (let i = 0; i < marbles.length; i++) {
            const m = marbles[i];
            if (m.state === "dead" || m.state === "attached") continue;

            if (t >= m.spawnTime) {
                if (m.state === "idle") m.state = "fall";
            } else {
                continue; // not spawned yet
            }

            // Air drag + gravity + integrate
            m.vel.x *= Math.max(0, 1 - AIR_DRAG * dt);
            m.vel.z *= Math.max(0, 1 - AIR_DRAG * dt);
            m.vel.y += GRAVITY * dt;
            m.pos.addScaledVector(m.vel, dt);

            // Ground interaction
            if (m.pos.y <= 0) {
                if (m.isWinning) {
                    m.state = "dead";
                } else {
                    m.pos.y = 0;
                    m.vel.y *= -ELASTICITY_GROUND;
                    m.vel.x *= 0.7;
                    m.vel.z *= 0.7;
                    if (Math.abs(m.vel.y) < 0.8) m.state = "dead";
                }
                continue;
            }

            // Basket catch test (cylinder-ish near head/basket)
            const CATCH_R = BASKET_INNER_RADIUS; // horizontal radius
            const CATCH_H = BASKET_DEPTH; // vertical window
            const HEAD_Y = BASKET_HEIGHT;
            const CAP = basketCapacity();

            // Only process near the player ring
            const radial = Math.hypot(m.pos.x, m.pos.z);
            if (radial > RING_RADIUS - 2 && radial < RING_RADIUS + 2) {
                let handled = false;
                for (let p = 0; p < players.length; p++) {
                    const pl = players[p];
                    const dx = m.pos.x - pl.pos.x;
                    const dz = m.pos.z - pl.pos.z;
                    const horiz = Math.hypot(dx, dz);
                    const vert = Math.abs(m.pos.y - HEAD_Y);

                    // Rim collision band
                    const nearRim =
                        Math.abs(horiz - (BASKET_INNER_RADIUS + 0.01)) <
                            RIM_THICKNESS && vert < CATCH_H * 1.2;
                    if (nearRim) {
                        const nx = dx / (horiz + 1e-6);
                        const nz = dz / (horiz + 1e-6);
                        const vDotN = m.vel.x * nx + m.vel.z * nz;
                        m.vel.x -= (1 + ELASTICITY_RIM) * vDotN * nx;
                        m.vel.z -= (1 + ELASTICITY_RIM) * vDotN * nz;
                        m.vel.y *= -ELASTICITY_RIM * 0.5;
                        handled = true;
                        break;
                    }

                    if (horiz <= CATCH_R && vert <= CATCH_H) {
                        const speed = Math.hypot(m.vel.x, m.vel.y, m.vel.z);
                        const capacityLeft = pl.stackCount < CAP;
                        if (speed > SPEED_ATTACH_THRESHOLD || !capacityLeft) {
                            const nx =
                                dx !== 0 || dz !== 0 ? dx / (horiz + 1e-6) : 0;
                            const nz =
                                dx !== 0 || dz !== 0 ? dz / (horiz + 1e-6) : 0;
                            const vDotN = m.vel.x * nx + m.vel.z * nz;
                            m.vel.x -= (1 + ELASTICITY_RIM) * vDotN * nx;
                            m.vel.z -= (1 + ELASTICITY_RIM) * vDotN * nz;
                            m.vel.y *= -ELASTICITY_RIM;
                            handled = true;
                            break;
                        } else {
                            // Attach (stack visually) — ⭐ increments score; ⚪ only stacks
                            const slotIndex = pl.stackCount;
                            const slot = layoutSlot(slotIndex);
                            pl.stackCount++;
                            if (m.isWinning) pl.attachCount++;
                            m.pos.set(
                                pl.pos.x + slot.x,
                                HEAD_Y - 0.05 + slot.y,
                                pl.pos.z + slot.z
                            );
                            m.vel.set(0, 0, 0);
                            m.state = "attached";
                            handled = true;
                            break;
                        }
                    }
                }
                if (handled) continue;
            }
        }
    });
}
