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
            const k = e.key.toLowerCase();
            if (combat.phase !== "defenseWindow") return;
            if (k === "f") parry();
            else if (k === "w") dodge();
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
    const now = performance.now();
    const total = tl.endAt - tl.startAt;
    const progress = Math.min(1, Math.max(0, (now - tl.startAt) / total));
    const parryStart = ((tl.hitAt - tl.startAt - 90) / total) * 100;
    const parryWidth = (180 / total) * 100;
    const dodgeStart = ((tl.hitAt - tl.startAt - 180) / total) * 100;
    const dodgeWidth = (360 / total) * 100;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur rounded-2xl p-6 border border-red-500 text-center">
                <div className="text-red-200 mb-3">Enemy Attack!</div>
                <div className="relative w-72 h-4 bg-gray-800 rounded overflow-hidden mb-2">
                    <div
                        className="absolute top-0 h-full bg-green-400/25"
                        style={{
                            left: `${dodgeStart}%`,
                            width: `${dodgeWidth}%`,
                        }}
                    />
                    <div
                        className="absolute top-0 h-full bg-yellow-400/45"
                        style={{
                            left: `${parryStart}%`,
                            width: `${parryWidth}%`,
                        }}
                    />
                    <div
                        className="h-full bg-red-600"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
                <div className="text-xs text-gray-300">
                    W: Dodge(넓음) · F: Parry(정밀)
                </div>
            </div>
        </div>
    );
}