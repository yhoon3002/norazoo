// rpg/field/FrozenVillager.tsx — 굳은 주민 조사 이벤트 (SP1 §①)
// 에필로그(시계탑 복구) 전: ModelAvatar paused+FROZEN_TINT 정지 인형 —
//   E로 사연 대사(2~3줄) + frozen_${id} 플래그 + killCounts.frozen_seen 증가 + 최초 1회 보상.
// 에필로그 후: 틴트 해제·idle 재생으로 각성 — E로 감사 대사 1줄(플래그·보상 없음, 반복 가능).
// tint 해제는 ModelAvatar가 지원하지 않으므로(SP0 설계) key 변경으로 리마운트해 처리한다.
// E 게이트: FieldSmith/DungeonDoor 관례(combat idle·dialogue 0·패널 닫힘·cutscene 게이트·
// INTERACT_RANGE 2.6·8프레임 스로틀 inRange·navFindWalkable 스냅) 그대로.
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";
import { FROZEN_TINT, type FrozenVillagerDef } from "../data/frozenData";

const INTERACT_RANGE = 2.6;

export function FrozenVillager({ def }: { def: FrozenVillagerDef }) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const stage = useGame((s) => s.story.stage);
    const inspected = useGame((s) => !!s.flags[`frozen_${def.id}`]);
    const isAwake = stageAtLeast(stage, "epilogue");

    useFrame((state) => {
        if (!groupRef.current) return;

        // 지면 스냅 — 상인과 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            if (!navFindWalkable) return;
            const found = navFindWalkable(def.pos.x, def.pos.z, def.pos.y);
            if (found) groupRef.current.position.set(found.x, found.y, found.z);
            else groupRef.current.position.set(def.pos.x, def.pos.y, def.pos.z);
            snapped.current = true;
            return;
        }

        // 근접 판정 (8프레임 스로틀)
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

    // E키 상호작용 — 굳은 상태: 사연 대사 + 1회 플래그/카운트/보상. 각성 상태: 감사 대사만.
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            if (s.cutscene) return;
            const ui = s.ui as any;
            if (
                ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen ||
                ui.bountyOpen || ui.tailorOpen || ui.fastTravelOpen ||
                ui.inventoryOpen || ui.pauseOpen
            )
                return;

            if (isAwake) {
                s.startDialogue(def.awake);
                return;
            }

            s.startDialogue(def.frozen);
            if (!inspected) {
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, [`frozen_${def.id}`]: true },
                    killCounts: {
                        ...st.killCounts,
                        frozen_seen: (st.killCounts.frozen_seen ?? 0) + 1,
                    },
                }));
                if (def.reward) {
                    if (def.reward.gold) s.gainGold(def.reward.gold);
                    if (def.reward.items)
                        for (const it of def.reward.items)
                            s.addItem(it.id, it.qty);
                    s.spawnPopup({
                        side: "ally",
                        text: `🎁 보상 획득!${
                            def.reward.gold ? ` +${def.reward.gold}G` : ""
                        }`,
                        color: "#fbbf24",
                    });
                }
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, isAwake, inspected, def]);

    return (
        <group
            position={[def.pos.x, def.pos.y, def.pos.z]}
            ref={groupRef}
        >
            <Suspense fallback={null}>
                <ModelAvatar
                    key={isAwake ? "awake" : "frozen"}
                    url={def.model}
                    state="idle"
                    scale={0.005}
                    rotation={[0, def.rotationY ?? Math.PI, 0]}
                    paused={!isAwake}
                    tint={isAwake ? undefined : FROZEN_TINT}
                />
            </Suspense>

            {inRange && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: isAwake ? "#fde68a" : "#7dd3fc",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: `1px solid ${isAwake ? "#fde68a" : "#7dd3fc"}`,
                            fontSize: 14,
                        }}
                    >
                        E: {isAwake ? "대화" : "조사"}
                    </div>
                </Html>
            )}
        </group>
    );
}
