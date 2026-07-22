// rpg/field/ArenaMaster.tsx — 투기장 관장 NPC (E: 웨이브 전투 도전, 필드 복귀 시 자동 승리 판정·보상)
// FieldTailor/FieldSmith 골격 재사용. 대화 없이 팝업 + 즉시 startCombat(전투 진입이 대화를 덮으므로).
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";
import { arenaWaveOf, arenaReward } from "../data/arenaData";

const INTERACT_RANGE = 2.6;
const ARENA_POS = { x: 20.5, y: -33.25, z: -4.5 };

export function ArenaMaster() {
    const stage = useGame((s) => s.story.stage);
    const visible = stageAtLeast(stage, "ch2_cleanup");

    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!visible || !groupRef.current) return;

        // 지면 스냅 — 다른 NPC와 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(ARENA_POS.x, ARENA_POS.z, ARENA_POS.y ?? p.y);
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
            snapped.current = true;
            return;
        }

        frame.current++;

        // 근접 판정 (8프레임 스로틀)
        if (frame.current % 8 === 0) {
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (p) {
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
            }
        }

        // 웨이브 승리 감지 → 보상 지급 (60프레임 스로틀, idle일 때만 — 필드 복귀 후 의미)
        if (frame.current % 60 === 0) {
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;

            const n = s.killCounts.arena_wave ?? 0;
            const wave = arenaWaveOf(n);
            const allDefeated = wave.every(
                (_, i) => s.flags[`defeated_arena${n}_${i}`]
            );
            if (!allDefeated) return;

            const reward = arenaReward(n);
            s.gainGold(reward.gold);
            if (reward.item) s.addItem(reward.item, 1);
            // 지급/랭크업/플래그삭제를 단일 setState로 묶어 다음 60프레임 재검증 시
            // n이 이미 n+1로 넘어가 있도록(이중 지급 방지)
            useGame.setState((st: any) => {
                const flags = { ...st.flags };
                wave.forEach((_, i) => delete flags[`defeated_arena${n}_${i}`]);
                return {
                    flags,
                    killCounts: { ...st.killCounts, arena_wave: n + 1 },
                };
            });
            s.spawnPopup({
                side: "ally",
                text: `🏟️ 웨이브 ${n + 1} 클리어! +${reward.gold}G`,
                color: "#fde68a",
            });
        }
    });

    // E키 상호작용 — 웨이브 도전 (대화 생략, 팝업 + 즉시 전투)
    useEffect(() => {
        if (!visible || !inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return;

            const n = s.killCounts.arena_wave ?? 0;
            const wave = arenaWaveOf(n);
            // 승리 직후 감지 틱(~1초) 전에 재도전하는 엣지: 이전 승리의 defeated_arena 플래그가
            // 남아 있으면 패배해도 보상이 지급된다 — 시작 시점에 해당 웨이브 잔존 플래그를 정리
            useGame.setState((st: any) => {
                const flags = { ...st.flags };
                wave.forEach((_, i) => delete flags[`defeated_arena${n}_${i}`]);
                return { flags };
            });
            s.spawnPopup({
                side: "ally",
                text: `🏟️ 웨이브 ${n + 1} 시작!`,
                color: "#fca5a5",
            });
            s.startCombat({
                group: wave.map((t, i) => ({ template: t, fieldId: `arena${n}_${i}` })),
            });
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible]);

    if (!visible) return null;

    return (
        <group position={[ARENA_POS.x, ARENA_POS.y, ARENA_POS.z]} ref={groupRef}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/Ninja_Female.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 20 }}>🏟️</div>
            </Html>

            {inRange && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#fca5a5",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #fca5a5",
                            fontSize: 14,
                        }}
                    >
                        E: 투기장 관장 🏟️
                    </div>
                </Html>
            )}
        </group>
    );
}
