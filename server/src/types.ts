export type Vec3 = { x: number; y: number; z: number };

export type PlayerState = {
    id: string;
    name?: string;
    pos: Vec3;
    rotY: number;
    hp: number;
    score: number;
};

export type BulletState = {
    id: string;
    pos: Vec3;
    vel: Vec3;
    ownerId: string;
    bornAt: number;
};

export type WorldState = {
    players: PlayerState[];
    bullets: BulletState[];
    arenaSize: number;
    tick: number;
};

export type ClientInput = {
    seq: number;
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    yaw: number;
    pitch?: number;
    fire: boolean;
    fireDirection?: { x: number; y: number; z: number };
};
