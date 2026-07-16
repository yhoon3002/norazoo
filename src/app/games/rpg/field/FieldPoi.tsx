// rpg/field/FieldPoi.tsx — 전망 포인트 (반경 접근 시 자동 발견 — 배너 + 골드/경험치)
"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import type { Poi } from "../data/poiData";

const DISCOVER_RANGE = 3.2;

export function FieldPoi({ poi }: { poi: Poi }) {
    const groupRef = useRef<THREE.Group>(null);
    const snapped = useRef(false);
    const frame = useRef(0);
    const [banner, setBanner] = useState(false);
    const discovered = useGame((s) => !!s.flags[`poi_${poi.id}`]);

    useFrame((state) => {
        const g = groupRef.current;
        if (!g) return;

        // 지면 스냅 (깃발과 동일 패턴)
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(poi.x, poi.z, poi.y ?? p.y);
            if (found) g.position.set(found.x, found.y, found.z);
            else g.position.set(poi.x, poi.y ?? p.y, poi.z);
            snapped.current = true;
            return;
        }

        // 발견 판정 (8프레임 스로틀)
        frame.current++;
        if (frame.current % 8 !== 0 || discovered) return;
        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!p) return;
        if (
            Math.hypot(p.x - g.position.x, p.z - g.position.z) >
                DISCOVER_RANGE ||
            Math.abs(p.y - g.position.y) > 3
        )
            return;

        const s = useGame.getState();
        useGame.setState((st: any) => ({
            flags: { ...st.flags, [`poi_${poi.id}`]: true },
        }));
        s.gainGold(poi.rewardGold);
        for (const c of s.player.party) s.gainExp(c.id, poi.rewardExp);
        (s as any).spawnPopup({
            side: "ally",
            text: `🏞️ ${poi.label} 발견! +${poi.rewardGold}G`,
            color: "#7dd3fc",
        });
        setBanner(true);
        setTimeout(() => setBanner(false), 2600);
    });

    return (
        <group ref={groupRef}>
            {/* 미발견 안내 — 은은한 빛기둥(목표 비콘보다 얇고 옅게) */}
            {!discovered && (
                <mesh position={[0, 1.4, 0]}>
                    <cylinderGeometry args={[0.12, 0.3, 2.8, 8, 1, true]} />
                    <meshBasicMaterial
                        color="#fef3c7"
                        transparent
                        opacity={0.18}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}
            {banner && (
                <Html position={[0, 2.6, 0]} center distanceFactor={10}>
                    <div className="whitespace-nowrap rounded-xl border border-sky-300/60 bg-black/80 px-4 py-2 text-center">
                        <div className="font-bold text-sky-300">
                            🏞️ {poi.label}
                        </div>
                        <div className="text-xs text-gray-300">{poi.desc}</div>
                    </div>
                </Html>
            )}
        </group>
    );
}
