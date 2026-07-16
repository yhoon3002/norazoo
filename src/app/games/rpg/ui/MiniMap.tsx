// rpg/ui/MiniMap.tsx — 우상단 원형 미니맵 (북쪽 고정, 플레이어 중심)
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { useMapStore } from "../presenter/mapStore";
import { STORY_FLAGS } from "../data/storyData";
import { POIS, HIDDEN_TREASURE_IDS } from "../data/poiData";
import { MERCHANT_POS, FIELD_TREASURES } from "../data/gameData";

const SIZE = 160; // px
const METERS_ACROSS = 64; // 미니맵 지름이 커버하는 월드 거리(m)
const S = SIZE / METERS_ACROSS; // px per meter

type View = { px: number; pz: number; headingDeg: number };

export function MiniMap() {
    const mapUrl = useMapStore((s) => s.mapUrl);
    const bounds = useMapStore((s) => s.bounds);
    const target = useGame((s) => s.story.target);
    const flags = useGame((s) => s.flags);
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
            setView({ px: p.x, pz: p.z, headingDeg });
        }, 120);
        return () => clearInterval(id);
    }, []);

    if (!mapUrl || !bounds || !view) return null;
    const { px, pz, headingDeg } = view;
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
