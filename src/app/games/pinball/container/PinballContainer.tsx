import React, { useState, useMemo, useRef, useEffect } from "react";
import PinballPresenter from "../presenter/PinballPresenter";
import { HistoryEntry } from "../types/PinballTypes";
import { shuffleName } from "../utils/shuffleName";
import useAudio from "../hooks/useAudio";
import createInitialBoard from "../utils/createInitialBoard";
import rebuildBoard from "../utils/rebuildBoard";
import updatePhysics from "../utils/updatePhysics";
import useFitCanvas from "../hooks/useFitCanvas";
import {
    BALL_R,
    CANVAS_HEIGHT,
    CANVAS_WALL,
    CANVAS_WIDTH,
    GRID_DENSITY,
    PEG_R,
    SLOT_H,
} from "../data/constants";

export default function PinballContainer() {
    const initialPlayers = [
        "박민호",
        "이지은",
        "임영훈",
        "장민규",
        "정연호",
        "정종호",
    ];

    const canvasRef = useRef<HTMLCanvasElement>(null!);
    const wrapRef = useRef<HTMLDivElement>(null!);

    // 플레이어 관련 상태
    const [players, setPlayers] = useState<string[]>(
        shuffleName(initialPlayers)
    );
    const [name, setName] = useState("");

    // 게임 상태
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [round, setRound] = useState<number>(1);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [speed, setSpeed] = useState(1);
    const [sound, setSound] = useState(false);
    const [seed, setSeed] = useState<number | null>(null);

    // 게임 보드와 오디오
    const board = useMemo(() => createInitialBoard(), []);
    const audioPing = useAudio(sound);

    // 캔버스 맞춤 훅
    useFitCanvas(
        wrapRef as React.RefObject<HTMLElement>,
        canvasRef,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
    );

    // 둥근 사각형 그리기 헬퍼 함수
    const drawRoundedRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        stroke = "#18233b",
        fill?: string
    ) => {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    // 캔버스 그리기 함수
    const drawCanvas = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 외곽
        drawRoundedRect(
            ctx,
            4,
            4,
            CANVAS_WIDTH - 8,
            CANVAS_HEIGHT - 8,
            20,
            "#0f172a",
            "#1e293b"
        );

        // 필드
        drawRoundedRect(
            ctx,
            CANVAS_WALL,
            CANVAS_WALL,
            CANVAS_WIDTH - CANVAS_WALL * 2,
            CANVAS_HEIGHT - CANVAS_WALL * 2,
            16,
            undefined,
            "#0b2147"
        );

        // 제목
        ctx.fillStyle = "#c7d2fe";
        ctx.textBaseline = "top";
        ctx.font = "600 16px ui-sans-serif, system-ui";
        ctx.fillText("Pinball Party", CANVAS_WALL + 8, 32);

        // pegs 그리기
        for (const p of board.pegs) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
            ctx.fillStyle = "#94a3b8";
            ctx.fill();
        }

        // slots 그리기
        const slotTop = CANVAS_HEIGHT - SLOT_H - CANVAS_WALL;
        ctx.strokeStyle = "#9fb4ff";
        ctx.lineWidth = 2;

        for (const sl of board.slots) {
            ctx.fillStyle = result === sl.i ? "#1f4fff55" : "#0a1a33";
            ctx.fillRect(sl.x + 1, slotTop, sl.w - 2, SLOT_H);
            ctx.strokeRect(sl.x + 1, slotTop, sl.w - 2, SLOT_H);

            const label = players[sl.i] ?? "?";
            ctx.fillStyle = "#e5e7eb";
            const tw = ctx.measureText(label).width;
            ctx.fillText(
                label,
                sl.x + sl.w * 0.5 - tw / 2,
                slotTop + SLOT_H * 0.55
            );
        }

        // ball 그리기
        const b = board.ball;
        if (b.alive) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fillStyle = "#e5e7eb";
            ctx.fill();
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(
                "Space 또는 시작 버튼으로 공 떨어뜨리기",
                CANVAS_WALL + 8,
                50
            );
        }
    };

    // 플레이어 관리 함수
    const addPlayer = (name: string) => setPlayers((arr) => [...arr, name]);
    const removePlayer = (i: number) =>
        setPlayers((arr) => arr.filter((_, idx) => idx !== i));
    const movePlayer = (i: number, dir: -1 | 1) =>
        setPlayers((arr) => {
            const j = i + dir;
            if (j < 0 || j >= arr.length) return arr;
            const copy = arr.slice();
            [copy[i], copy[j]] = [copy[j], copy[i]];
            return copy;
        });

    // 게임 로직 함수
    const startRun = () => {
        setResult(null);
        const startX =
            CANVAS_WALL +
            60 +
            board.rng() * (CANVAS_WIDTH - CANVAS_WALL * 2 - 120);
        const startVx = (board.rng() - 0.5) * 120;
        board.ball = { x: startX, y: 90, vx: startVx, vy: 0, alive: true };
        setRunning(true);
    };

    const stopReset = () => {
        setRunning(false);
        setResult(null);
    };

    const newRound = () => {
        setRound((r) => r + 1);
        const newSeed = Math.floor(Math.random() * 1e9);
        setSeed(newSeed);
        startRun();
    };

    // 기록 관리 함수
    const pushHistory = (entry: HistoryEntry) =>
        setHistory((h) => [entry, ...h].slice(0, 15));
    const clearHistory = () => setHistory([]);

    // 이름 추가 핸들러
    const handleAddPlayer = () => {
        if (name.trim()) {
            addPlayer(name.trim());
            setName("");
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleAddPlayer();
        }
    };

    // 보드 재구축
    useEffect(() => {
        rebuildBoard(
            board,
            players,
            seed ?? Math.floor(Math.random() * 1e9),
            false,
            GRID_DENSITY,
            true,
            true
        );
    }, [players, seed, board]);

    // 키 입력 처리
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.code === "Space") startRun();
            if (e.code === "KeyR") stopReset();
            if (e.code === "KeyN") newRound();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [players]);

    // 애니메이션 루프
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let raf = 0;
        const step = (t: number) => {
            if (!board.tPrev) board.tPrev = t;
            let dt = ((t - board.tPrev) / 1000) * speed;
            board.tPrev = t;
            dt = Math.min(dt, 0.032);

            updatePhysics(
                board,
                dt,
                (slotIdx) => {
                    setResult(slotIdx);
                    setRunning(false);
                    pushHistory({
                        round: round,
                        name: players[slotIdx],
                        seed: null,
                    });
                },
                audioPing
            );

            drawCanvas(ctx);
            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [speed, audioPing, players, round, seed, board]);

    return (
        <div className="flex-1 min-h-0 w-full h-full">
            <PinballPresenter
                // refs
                canvasRef={canvasRef}
                wrapRef={wrapRef}
                // 상태
                players={players}
                name={name}
                history={history}
                round={round}
                result={result}
                speed={speed}
                sound={sound}
                running={running}
                // 상태 변경 함수
                setName={setName}
                setSpeed={setSpeed}
                setSound={setSound}
                // 액션 함수
                startRun={startRun}
                stopReset={stopReset}
                newRound={newRound}
                addPlayer={handleAddPlayer}
                removePlayer={removePlayer}
                movePlayer={movePlayer}
                clearHistory={clearHistory}
                handleNameKeyDown={handleNameKeyDown}
            />
        </div>
    );
}
