import * as THREE from "three";

export type Phase = "READY" | "PLAY" | "RESULT";

export interface Player {
    id: number;
    name: string;
    pos: THREE.Vector3;
    attachCount: number;
    stackCount: number;
}

export type MarbleState = "idle" | "fall" | "attached" | "dead";

export interface Marble {
    id: number;
    isWinning: boolean;
    targetPlayer: number; // only meaningful for winning marbles
    state: MarbleState;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    spawnTime: number; // delay before it starts falling
}
