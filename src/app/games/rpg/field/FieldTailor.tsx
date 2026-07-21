// rpg/field/FieldTailor.tsx — 아낙 재봉소 NPC (에필로그 해금, E: 첫 인사 후 재봉 패널 오픈)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";

const INTERACT_RANGE = 2.6;
const TAILOR_POS = { x: 92.5, y: -33.25, z: -23.5 };

export function FieldTailor() {
    const stage = useGame((s) => s.story.stage);
    const visible = stageAtLeast(stage, "epilogue");

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
            const found = navFindWalkable(TAILOR_POS.x, TAILOR_POS.z, TAILOR_POS.y ?? p.y);
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

    // E키 상호작용 — 첫 대화(각성 인사) 후 재봉 패널
    useEffect(() => {
        if (!visible || !inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.bountyOpen || ui.smithOpen) return;

            if (!s.flags.quest_tailor_met) {
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, quest_tailor_met: true },
                }));
                s.startDialogue([
                    {
                        speaker: "아낙",
                        text: "빨래도 다 마르고, 손도 근질근질하네요! 마을이 다시 활기를 찾도록 옷을 지어드리죠.",
                    },
                    {
                        speaker: "아낙",
                        text: "재료만 가져다주면 얼마든지 지어드릴게요. 한번 보실래요?",
                    },
                ]);
                return;
            }

            document.exitPointerLock?.();
            s.toggleTailor();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible]);

    if (!visible) return null;

    return (
        <group position={[TAILOR_POS.x, TAILOR_POS.y, TAILOR_POS.z]} ref={groupRef}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/Viking_Female.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 20 }}>🧵</div>
            </Html>

            {inRange && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#f9a8d4",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #f9a8d4",
                            fontSize: 14,
                        }}
                    >
                        E: 재봉사 아낙 🧵
                    </div>
                </Html>
            )}
        </group>
    );
}
