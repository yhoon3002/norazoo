import React, { useState, useEffect, useMemo, useRef } from "react";
import { generateMaze } from "../utils/generateMaze";
import { randInt } from "../utils/random";
import MazePresenter from "../presenter/MazePresenter";
import { Cell, Dir, PawnState } from "../types/MazeTypes";
import {
    COLS,
    ROWS,
    COLORS,
    BASE_SPEED,
    MIN_SPEED_X,
    MAX_SPEED_X,
    EPS,
    initialPlayers,
} from "../data/constants";

const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
const almostEq = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;
const keyOf = (x: number, y: number) => `${x},${y}`;
const inBounds = (x: number, y: number) =>
    x >= 0 && x < COLS && y >= 0 && y < ROWS;

const opposite = (d: Dir | null) =>
    d === "top"
        ? "bottom"
        : d === "bottom"
        ? "top"
        : d === "left"
        ? "right"
        : d === "right"
        ? "left"
        : null;

export default function MazeContainer() {
    const wrapRef = useRef<HTMLDivElement>(null!);
    const canvasRef = useRef<HTMLCanvasElement>(null!);

    // 플레이어 관련 상태
    const [players, setPlayers] = useState<string[]>(initialPlayers);
    const [newName, setNewName] = useState("");

    // 게임 상태
    const [speed, setSpeed] = useState<number>(1);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [grid, setGrid] = useState<Cell[][]>(() =>
        generateMaze(COLS, ROWS, 0.28)
    );
    const [running, setRunning] = useState(false);
    const [pawns, setPawns] = useState<PawnState[]>([]);

    // 초기 말 생성 함수
    const makeInitial = (names: string[]): PawnState[] =>
        names.map((name, i) => ({
            id: "p" + i,
            name,
            x: 0,
            y: 0,
            cx: 0,
            cy: 0,
            tx: 0,
            ty: 0,
            finished: false,
            color: COLORS[i % COLORS.length],
            prevDir: null,
            visitedSet: new Set<string>([keyOf(0, 0)]),
            path: [[0, 0]] as [number, number][],
            finishOrder: -1,
            stuckFrames: 0,
        }));

    // 플레이어 관리 함수
    const addPlayer = () => {
        const n = newName.trim();
        if (!n) return;
        if (players.includes(n)) return;
        setPlayers((prev) => [...prev, n]);
        setNewName("");
    };

    const removePlayer = (name: string) =>
        setPlayers((prev) => prev.filter((p) => p !== name));

    // 게임 관리 함수
    const startGame = () => {
        setPawns((prev) => ensureInitialTargets(prev, grid));
        setRunning(true);
    };

    const resetGame = () => {
        setRunning(false);
        setGrid(generateMaze(COLS, ROWS, 0.28));
        setPawns(makeInitial(players));
    };

    const onFinish = (loser: string) => {
        alert(`당첨자: ${loser} 님`);
    };

    // 이름 입력 핸들러
    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            addPlayer();
        }
    };

    // 사이즈 감지
    useEffect(() => {
        if (!wrapRef.current) return;
        const ro = new ResizeObserver(() => {
            const rect = wrapRef.current!.getBoundingClientRect();
            setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
        });
        ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, []);

    // 플레이어 변경 시 폰 초기화
    useEffect(() => {
        setPawns(makeInitial(players));
        setRunning(false);
    }, [players]);

    // 캔버스 크기 조정
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.w === 0 || size.h === 0) {
            return;
        }

        const availableWidth = size.w - 220 - 12;
        const availableHeight = size.h - 60;

        const cell = Math.floor(
            Math.min(availableWidth / COLS, availableHeight / ROWS)
        );
        const width = cell * COLS;
        const height = cell * ROWS;

        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.objectFit = "contain";
    }, [size]);

    // 초기 타겟 설정 함수
    const ensureInitialTargets = (
        state: PawnState[],
        g: Cell[][]
    ): PawnState[] =>
        state.map((p) => {
            if (!(p.tx === p.cx && p.ty === p.cy)) return p;
            const cell = g[p.cy]?.[p.cx];
            if (!cell) return p;

            const raw: Array<{ x: number; y: number; dir: Dir }> = [];
            if (!cell.walls.top) raw.push({ x: p.cx, y: p.cy - 1, dir: "top" });
            if (!cell.walls.right)
                raw.push({ x: p.cx + 1, y: p.cy, dir: "right" });
            if (!cell.walls.bottom)
                raw.push({ x: p.cx, y: p.cy + 1, dir: "bottom" });
            if (!cell.walls.left)
                raw.push({ x: p.cx - 1, y: p.cy, dir: "left" });

            const opts = raw.filter(
                (o) => inBounds(o.x, o.y) && !(o.x === p.cx && o.y === p.cy)
            );
            if (opts.length === 0) return p;

            const choice = opts[randInt(0, opts.length - 1)];
            const nx = choice.x,
                ny = choice.y;
            const visitedSet = new Set(p.visitedSet);
            visitedSet.add(keyOf(nx, ny));
            return {
                ...p,
                tx: nx,
                ty: ny,
                prevDir: choice.dir,
                visitedSet,
                path: [...p.path, [nx, ny] as [number, number]],
            };
        });

    // 다음 경로 선택 함수
    const chooseNext = (
        p: PawnState,
        cell: Cell
    ): { nx: number; ny: number; dir: Dir } | null => {
        const raw: Array<{ x: number; y: number; dir: Dir; score: number }> =
            [];
        if (!cell.walls.top)
            raw.push({ x: cell.x, y: cell.y - 1, dir: "top", score: 1 });
        if (!cell.walls.right)
            raw.push({ x: cell.x + 1, y: cell.y, dir: "right", score: 1 });
        if (!cell.walls.bottom)
            raw.push({ x: cell.x, y: cell.y + 1, dir: "bottom", score: 1 });
        if (!cell.walls.left)
            raw.push({ x: cell.x - 1, y: cell.y, dir: "left", score: 1 });

        const optsBase = raw.filter(
            (o) => inBounds(o.x, o.y) && !(o.x === p.cx && o.y === p.cy)
        );
        if (optsBase.length === 0) return null;

        let candidates = optsBase.filter((o) => o.dir !== opposite(p.prevDir));
        if (candidates.length === 0) candidates = optsBase.slice();

        const recent = new Set(p.path.slice(-5).map(([x, y]) => keyOf(x, y)));
        candidates = candidates.map((c) => {
            const k = keyOf(c.x, c.y);
            const unvisited = p.visitedSet.has(k) ? 0 : 3.0;
            const bias = c.dir === "right" || c.dir === "bottom" ? 0.5 : 0;
            const loopPenalty = recent.has(k) ? -2.0 : 0;
            const jitter = Math.random() * 0.25;
            return {
                ...c,
                score: c.score + unvisited + bias + loopPenalty + jitter,
            };
        });

        const total = candidates.reduce((s, c) => s + c.score, 0);
        if (!(total > 0)) {
            const c = optsBase[randInt(0, optsBase.length - 1)];
            return c ? { nx: c.x, ny: c.y, dir: c.dir } : null;
        }
        let r = Math.random() * total;
        let chosen = candidates[candidates.length - 1];
        for (const c of candidates) {
            if ((r -= c.score) <= 0) {
                chosen = c;
                break;
            }
        }
        return { nx: chosen.x, ny: chosen.y, dir: chosen.dir };
    };

    // 캔버스 그리기 함수
    const draw = (
        canvas: HTMLCanvasElement | null,
        grid: Cell[][],
        pawns: PawnState[]
    ) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const W = canvas.width,
            H = canvas.height;
        const CELL_SIZE = Math.floor(Math.min(W / COLS, H / ROWS));

        ctx.clearRect(0, 0, W, H);

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                ctx.fillStyle = (x + y) % 2 ? "#f1f5f9" : "#eef2f7";
                ctx.fillRect(
                    x * CELL_SIZE,
                    y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
        }

        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = "#1e40af";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("START", CELL_SIZE / 2, CELL_SIZE / 2);

        const ex = (COLS - 1) * CELL_SIZE;
        const ey = (ROWS - 1) * CELL_SIZE;
        ctx.fillStyle = "#dcfce7";
        ctx.fillRect(ex, ey, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = "#166534";
        ctx.fillText("EXIT", ex + CELL_SIZE / 2, ey + CELL_SIZE / 2);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        for (const row of grid) {
            for (const cell of row) {
                const x = cell.x * CELL_SIZE;
                const y = cell.y * CELL_SIZE;
                if (cell.walls.top) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + CELL_SIZE, y);
                    ctx.stroke();
                }
                if (cell.walls.right) {
                    ctx.beginPath();
                    ctx.moveTo(x + CELL_SIZE, y);
                    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.walls.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + CELL_SIZE);
                    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
                    ctx.stroke();
                }
                if (cell.walls.left) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + CELL_SIZE);
                    ctx.stroke();
                }
            }
        }

        for (const p of pawns) {
            const px = p.x * CELL_SIZE + CELL_SIZE / 2;
            const py = p.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.name[0], px, py);

            if (p.finished) {
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(W, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, CELL_SIZE);
        ctx.lineTo(0, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W, 0);
        ctx.lineTo(W, H - CELL_SIZE);
        ctx.stroke();
    };

    // 게임 루프
    useEffect(() => {
        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            if (!running) return;

            const SPEED = clamp(speed, MIN_SPEED_X, MAX_SPEED_X) * BASE_SPEED;

            setPawns((prev) =>
                prev.map((p, _, all) => {
                    if (p.finished) return p;

                    const atTarget = almostEq(p.x, p.tx) && almostEq(p.y, p.ty);
                    if (atTarget) {
                        const cx = clamp(p.tx, 0, COLS - 1);
                        const cy = clamp(p.ty, 0, ROWS - 1);
                        const cell = grid[cy]?.[cx];
                        if (!cell) return p;

                        if (cx === COLS - 1 && cy === ROWS - 1) {
                            const already = all
                                .map((a) => a.finishOrder)
                                .filter((n) => n >= 0);
                            const order =
                                (already.length ? Math.max(...already) : -1) +
                                1;
                            return {
                                ...p,
                                x: cx,
                                y: cy,
                                cx,
                                cy,
                                finished: true,
                                finishOrder: order,
                                stuckFrames: 0,
                            };
                        }

                        let pick = chooseNext(p, cell);
                        if (!pick) {
                            const nb: Array<{
                                x: number;
                                y: number;
                                dir: Dir;
                            }> = [];
                            if (!cell.walls.top && inBounds(cell.x, cell.y - 1))
                                nb.push({
                                    x: cell.x,
                                    y: cell.y - 1,
                                    dir: "top",
                                });
                            if (
                                !cell.walls.right &&
                                inBounds(cell.x + 1, cell.y)
                            )
                                nb.push({
                                    x: cell.x + 1,
                                    y: cell.y,
                                    dir: "right",
                                });
                            if (
                                !cell.walls.bottom &&
                                inBounds(cell.x, cell.y + 1)
                            )
                                nb.push({
                                    x: cell.x,
                                    y: cell.y + 1,
                                    dir: "bottom",
                                });
                            if (
                                !cell.walls.left &&
                                inBounds(cell.x - 1, cell.y)
                            )
                                nb.push({
                                    x: cell.x - 1,
                                    y: cell.y,
                                    dir: "left",
                                });
                            if (nb.length > 0) {
                                const c = nb[randInt(0, nb.length - 1)];
                                pick = { nx: c.x, ny: c.y, dir: c.dir };
                            }
                        }
                        if (!pick) return { ...p };

                        const nx = pick.nx,
                            ny = pick.ny;
                        const visitedSet = new Set(p.visitedSet);
                        visitedSet.add(keyOf(nx, ny));
                        return {
                            ...p,
                            cx,
                            cy,
                            tx: nx,
                            ty: ny,
                            prevDir: pick.dir,
                            visitedSet,
                            path: [...p.path, [nx, ny] as [number, number]],
                            stuckFrames: 0,
                        };
                    }

                    const nx = clamp(p.x + (p.tx - p.x) * SPEED, 0, COLS - 1);
                    const ny = clamp(p.y + (p.ty - p.y) * SPEED, 0, ROWS - 1);
                    return { ...p, x: nx, y: ny };
                })
            );
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [running, grid, speed]);

    // 초기 타겟 설정
    useEffect(() => {
        if (running) setPawns((prev) => ensureInitialTargets(prev, grid));
    }, [running, grid]);

    // 근접도 계산
    const proximity = useMemo(() => {
        const ex = COLS - 1,
            ey = ROWS - 1;
        return pawns
            .map((p) => {
                const dx = ex - p.x,
                    dy = ey - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return {
                    id: p.id,
                    name: p.name,
                    color: p.color,
                    dist,
                    finished: p.finished,
                };
            })
            .sort((a, b) =>
                a.finished === b.finished
                    ? a.dist - b.dist
                    : a.finished
                    ? -1
                    : 1
            );
    }, [pawns]);

    // 최종 순위 계산
    const finalRanking = useMemo(() => {
        const finished = pawns
            .filter((p) => p.finished && p.finishOrder >= 0)
            .sort((a, b) => a.finishOrder - b.finishOrder);
        const allDone = finished.length === pawns.length && pawns.length > 0;
        const loser = allDone ? finished[finished.length - 1]?.name : null;
        return { finished, allDone, loser };
    }, [pawns]);

    // 게임 완료 체크 및 그리기
    useEffect(() => {
        const allDone =
            running && pawns.length > 0 && pawns.every((p) => p.finished);
        if (allDone) {
            const last = [...pawns].sort(
                (a, b) => a.finishOrder - b.finishOrder
            )[pawns.length - 1];
            setRunning(false);
            onFinish(last.name);
        }
        draw(canvasRef.current, grid, pawns);
    }, [pawns, grid, running]);

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <MazePresenter
                wrapRef={wrapRef}
                canvasRef={canvasRef}
                players={players}
                newName={newName}
                speed={speed}
                running={running}
                pawns={pawns}
                proximity={proximity}
                finalRanking={finalRanking}
                setNewName={setNewName}
                setSpeed={setSpeed}
                addPlayer={addPlayer}
                removePlayer={removePlayer}
                startGame={startGame}
                resetGame={resetGame}
                handleNameKeyDown={handleNameKeyDown}
            />
        </div>
    );
}
