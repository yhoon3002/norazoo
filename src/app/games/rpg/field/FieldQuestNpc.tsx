// rpg/field/FieldQuestNpc.tsx — 사이드 퀘스트 NPC (E: 수락/진행/완료, 머리 위 ❗/❓)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";
import type { SideQuest } from "../data/questData";

const INTERACT_RANGE = 2.6;

export function FieldQuestNpc({ quest }: { quest: SideQuest }) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const stage = useGame((s) => s.story.stage);
    const accepted = useGame((s) => !!s.flags[`quest_${quest.id}`]);
    const done = useGame((s) => !!s.flags[`quest_${quest.id}_done`]);
    const visible = stageAtLeast(stage, quest.availableFrom);

    useFrame((state) => {
        if (!visible || !groupRef.current) return;

        // 지면 스냅 — 상인과 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(
                quest.npc.x,
                quest.npc.z,
                quest.npc.y ?? p.y
            );
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
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

    // E키 상호작용 — 수락 → 진행 → 완료
    useEffect(() => {
        if (!inRange || !visible || done) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return;

            if (!s.flags[`quest_${quest.id}`]) {
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, [`quest_${quest.id}`]: true },
                }));
                s.startDialogue(quest.accept);
                return;
            }

            const killsOk = (quest.kills ?? []).every(
                (fid) => s.flags[`defeated_${fid}`]
            );
            const needsOk = (quest.needs ?? []).every(
                (n) =>
                    (s.bag.find((b: { id: string; qty: number }) => b.id === n.id)?.qty ?? 0) >= n.qty
            );
            if (!killsOk || !needsOk) {
                s.startDialogue(quest.progress);
                return;
            }

            // 납품 아이템 차감 → 보상 → 완료
            if (quest.needs?.length) {
                useGame.setState((st: any) => {
                    let bag = [...st.bag];
                    for (const n of quest.needs!) {
                        bag = bag
                            .map((b: { id: string; qty: number }) =>
                                b.id === n.id
                                    ? { ...b, qty: b.qty - n.qty }
                                    : b
                            )
                            .filter(
                                (b: { id: string; qty: number }) => b.qty > 0
                            );
                    }
                    return { bag };
                });
            }
            for (const r of quest.rewards) s.addItem(r.id, r.qty);
            s.gainGold(quest.rewardGold);
            useGame.setState((st: any) => ({
                flags: { ...st.flags, [`quest_${quest.id}_done`]: true },
            }));
            s.startDialogue(quest.complete);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible, done, quest]);

    if (!visible) return null;

    return (
        <group ref={groupRef} position={[quest.npc.x, quest.npc.y ?? 0, quest.npc.z]}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url={quest.npc.model}
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            {/* 퀘스트 상태 마커 — 완료 후엔 표시하지 않는다 (NPC는 남는다) */}
            {!done && (
                <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                    <div style={{ fontSize: 20 }}>{accepted ? "❓" : "❗"}</div>
                </Html>
            )}

            {inRange && !done && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#fde68a",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #fde68a",
                            fontSize: 14,
                        }}
                    >
                        E: 대화 — {quest.npc.label}
                    </div>
                </Html>
            )}
        </group>
    );
}
