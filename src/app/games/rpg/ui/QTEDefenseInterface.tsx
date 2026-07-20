import { useEffect, useRef, useMemo, useState } from "react";
import { useGame } from "../presenter/useGameStore";

export function QTEInterface() {
    const combat = useGame((s) => s.combat);
    const qteTap = useGame((s) => s.qteTap);
    const [tick, setTick] = useState(0);
    const rafRef = useRef<number | null>(null);

    const pts = useMemo(
        () => [
            { x: 100, y: 10 },
            { x: 190, y: 100 },
            { x: 100, y: 190 },
            { x: 10, y: 100 },
        ],
        []
    );

    const highlightEdge = useMemo(() => {
        if (combat.phase !== "playerQTE") return 1;
        const needEdge = combat.plan[combat.index];
        return needEdge;
    }, [combat]);

    useEffect(() => {
        const loop = () => {
            setTick((t) => t + 1);
            rafRef.current = requestAnimationFrame(loop);
        };
        if (combat.phase === "playerQTE") {
            rafRef.current = requestAnimationFrame(loop);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [combat.phase]);

    if (combat.phase !== "playerQTE") return null;

    const t = Math.min(
        1,
        (performance.now() - combat.startAt) / combat.windowMs
    );
    const edgeF = t * 4;
    const edge = Math.min(3, Math.floor(edgeF));
    const f = edgeF - edge;

    const p0 = pts[edge];
    const p1 = pts[(edge + 1) % 4];
    const x = p0.x * (1 - f) + p1.x * f;
    const y = p0.y * (1 - f) + p1.y * f;
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    const seg = (i: number) => {
        const a = pts[i],
            b = pts[(i + 1) % 4];
        return `M${a.x} ${a.y} L${b.x} ${b.y}`;
    };

    return (
        <div
            className="absolute inset-0 pointer-events-auto flex items-center justify-center"
            onClick={() => qteTap()}
            style={{ cursor: "pointer" }}
        >
            <svg width="240" height="240" viewBox="0 0 200 200">
                {[0, 1, 2, 3].map((i) => (
                    <path
                        key={`t-${i}`}
                        d={seg(i)}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity={0.55}
                    />
                ))}

                <path
                    d={seg(highlightEdge)}
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="10"
                    strokeLinecap="round"
                />

                <g
                    transform={`translate(${x}, ${y}) rotate(${
                        (angle * 180) / Math.PI
                    })`}
                >
                    <rect
                        x="-9"
                        y="-2"
                        width="18"
                        height="4"
                        rx="2"
                        ry="2"
                        fill="white"
                    />
                </g>
            </svg>
            <div className="absolute mt-28 text-xs text-yellow-300 text-center">
                F / Space / Enter / Click: Timing
                <br />
                <span className="text-green-400">
                    Press when white marker is on YELLOW line!
                </span>
            </div>
        </div>
    );
}

// ===== 첫 전투 방어 튜토리얼 오버레이 =====
// frozen: 시간 정지 + 안내 카드 (Space로 재개) / active: 상단 힌트 / success: 효과 설명
const LESSON_TEXT = {
    parry: {
        title: "패리 배우기",
        keyLabel: "F",
        body: "수축하는 링이 몸에 닿는 순간 F — 공격을 쳐낸다!",
        detail: "패리 성공: 에테르 +1 · 모든 타를 쳐내면 강력한 반격 발동",
        success: "패리 성공! 에테르 +1 — 전 타 패리 시 반격이 나간다",
    },
    dodge: {
        title: "회피 배우기",
        keyLabel: "W",
        body: "이번엔 링이 닿는 순간 W — 옆으로 피한다!",
        detail: "회피 성공: 피해 무효 — 단, 에테르는 차지 않는다 · 빨간 링은 패리 불가, 회피만 가능",
        success: "회피 성공! 피해 무효 — 에테르는 차지 않는다",
    },
} as const;

export function DefenseTutorial() {
    const tut = useGame((s) => (s as any).defenseTutorial) as
        | { lesson: "parry" | "dodge"; stage: "frozen" | "active" | "success"; frozenAt?: number }
        | null
        | undefined;
    const resume = useGame((s) => (s as any).resumeDefenseTutorial);

    useEffect(() => {
        if (!tut || tut.stage !== "frozen") return;
        const h = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.key === " " || e.key === "Enter" || e.code === "Space") {
                e.preventDefault();
                resume();
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [tut, resume]);

    if (!tut) return null;
    const t = LESSON_TEXT[tut.lesson];

    if (tut.stage === "frozen") {
        return (
            <div
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                onClick={() => resume()}
            >
                <div className="max-w-md rounded-2xl border-2 border-yellow-400 bg-black/90 px-8 py-6 text-center shadow-[0_0_40px_rgba(250,204,21,0.25)]">
                    <div className="mb-1 text-xs tracking-[0.3em] text-yellow-300">
                        TUTORIAL
                    </div>
                    <div className="mb-3 text-2xl font-bold text-white">
                        {t.title}
                    </div>
                    <div className="mb-2 text-base text-yellow-100">
                        {t.body.split(t.keyLabel).map((part, i, arr) => (
                            <span key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                    <kbd className="mx-1 inline-block rounded-lg border-2 border-yellow-400 bg-yellow-400/10 px-3 py-1 text-xl font-bold text-yellow-300">
                                        {t.keyLabel}
                                    </kbd>
                                )}
                            </span>
                        ))}
                    </div>
                    <div className="mb-4 text-sm text-gray-300">{t.detail}</div>
                    <div className="text-xs text-gray-400">
                        실패해도 피해 없이 다시 도전한다
                    </div>
                    <div className="mt-3 animate-pulse text-sm text-yellow-300">
                        Space — 계속 (시간이 다시 흐른다)
                    </div>
                </div>
            </div>
        );
    }

    if (tut.stage === "active") {
        return (
            <div className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2">
                <div className="rounded-xl border border-yellow-400/70 bg-black/80 px-5 py-2 text-yellow-200">
                    링이 닿는 순간{" "}
                    <kbd className="mx-1 rounded-md border border-yellow-400 px-2 py-0.5 font-bold text-yellow-300">
                        {t.keyLabel}
                    </kbd>
                    !
                </div>
            </div>
        );
    }

    return (
        <div className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2">
            <div className="rounded-xl border border-emerald-400/70 bg-black/85 px-5 py-2.5 text-emerald-200">
                ✨ {t.success}
            </div>
        </div>
    );
}

export function DefenseInterface() {
    const combat = useGame((s) => s.combat);
    const parry = useGame((s) => s.attemptParry);
    const dodge = useGame((s) => s.attemptDodge);

    const [_, setTick] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const loop = () => {
            setTick((t) => (t + 1) % 1000000);
            rafRef.current = requestAnimationFrame(loop);
        };
        if (combat.phase === "defenseWindow") {
            rafRef.current = requestAnimationFrame(loop);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [combat.phase]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            // 키 홀드 자동 반복 무시 — W(이동키)를 누른 채 전투에 들어오면
            // 반복 입력이 "Too early"로 방어권을 소진시켜 회피가 죽는다
            if (e.repeat) return;
            if (combat.phase !== "defenseWindow") return;
            // e.code 병행: 한글 입력 상태(ㄹ/ㅈ)에서도 동작
            const k = e.key.toLowerCase();
            if (k === "f" || e.code === "KeyF") parry();
            else if (k === "w" || e.code === "KeyW") dodge();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [combat.phase, parry, dodge]);

    if (
        combat.phase !== "defenseWindow" ||
        (combat as any).showDefenseUi === false
    )
        return null;

    const tl = combat.telegraph;
    const hits = tl.hits ?? [tl.hitAt];
    const parryable = tl.parryable !== false;
    const st = useGame.getState();
    const hitIndex = Math.min(st.defenseHitIndex ?? 0, hits.length - 1);

    // 방어 튜토리얼 정지 중엔 진행 게이지도 멈춘다
    const tut = (st as any).defenseTutorial;
    const now =
        tut?.stage === "frozen" ? tut.frozenAt : performance.now();
    const total = tl.endAt - tl.startAt;
    const progress = Math.min(1, Math.max(0, (now - tl.startAt) / total));

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
                className={`bg-black/80 backdrop-blur rounded-2xl p-6 border text-center ${
                    parryable ? "border-red-500" : "border-red-600"
                }`}
            >
                <div className="text-red-200 mb-1">
                    Enemy Attack!
                    {hits.length > 1 && (
                        <span className="ml-2 text-yellow-300 font-bold">
                            {hitIndex + 1} / {hits.length}타
                        </span>
                    )}
                </div>
                {!parryable && (
                    <div className="text-red-400 text-sm font-bold mb-2 animate-pulse">
                        ⚠️ 패리 불가 — 회피(W)만!
                    </div>
                )}
                <div className="relative w-72 h-4 bg-gray-800 rounded overflow-hidden mb-2">
                    {hits.map((h, i) => {
                        const dodgeStart =
                            ((h - tl.startAt - 180) / total) * 100;
                        const dodgeWidth = (360 / total) * 100;
                        const parryStart = ((h - tl.startAt - 90) / total) * 100;
                        const parryWidth = (180 / total) * 100;
                        return (
                            <span key={i}>
                                <span
                                    className={`absolute top-0 h-full ${
                                        i === hitIndex
                                            ? "bg-green-400/30"
                                            : "bg-green-400/10"
                                    }`}
                                    style={{
                                        left: `${dodgeStart}%`,
                                        width: `${dodgeWidth}%`,
                                    }}
                                />
                                {parryable && (
                                    <span
                                        className={`absolute top-0 h-full ${
                                            i === hitIndex
                                                ? "bg-yellow-400/50"
                                                : "bg-yellow-400/15"
                                        }`}
                                        style={{
                                            left: `${parryStart}%`,
                                            width: `${parryWidth}%`,
                                        }}
                                    />
                                )}
                            </span>
                        );
                    })}
                    <div
                        className="absolute top-0 h-full bg-red-600/70"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
                <div className="text-xs text-gray-300">
                    {parryable
                        ? "W: Dodge(넓음) · F: Parry(정밀)"
                        : "W: Dodge — 링이 안쪽 원에 닿는 순간!"}
                </div>
            </div>
        </div>
    );
}