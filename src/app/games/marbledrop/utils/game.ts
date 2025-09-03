import * as THREE from "three";
import { Player, Marble } from "../types/MarbleDropTypes";
import {
    RING_RADIUS,
    SPAWN_HEIGHT,
    INITIAL_BURST_SECONDS,
    BASKET_INNER_RADIUS,
    MAX_LAYERS,
    LAYER_CAPACITY,
} from "../data/constants";
import { mulberry32, hashToUint32 } from "./rng";

export function makePlayers(N: number): Player[] {
    const arr: Player[] = [];
    for (let i = 0; i < N; i++) {
        const theta = (i / N) * Math.PI * 2;
        arr.push({
            id: i,
            name: `P${i + 1}`,
            pos: new THREE.Vector3(
                Math.cos(theta) * RING_RADIUS,
                0,
                Math.sin(theta) * RING_RADIUS
            ),
            attachCount: 0,
            stackCount: 0,
        });
    }
    return arr;
}

export function randomInDisk(rng: () => number, radius = 0.5): THREE.Vector3 {
    // uniform in disk (x,z)
    let x = 0,
        z = 0;
    while (true) {
        x = (rng() * 2 - 1) * radius;
        z = (rng() * 2 - 1) * radius;
        if (x * x + z * z <= radius * radius) break;
    }
    return new THREE.Vector3(x, 0, z);
}

export function makeMarbles(
    N_PLAYERS: number,
    M: number,
    rng: () => number,
    players: Player[]
): Marble[] {
    const wins = Math.floor(M / 2);
    const blanks = M - wins;
    const arr: Marble[] = [];

    // Winning marbles — fair assignment to players and spawn above their slots
    for (let i = 0; i < wins; i++) {
        const target = Math.floor(rng() * N_PLAYERS);
        const jitter = randomInDisk(rng, 0.6);
        const base = players[target].pos;
        arr.push({
            id: i,
            isWinning: true,
            targetPlayer: target,
            state: "idle",
            pos: new THREE.Vector3(
                base.x + jitter.x,
                SPAWN_HEIGHT + rng() * 2,
                base.z + jitter.z
            ),
            vel: new THREE.Vector3(
                (rng() - 0.5) * 0.5,
                -1 - rng() * 0.5,
                (rng() - 0.5) * 0.5
            ),
            spawnTime: rng() * INITIAL_BURST_SECONDS, // heavier rain early
        });
    }

    // Blank marbles — spawn around the ring broadly
    for (let i = 0; i < blanks; i++) {
        const angle = rng() * Math.PI * 2;
        const radius = RING_RADIUS + (rng() - 0.5) * 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        arr.push({
            id: wins + i,
            isWinning: false,
            targetPlayer: -1,
            state: "idle",
            pos: new THREE.Vector3(x, SPAWN_HEIGHT + rng() * 2, z),
            vel: new THREE.Vector3(
                (rng() - 0.5) * 0.6,
                -1 - rng() * 0.5,
                (rng() - 0.5) * 0.6
            ),
            spawnTime: rng() * INITIAL_BURST_SECONDS,
        });
    }

    return arr;
}

export function layoutSlot(i: number) {
    // Arrange marbles in layers inside the basket
    const marbleR = 0.08;
    const inner = BASKET_INNER_RADIUS - marbleR - 0.04;
    const layerCapacity = LAYER_CAPACITY; // use global constant
    const maxLayers = MAX_LAYERS;
    const cap = layerCapacity * maxLayers;
    const clamped = Math.min(i, cap - 1);
    const layer = Math.floor(clamped / layerCapacity);
    const within = clamped % layerCapacity;
    const layerspace = 0.17; // vertical spacing between layers
    const y = layer * layerspace;

    // Center + ring6 + ring12 = 19 per layer
    if (within === 0) {
        return { x: 0, y, z: 0 };
    } else if (within <= 7) {
        const k = within - 1;
        const angle = (k / 6) * Math.PI * 2;
        const r = inner * 0.5;
        return { x: Math.cos(angle) * r, y, z: Math.sin(angle) * r };
    } else {
        const k = within - 7;
        const angle = (k / 12) * Math.PI * 2;
        const r = inner * 0.9;
        return { x: Math.cos(angle) * r, y, z: Math.sin(angle) * r };
    }
}

export function computeWinners(
    players: Player[],
    K: number,
    seed: string
): Player[] {
    const sorted = [...players].sort((a, b) => b.attachCount - a.attachCount);
    if (sorted.length === 0) return [];
    const top = sorted[0].attachCount;
    const tied = sorted.filter((p) => p.attachCount === top);
    if (tied.length <= K) return tied.slice(0, K);
    // tie-breaker: shuffle with seeded RNG
    const rng = mulberry32(hashToUint32(seed + "-tiebreak"));
    for (let i = tied.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [tied[i], tied[j]] = [tied[j], tied[i]];
    }
    return tied.slice(0, K);
}
