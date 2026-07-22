// rpg/field/BondEpisode.tsx — 파티 유대 에피소드 회상 포인트
// FieldLorePoint 템플릿 재사용(근접 E, e.repeat 가드). 모델 배치 없이 💫 Html 마커로
// 회상 지점을 표시한다. E → 대사 + 보상(gainGold + addItem) + flags[`bond_${id}`] 1회성.
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { stageAtLeast } from "../data/storyData";
import type { BondEpisode as BondEpisodeData } from "../data/bondData";

const INTERACT_RANGE = 2.6;

export function BondEpisode({ ep }: { ep: BondEpisodeData }) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const stage = useGame((s) => s.story.stage);
    const done = useGame((s) => !!s.flags[`bond_${ep.id}`]);
    const visible = stageAtLeast(stage, ep.availableFrom) && !done;

    useFrame((state) => {
        if (!visible || !groupRef.current) return;

        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((x: number, z: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            if (navFindWalkable) {
                const found = navFindWalkable(ep.x, ep.z, ep.y);
                if (found) groupRef.current.position.set(found.x, found.y, found.z);
                else groupRef.current.position.set(ep.x, ep.y, ep.z);
                snapped.current = true;
            }
            return;
        }

        frame.current++;
        if (frame.current % 8 !== 0) return;
        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!p) return;
        const near =
            Math.hypot(
                p.x - groupRef.current.position.x,
                p.z - groupRef.current.position.z
            ) <= INTERACT_RANGE &&
            Math.abs(p.y - groupRef.current.position.y) <= 2;
        if (near !== inRangeRef.current) {
            inRangeRef.current = near;
            setInRange(near);
        }
    });

    useEffect(() => {
        if (!visible || !inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return;
            if (s.flags[`bond_${ep.id}`]) return;

            s.startDialogue(ep.lines);
            s.gainGold(ep.reward.gold);
            for (const it of ep.reward.items ?? []) s.addItem(it.id, it.qty);
            useGame.setState((st: any) => ({
                flags: { ...st.flags, [`bond_${ep.id}`]: true },
            }));
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible, ep]);

    if (!visible) return null;

    return (
        <group ref={groupRef} position={[ep.x, ep.y, ep.z]}>
            <Html position={[0, 1.7, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 22 }}>💫</div>
            </Html>

            {inRange && (
                <Html position={[0, 2.3, 0]} center distanceFactor={8}>
                    <div className="whitespace-nowrap rounded-lg border border-amber-300/60 bg-black/80 px-3 py-1 text-sm text-amber-100">
                        [E] {ep.label}
                    </div>
                </Html>
            )}
        </group>
    );
}
