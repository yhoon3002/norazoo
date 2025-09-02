export interface Player {
    name: string;
}

export interface HistoryEntry {
    round: number;
    name: string;
    seed: number | null;
}

export interface Peg {
    x: number;
    y: number;
}

export interface Slot {
    x: number;
    y: number;
    w: number;
    i: number;
}

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alive: boolean;
}

export interface BoardState {
    pegs: Peg[];
    slots: Slot[];
    rng: () => number;
    ball: Ball;
    dpr: number;
    tPrev: number;
}

export type AudioPing = () => void;

export interface PinballPresenterProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    wrapRef: React.RefObject<HTMLDivElement>;

    players: string[];
    name: string;
    history: { round: number; name: string; seed: number | null }[];
    round: number;
    result: number | null;
    speed: number;
    sound: boolean;
    running: boolean;

    setName: (name: string) => void;
    setSpeed: (speed: number) => void;
    setSound: (sound: boolean) => void;

    startRun: () => void;
    stopReset: () => void;
    newRound: () => void;
    addPlayer: () => void;
    removePlayer: (index: number) => void;
    movePlayer: (index: number, direction: -1 | 1) => void;
    clearHistory: () => void;
    handleNameKeyDown: (e: React.KeyboardEvent) => void;
}
