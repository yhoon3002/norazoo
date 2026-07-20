// rpg/field/FieldSmith.tsx — 대장간 NPC (E: 강화로 오픈, smith_core 퀘스트 완료 전엔 안내 대사)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

const INTERACT_RANGE = 2.6;
const SMITH_POS = { x: 46.5, y: -33.25, z: -26.5 };

export function FieldSmith() {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 지면 스냅 — 상인과 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(SMITH_POS.x, SMITH_POS.z, SMITH_POS.y ?? p.y);
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

    // E키 상호작용 — 퀘스트 미완료면 안내 대사, 완료면 강화 패널
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.bountyOpen) return;

            if (!s.flags.quest_smith_core_done) {
                s.startDialogue([
                    {
                        speaker: "견습 대장장이",
                        text: "화로가 아직 차가워요… 마물 결정을 구해다 주시면 (❗ 의뢰) 강화로를 열 수 있어요.",
                    },
                ]);
                return;
            }

            document.exitPointerLock?.();
            s.toggleSmith();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group position={[SMITH_POS.x, SMITH_POS.y, SMITH_POS.z]} ref={groupRef}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/BlueSoldier_Female.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            {inRange && (
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
                        E: 강화 🔨
                    </div>
                </Html>
            )}
        </group>
    );
}
