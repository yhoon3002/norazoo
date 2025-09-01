import { useEffect, useMemo, useRef, useState } from "react";
import { PinballPresenterProps } from "../types/PinballTypes";
import useAudio from "../hooks/useAudio";
import createInitialBoard from "../utils/createInitialBoard";
import rebuildBoard from "../utils/rebuildBoard";
import {
    BALL_R,
    CANVAS_HEIGHT,
    CANVAS_WALL,
    CANVAS_WIDTH,
    GRID_DENSITY,
    PEG_R,
    SLOT_H,
} from "../data/constants";
import updatePhysics from "../utils/updatePhysics";
import useFitCanvas from "@/app/hooks/useFitCanvas";

export default function PinballPresenter(props: PinballPresenterProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null); // 패딩/보더 없는 순수 측정 박스

    const [name, setName] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [speed, setSpeed] = useState(1);
    const [sound, setSound] = useState(false);

    // seed는 히스토리에 남길 필요 없어서 상태 유지할 필요 없음
    const [seed, setSeed] = useState<number | null>(null);

    const board = useMemo(() => createInitialBoard(), []);
    const audioPing = useAudio(sound);

    useFitCanvas(wrapRef, canvasRef, CANVAS_WIDTH, CANVAS_HEIGHT);

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

    const newRound = () => {
        props.setRound((r) => r + 1);
        // 항상 랜덤: 매 라운드 새 시드 생성 (보드 RNG에 쓰이도록 전달만 하고 기록은 안 함)
        const newSeed = Math.floor(Math.random() * 1e9);
        setSeed(newSeed);
        startRun();
    };

    const rounded = (
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

    const drawCanvas = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 외곽
        rounded(
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
        rounded(
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

        // pegs
        for (const p of board.pegs) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
            ctx.fillStyle = "#94a3b8";
            ctx.fill();
        }

        // slots
        const slotTop = CANVAS_HEIGHT - SLOT_H - CANVAS_WALL;
        ctx.strokeStyle = "#9fb4ff";
        ctx.lineWidth = 2;

        for (const sl of board.slots) {
            ctx.fillStyle = result === sl.i ? "#1f4fff55" : "#0a1a33";
            ctx.fillRect(sl.x + 1, slotTop, sl.w - 2, SLOT_H);
            ctx.strokeRect(sl.x + 1, slotTop, sl.w - 2, SLOT_H);

            const label = props.players[sl.i] ?? "?";
            ctx.fillStyle = "#e5e7eb";
            const tw = ctx.measureText(label).width;
            ctx.fillText(
                label,
                sl.x + sl.w * 0.5 - tw / 2,
                slotTop + SLOT_H * 0.55
            );
        }

        // ball
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

    // ----- 보드 재구축 (항상 랜덤 모드로 강제) -----
    useEffect(() => {
        rebuildBoard(
            board,
            props.players,
            seed ?? Math.floor(Math.random() * 1e9),
            /* lockSeed = */ false, // ✅ 항상 랜덤
            GRID_DENSITY,
            true,
            true
        );
    }, [props.players, seed, board]);

    // ----- 키 입력 -----
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.code === "Space") startRun();
            if (e.code === "KeyR") {
                setRunning(false);
                setResult(null);
            }
            if (e.code === "KeyN") newRound();
            // 'KeyS' (시드 고정 토글) 제거
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [props.players]);

    // 루프
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
                    props.pushHistory({
                        round: props.round,
                        name: props.players[slotIdx],
                        seed: null, // ✅ 항상 랜덤이므로 재현용 시드 기록하지 않음
                    });
                },
                audioPing
            );

            drawCanvas(ctx);
            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [speed, audioPing, props.players, props.round, seed, board]);

    return (
        <>
            <div className="w-full h-full flex flex-col gap-4">
                <h1 className="text-2xl font-bold tracking-tight">
                    멀티 벌칙 핀볼
                </h1>
                <p className="text-sm opacity-80">
                    여러 명 중에서 시각적으로 공정하게 벌칙자를 뽑는 미니 게임
                </p>

                {/* 행 래퍼: 가로 전부 사용, 동일 높이로 늘림 */}
                <div className="flex flex-col lg:flex-row gap-6 w-full flex-1 min-h-0 items-stretch">
                    {/* LEFT: 게임 카드 (카드 안에 캔버스 + 컨트롤 포함) */}
                    <div className="flex-1 min-h-0">
                        <div className="h-full rounded-2xl shadow-xl bg-slate-900/60 ring-1 ring-slate-700 p-3 overflow-hidden flex flex-col relative">
                            {/* 캔버스 영역: 남은 공간 전부 차지 (측정 박스는 padding/border 없음) */}
                            <div
                                ref={wrapRef}
                                className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden"
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="rounded-xl max-w-full max-h-full object-contain"
                                />
                            </div>

                            {/* HUD */}
                            <div className="absolute left-4 top-4 text-slate-200 text-sm bg-slate-900/50 rounded-md px-2 py-1">
                                라운드{" "}
                                <span className="font-semibold tabular-nums">
                                    {props.round}
                                </span>
                            </div>
                            {result !== null && (
                                <div className="absolute right-4 top-4 text-slate-100 text-sm bg-emerald-600/80 rounded-md px-3 py-1">
                                    벌칙자:{" "}
                                    <span className="font-semibold">
                                        {props.players[result]}
                                    </span>
                                </div>
                            )}

                            {/* 컨트롤 (카드 내부 하단) */}
                            <div className="mt-3 shrink-0 flex flex-wrap items-center gap-2">
                                <button
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm shadow"
                                    onClick={startRun}
                                >
                                    시작 (Space)
                                </button>
                                <button
                                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm"
                                    onClick={() => {
                                        setRunning(false);
                                        setResult(null);
                                    }}
                                >
                                    정지/리셋 (R)
                                </button>
                                <button
                                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
                                    onClick={newRound}
                                >
                                    새 라운드 (N)
                                </button>

                                <label className="ml-2 text-sm text-slate-200 flex items-center gap-2">
                                    속도
                                    <input
                                        type="range"
                                        min={0.6}
                                        max={1.8}
                                        step={0.05}
                                        value={speed}
                                        onChange={(e) =>
                                            setSpeed(parseFloat(e.target.value))
                                        }
                                    />
                                </label>
                                <label className="ml-2 text-sm text-slate-200 flex items-center gap-2">
                                    사운드
                                    <input
                                        type="checkbox"
                                        checked={sound}
                                        onChange={(e) =>
                                            setSound(e.target.checked)
                                        }
                                    />
                                </label>
                                {/* 시드/락 UI 제거 */}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: 고정폭 패널 */}
                    <div className="w-full lg:w-[340px] flex-none">
                        {/* 참가자 */}
                        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-700 p-4">
                            <p className="text-sm font-medium text-slate-200">
                                참가자
                            </p>
                            <div className="flex gap-2 mt-2">
                                <input
                                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm"
                                    placeholder="이름 입력"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            if (name.trim())
                                                props.addPlayer(name.trim());
                                            setName("");
                                        }
                                    }}
                                />
                                <button
                                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                                    onClick={() => {
                                        if (name.trim())
                                            props.addPlayer(name.trim());
                                        setName("");
                                    }}
                                >
                                    추가
                                </button>
                            </div>
                            <ul className="mt-3 space-y-2">
                                {props.players.map((p, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2"
                                    >
                                        <span className="text-slate-100 text-sm">
                                            {p}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                                                onClick={() =>
                                                    props.movePlayer(i, -1)
                                                }
                                            >
                                                ▲
                                            </button>
                                            <button
                                                className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                                                onClick={() =>
                                                    props.movePlayer(i, 1)
                                                }
                                            >
                                                ▼
                                            </button>
                                            <button
                                                className="px-2 py-1 text-xs rounded bg-rose-700 hover:bg-rose-600 text-white"
                                                onClick={() =>
                                                    props.removePlayer(i)
                                                }
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 기록 */}
                        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-700 p-4 mt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-200">
                                    기록 (최근 15)
                                </p>
                                <button
                                    className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
                                    onClick={props.clearHistory}
                                >
                                    초기화
                                </button>
                            </div>
                            <ul className="mt-2 space-y-1 max-h-60 overflow-auto pr-1">
                                {props.history.length === 0 && (
                                    <li className="text-slate-400 text-sm">
                                        아직 기록이 없습니다.
                                    </li>
                                )}
                                {props.history.map((h, idx) => (
                                    <li
                                        key={idx}
                                        className="text-slate-200 text-sm flex items-center justify-between bg-slate-800 rounded-lg px-2 py-1"
                                    >
                                        <span>
                                            R{h.round} — <b>{h.name}</b>
                                        </span>
                                        <span className="opacity-60 text-xs">
                                            {/* 항상 랜덤 */}
                                            랜덤
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="text-slate-400 text-xs mt-2">
                    Tip: 참가자 수가 많으면 보드가 자동으로 칸을 더 잘게 나눠요.
                </div>
            </div>
        </>
    );
}
