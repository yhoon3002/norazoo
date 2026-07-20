// rpg/menu/FastTravelPanel.tsx — 활성화한 깃발 간 이동
"use client";

import { useGame } from "../presenter/useGameStore";
import { STORY_FLAGS } from "../data/storyData";

export function FastTravelPanel() {
    const open = useGame((s) => (s.ui as any).fastTravelOpen);
    const flags = useGame((s) => s.flags);
    const closeAll = useGame((s) => s.closeAll);
    const requestTeleport = useGame((s) => (s as any).requestTeleport);

    if (!open) return null;

    const activated = STORY_FLAGS.filter((f) => flags[`flag_${f.id}`]);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="w-[min(380px,90vw)] rounded-2xl border border-yellow-500/70 bg-black/90 p-6">
                <div className="mb-1 text-center text-xs tracking-[0.35em] text-yellow-300">
                    FAST TRAVEL
                </div>
                <div className="mb-4 text-center text-lg font-bold text-white">
                    🚩 어디로 이동할까?
                </div>
                <div className="space-y-2">
                    {activated.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => {
                                requestTeleport({
                                    x: f.x,
                                    y: f.y ?? -33.2,
                                    z: f.z + 1.4, // 깃대와 겹치지 않게 살짝 비켜서
                                });
                                closeAll();
                            }}
                            className="w-full rounded-xl border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-left text-yellow-100 transition-colors hover:border-yellow-400 hover:bg-yellow-500/15"
                        >
                            🚩 {f.label}
                        </button>
                    ))}
                    {activated.length <= 1 && (
                        <div className="py-2 text-center text-sm text-gray-400">
                            아직 다른 깃발을 활성화하지 않았다 — 여정에서
                            깃발을 찾아 활성화하자
                        </div>
                    )}
                </div>
                <button
                    onClick={() => closeAll()}
                    className="mt-4 w-full rounded-xl border border-white/15 py-2 text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
                >
                    닫기 (ESC)
                </button>
            </div>
        </div>
    );
}
