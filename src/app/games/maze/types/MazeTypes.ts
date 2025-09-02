export type Player = {
    id: string;
    name: string;
    x: number;
    y: number;
    finished: boolean;
};

export type Cell = {
    x: number;
    y: number;
    walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
};

export type Dir = "top" | "right" | "bottom" | "left";
export type PawnState = {
    id: string;
    name: string;
    x: number;
    y: number;
    cx: number;
    cy: number;
    tx: number;
    ty: number;
    finished: boolean;
    color: string;
    prevDir: Dir | null;
    visitedSet: Set<string>;
    path: [number, number][];
    finishOrder: number;
    stuckFrames: number;
};

export interface MazePresenterProps {
    wrapRef: React.RefObject<HTMLDivElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;

    players: string[];
    newName: string;
    speed: number;
    running: boolean;
    pawns: Array<{
        id: string;
        name: string;
        color: string;
        finished: boolean;
    }>;
    proximity: Array<{
        id: string;
        name: string;
        color: string;
        dist: number;
        finished: boolean;
    }>;
    finalRanking: {
        finished: Array<{
            id: string;
            name: string;
            color: string;
            finishOrder: number;
        }>;
        allDone: boolean;
        loser: string | null;
    };

    setNewName: (name: string) => void;
    setSpeed: (speed: number) => void;

    addPlayer: () => void;
    removePlayer: (name: string) => void;
    startGame: () => void;
    resetGame: () => void;
    handleNameKeyDown: (e: React.KeyboardEvent) => void;
}
