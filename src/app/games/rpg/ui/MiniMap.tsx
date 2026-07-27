// rpg/ui/MiniMap.tsx — 우상단 원형 미니맵 (북쪽 고정, 플레이어 중심)
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { useMapStore } from "../presenter/mapStore";
import { STORY_FLAGS, stageAtLeast } from "../data/storyData";
import { POIS, HIDDEN_TREASURE_IDS } from "../data/poiData";
import { MERCHANT_POS, FIELD_TREASURES, FISHING_SPOTS } from "../data/gameData";
import { SIDE_QUESTS } from "../data/questData";
import { BOND_EPISODES } from "../data/bondData";
import { DUNGEONS } from "../data/dungeonData";

const SIZE = 160; // px
const METERS_ACROSS = 64; // 미니맵 지름이 커버하는 월드 거리(m)
const S = SIZE / METERS_ACROSS; // px per meter

type View = { px: number; pz: number; headingDeg: number; dungeonActive: string | null };

export function MiniMap() {
    const mapUrl = useMapStore((s) => s.mapUrl);
    const bounds = useMapStore((s) => s.bounds);
    const target = useGame((s) => s.story.target);
    const flags = useGame((s) => s.flags);
    const stage = useGame((s) => s.story.stage);
    const [view, setView] = useState<View | null>(null);

    useEffect(() => {
        const id = setInterval(() => {
            const sc = (
                window as unknown as { __fieldScene?: THREE.Scene }
            ).__fieldScene;
            const p =
                (sc?.userData.__playerWorldPos as THREE.Vector3 | undefined) ??
                useGame.getState().player.pos;
            const fwd = sc?.userData.__camForward as
                | THREE.Vector3
                | undefined;
            const headingDeg = fwd
                ? (Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI
                : 0;
            const dungeonActive = (sc?.userData.__dungeonActive as string | undefined) ?? null;
            setView({ px: p.x, pz: p.z, headingDeg, dungeonActive });
        }, 120);
        return () => clearInterval(id);
    }, []);

    if (!mapUrl || !bounds || !view) return null;
    const { px, pz, headingDeg, dungeonActive } = view;

    // SP0 Task 6 — 지하 던전 진입 중엔 베이크 이미지 대신 어두운 패널 + 라벨 + 플레이어 화살표만
    if (dungeonActive) {
        const dungeon = DUNGEONS.find((d) => d.id === dungeonActive);
        return (
            <div
                className="pointer-events-none absolute top-4 right-4 rounded-full overflow-hidden border-2 border-amber-400/60 bg-slate-950/90 shadow-lg"
                style={{ width: SIZE, height: SIZE }}
            >
                <div className="absolute top-1 inset-x-0 text-center text-[9px] text-amber-300/80 px-2 leading-tight">
                    🕳️ {dungeon?.label ?? "지하"}
                </div>
                <div
                    className="absolute text-sky-300 leading-none"
                    style={{
                        left: SIZE / 2 - 7,
                        top: SIZE / 2 - 8,
                        fontSize: 14,
                        transform: `rotate(${headingDeg}deg)`,
                    }}
                >
                    ▲
                </div>
            </div>
        );
    }
    const imgW = (bounds.maxX - bounds.minX) * S;
    const imgH = (bounds.maxZ - bounds.minZ) * S;
    const left = SIZE / 2 - (px - bounds.minX) * S;
    const top = SIZE / 2 - (pz - bounds.minZ) * S;

    const markers: Array<{ x: number; z: number; icon: string }> = [];
    if (target) markers.push({ x: target.x, z: target.z, icon: "◆" });
    for (const f of STORY_FLAGS) {
        if (flags[`flag_${f.id}`]) markers.push({ x: f.x, z: f.z, icon: "🚩" });
    }
    markers.push({ x: MERCHANT_POS.x, z: MERCHANT_POS.z, icon: "💰" });
    for (const sp of FISHING_SPOTS) markers.push({ x: sp.x, z: sp.z, icon: "🎣" });
    // 미발견 탐험 요소 — 25m 이내 접근 시 '?'로 호기심 유도
    for (const poi of POIS) {
        if (flags[`poi_${poi.id}`]) continue;
        if (Math.hypot(poi.x - px, poi.z - pz) <= 25)
            markers.push({ x: poi.x, z: poi.z, icon: "❓" });
    }
    for (const tid of HIDDEN_TREASURE_IDS) {
        if (flags[`treasure_${tid}`]) continue;
        const t = FIELD_TREASURES.find((tt) => tt.id === tid);
        if (t && Math.hypot(t.pos.x - px, t.pos.z - pz) <= 25)
            markers.push({ x: t.pos.x, z: t.pos.z, icon: "❓" });
    }
    for (const q of SIDE_QUESTS) {
        if (!stageAtLeast(stage, q.availableFrom)) continue;
        if (flags[`quest_${q.id}_done`]) continue;
        markers.push({ x: q.npc.x, z: q.npc.z, icon: "❗" });
    }
    for (const ep of BOND_EPISODES) {
        if (!stageAtLeast(stage, ep.availableFrom)) continue;
        if (flags[`bond_${ep.id}`]) continue;
        markers.push({ x: ep.x, z: ep.z, icon: "💫" });
    }

    return (
        <div
            className="pointer-events-none absolute top-4 right-4 rounded-full overflow-hidden border-2 border-amber-400/60 bg-black/70 shadow-lg"
            style={{ width: SIZE, height: SIZE }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={mapUrl}
                alt=""
                className="absolute max-w-none opacity-90"
                style={{ width: imgW, height: imgH, left, top }}
            />
            {markers.map((m, i) => {
                const dx = (m.x - px) * S;
                const dz = (m.z - pz) * S;
                if (Math.hypot(dx, dz) > SIZE / 2 - 12) return null;
                return (
                    <div
                        key={i}
                        className="absolute text-[11px] leading-none"
                        style={{
                            left: SIZE / 2 + dx - 6,
                            top: SIZE / 2 + dz - 6,
                            color: m.icon === "◆" ? "#7dd3fc" : undefined,
                        }}
                    >
                        {m.icon}
                    </div>
                );
            })}
            {/* 플레이어 — 시선 방향 화살표 */}
            <div
                className="absolute text-sky-300 leading-none"
                style={{
                    left: SIZE / 2 - 7,
                    top: SIZE / 2 - 8,
                    fontSize: 14,
                    transform: `rotate(${headingDeg}deg)`,
                }}
            >
                ▲
            </div>
            <div className="absolute top-1 inset-x-0 text-center text-[9px] text-amber-300/80">
                N
            </div>
        </div>
    );
}
