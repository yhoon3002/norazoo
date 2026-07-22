// rpg/menu/FullMapPanel.tsx — M키 전체지도 (활성 깃발 클릭: 빠른이동)
"use client";

import { useGame } from "../presenter/useGameStore";
import { useMapStore, worldToUV } from "../presenter/mapStore";
import { STORY_FLAGS, LORE_POINTS, stageAtLeast } from "../data/storyData";
import { POIS } from "../data/poiData";
import { MERCHANT_POS, FISHING_SPOTS, FISH_NAMES } from "../data/gameData";
import { SIDE_QUESTS } from "../data/questData";
import { BOARD_POS } from "../field/BountyBoard";
import { ZONE_DEFS } from "../data/placementData";
import { zoneProgress } from "../data/zoneRewards";


export function FullMapPanel() {
    const open = useGame((s) => (s.ui as any).mapOpen);
    const closeAll = useGame((s) => s.closeAll);
    const requestTeleport = useGame((s) => (s as any).requestTeleport);
    const flags = useGame((s) => s.flags);
    const target = useGame((s) => s.story.target);
    const playerPos = useGame((s) => s.player.pos);
    const stage = useGame((s) => s.story.stage);
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
                    {/* 존 라벨 — 정복 진행도(n/5) 및 완료 시 🏆 표시 */}
                    {ZONE_DEFS.map((zd) => {
                        const { done, total } = zoneProgress(zd.id, flags);
                        const conquered = !!flags[`zone_done_${zd.id}`];
                        return (
                            <div
                                key={zd.id}
                                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] tracking-widest text-white/50"
                                style={pct(zd.cx, zd.cz)}
                            >
                                {conquered
                                    ? `🏆 ${zd.label}`
                                    : `${zd.label} ${done}/${total}`}
                            </div>
                        );
                    })}
                    {/* 낚시터 */}
                    {FISHING_SPOTS.map((sp) => (
                        <div
                            key={sp.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-sm"
                            style={pct(sp.x, sp.z)}
                            title={`낚시터 — ${FISH_NAMES[sp.table.common] ?? sp.table.common}/${FISH_NAMES[sp.table.rare] ?? sp.table.rare}`}
                        >
                            🎣
                        </div>
                    ))}
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
                    {/* 사냥 의뢰판 */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-sm"
                        style={pct(BOARD_POS.x, BOARD_POS.z)}
                        title="사냥 의뢰판"
                    >
                        📋
                    </div>
                    {/* 발견한 전망 포인트 */}
                    {POIS.filter((p) => flags[`poi_${p.id}`]).map((p) => (
                        <div
                            key={p.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px]"
                            style={pct(p.x, p.z)}
                            title={p.label}
                        >
                            🏞️
                        </div>
                    ))}
                    {/* 진행 가능한 사이드 퀘스트 */}
                    {SIDE_QUESTS.filter(
                        (q) =>
                            stageAtLeast(stage, q.availableFrom) &&
                            !flags[`quest_${q.id}_done`]
                    ).map((q) => (
                        <div
                            key={q.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px]"
                            style={pct(q.npc.x, q.npc.z)}
                            title={q.npc.label}
                        >
                            ❗
                        </div>
                    ))}
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
                        · 📜/🗿 조사 포인트 · 🏞️ 전망 · ❗ 의뢰 · 📋 사냥 의뢰판
                        · 🎣 낚시터
                    </span>
                    <span>M / ESC: 닫기</span>
                </div>
            </div>
        </div>
    );
}
