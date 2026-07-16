// rpg/menu/FullMapPanel.tsx — M키 전체지도 (활성 깃발 클릭: 빠른이동)
"use client";

import { useGame } from "../presenter/useGameStore";
import { useMapStore, worldToUV } from "../presenter/mapStore";
import { STORY_FLAGS, LORE_POINTS } from "../data/storyData";
import { MERCHANT_POS } from "../data/gameData";

export function FullMapPanel() {
    const open = useGame((s) => (s.ui as any).mapOpen);
    const closeAll = useGame((s) => s.closeAll);
    const requestTeleport = useGame((s) => (s as any).requestTeleport);
    const flags = useGame((s) => s.flags);
    const target = useGame((s) => s.story.target);
    const playerPos = useGame((s) => s.player.pos);
    const mapUrl = useMapStore((s) => s.mapUrl);
    const bounds = useMapStore((s) => s.bounds);

    if (!open) return null;

    if (!mapUrl || !bounds) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="rounded-2xl border border-yellow-500/70 bg-black/90 px-8 py-6 text-yellow-100">
                    지도를 그리는 중… 잠시 후 다시 열어줘 (M)
                </div>
            </div>
        );
    }

    const pct = (x: number, z: number) => {
        const { u, v } = worldToUV(x, z, bounds);
        return { left: `${u * 100}%`, top: `${v * 100}%` };
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-yellow-500/70 bg-black/90 p-4">
                <div className="mb-2 text-center text-xs tracking-[0.35em] text-yellow-300">
                    WORLD MAP — 노라
                </div>
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={mapUrl}
                        alt="노라 전체지도"
                        className="rounded-xl border border-white/10"
                        style={{ maxWidth: "80vw", maxHeight: "70vh" }}
                    />
                    {/* 조사 포인트 — 조사 완료는 흐리게 */}
                    {LORE_POINTS.map((lp) => (
                        <div
                            key={lp.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 text-[11px] ${
                                flags[`lore_${lp.id}`] ? "opacity-30" : ""
                            }`}
                            style={pct(lp.x, lp.z)}
                            title={lp.label}
                        >
                            {lp.kind === "note" ? "📜" : "🗿"}
                        </div>
                    ))}
                    {/* 상인 */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-sm"
                        style={pct(MERCHANT_POS.x, MERCHANT_POS.z)}
                        title="요리사(상점)"
                    >
                        💰
                    </div>
                    {/* 깃발 — 활성화된 것만 클릭 가능 */}
                    {STORY_FLAGS.map((f) => {
                        const active = !!flags[`flag_${f.id}`];
                        return (
                            <button
                                key={f.id}
                                disabled={!active}
                                onClick={() => {
                                    requestTeleport({
                                        x: f.x,
                                        y: f.y ?? -33.2,
                                        z: f.z + 1.4, // 깃대와 겹치지 않게 (FastTravelPanel과 동일)
                                    });
                                    closeAll();
                                }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-sm ${
                                    active
                                        ? "cursor-pointer transition-transform hover:scale-125"
                                        : "opacity-40 grayscale"
                                }`}
                                style={pct(f.x, f.z)}
                                title={
                                    active
                                        ? `${f.label} — 클릭: 빠른이동`
                                        : `${f.label} (미활성)`
                                }
                            >
                                🚩
                                <span className="ml-0.5 text-[10px] text-yellow-200">
                                    {f.label}
                                </span>
                            </button>
                        );
                    })}
                    {/* 목표 */}
                    {target && (
                        <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse text-lg text-sky-300"
                            style={pct(target.x, target.z)}
                            title="현재 목표"
                        >
                            ◆
                        </div>
                    )}
                    {/* 플레이어 */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-lg text-sky-300"
                        style={pct(playerPos.x, playerPos.z)}
                        title="현재 위치"
                    >
                        ▲
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                        ▲ 현재 위치 · ◆ 목표 · 🚩 깃발(클릭: 빠른이동) · 💰 상인
                        · 📜/🗿 조사 포인트
                    </span>
                    <span>M / ESC: 닫기</span>
                </div>
            </div>
        </div>
    );
}
