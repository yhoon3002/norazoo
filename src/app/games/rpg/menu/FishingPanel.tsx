// rpg/menu/FishingPanel.tsx — 낚시 미니게임 (왕복 마커를 초록 존에서 Space 3회)
"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "../presenter/useGameStore";
import { FISHING_SPOTS } from "../data/gameData";

const ROUNDS = 3;

/** 낚시 어종 표시명 — MenuUI MATERIALS와 동일 표기 */
const FISH_NAMES: Record<string, string> = {
    fish_common: "생선",
    fish_rare: "월광어",
    silver_trout: "은빛송어",
    coral_fish: "산호어",
    wind_trout: "바람송어",
    ice_fish: "빙어",
    deep_fish: "심연어",
    gold_carp: "황금잉어",
};

export function FishingPanel() {
    const open = useGame((s) => (s.ui as any).fishingOpen);
    const fishingSpotId = useGame((s) => (s.ui as any).fishingSpotId);
    const closeAll = useGame((s) => s.closeAll);
    const addItem = useGame((s) => s.addItem);
    const [round, setRound] = useState(0);
    const [hits, setHits] = useState<number[]>([]); // 라운드별 정확도(0~1)
    const posRef = useRef(0);
    const dirRef = useRef(1);
    const barRef = useRef<HTMLDivElement>(null);

    // 열릴 때 초기화
    useEffect(() => {
        if (open) return;
        setRound(0);
        setHits([]);
        posRef.current = 0;
        dirRef.current = 1;
    }, [open]);

    // 마커 왕복 — 라운드가 오를수록 빨라진다
    useEffect(() => {
        if (!open) return;
        let raf = 0;
        let last = performance.now();
        const speed = 1.2 + round * 0.5;
        const tick = (t: number) => {
            const dt = (t - last) / 1000;
            last = t;
            posRef.current += dirRef.current * dt * speed;
            if (posRef.current > 1) {
                posRef.current = 1;
                dirRef.current = -1;
            }
            if (posRef.current < 0) {
                posRef.current = 0;
                dirRef.current = 1;
            }
            if (barRef.current)
                barRef.current.style.left = `${posRef.current * 100}%`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [open, round]);

    // Space 판정
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.key !== " ") return;
            e.preventDefault();
            const acc = 1 - Math.min(1, Math.abs(posRef.current - 0.5) / 0.5);
            const newHits = [...hits, acc];
            setHits(newHits);
            if (newHits.length < ROUNDS) {
                setRound((r) => r + 1);
                return;
            }
            // 결과 — 초록 존(acc>0.7) 성공, 밝은 존(acc>0.92) 퍼펙트 2회↑면 희귀 어종
            const s = useGame.getState() as any;
            const table =
                FISHING_SPOTS.find((sp) => sp.id === fishingSpotId)?.table ??
                FISHING_SPOTS[0].table;
            const perfect = newHits.filter((a) => a > 0.92).length;
            const catches = newHits.filter((a) => a > 0.7).length;
            if (catches === 0) {
                s.spawnPopup({
                    side: "enemy",
                    text: "🐟 물고기가 도망갔다…",
                    color: "#94a3b8",
                });
            } else if (perfect >= 2) {
                addItem(table.rare, 1);
                // 도감 기록 — 어종별 어획 성공 횟수 (killCounts 네임스페이스)
                useGame.setState((st: any) => ({
                    killCounts: {
                        ...st.killCounts,
                        [`caught_${table.rare}`]: (st.killCounts[`caught_${table.rare}`] ?? 0) + 1,
                    },
                }));
                s.spawnPopup({
                    side: "ally",
                    text: `🌕 ${FISH_NAMES[table.rare] ?? table.rare}을(를) 낚았다!`,
                    color: "#7dd3fc",
                });
            } else {
                addItem(table.common, catches);
                // 도감 기록 — 어종별 어획 성공 횟수 (killCounts 네임스페이스)
                useGame.setState((st: any) => ({
                    killCounts: {
                        ...st.killCounts,
                        [`caught_${table.common}`]: (st.killCounts[`caught_${table.common}`] ?? 0) + 1,
                    },
                }));
                s.spawnPopup({
                    side: "ally",
                    text: `🐟 ${FISH_NAMES[table.common] ?? table.common} ×${catches}`,
                    color: "#8fd67a",
                });
            }
            closeAll();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, hits, addItem, closeAll, fishingSpotId]);

    if (!open) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 pb-24">
            <div className="w-[26rem] max-w-[90vw] rounded-2xl border border-sky-400/60 bg-black/85 p-5">
                <div className="mb-1 text-center text-xs tracking-[0.3em] text-sky-300">
                    FISHING
                </div>
                <div className="mb-3 text-center text-sm text-white">
                    마커가 초록 존에 올 때 Space! ({hits.length + 1}/{ROUNDS})
                </div>
                <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="absolute inset-y-0 left-[35%] w-[30%] bg-emerald-500/40" />
                    <div className="absolute inset-y-0 left-[46%] w-[8%] bg-emerald-400/80" />
                    <div
                        ref={barRef}
                        className="absolute top-0 h-6 w-1.5 -translate-x-1/2 rounded bg-white"
                        style={{ left: "0%" }}
                    />
                </div>
                <div className="mt-3 text-center text-xs text-gray-400">
                    ESC: 그만두기
                </div>
            </div>
        </div>
    );
}
