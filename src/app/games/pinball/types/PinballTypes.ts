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
    players: string[];
    history: HistoryEntry[];
    round: number;
    setRound: React.Dispatch<React.SetStateAction<number>>;
    addPlayer: (name: string) => void;
    removePlayer: (i: number) => void;
    movePlayer: (i: number, dir: -1 | 1) => void;
    pushHistory: (entry: HistoryEntry) => void;
    clearHistory: () => void;
}
