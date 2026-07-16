// rpg/field/SpeakerHighlight.tsx — 대사 중 말하는 캐릭터 머리 위 고유색 마커
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { PARTY_META } from "../data/gameData";

const HEAD_Y = 2.3; // 캐릭터 머리 위 오프셋

export function SpeakerHighlight() {
    const { scene } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const coneRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        const g = groupRef.current;
        if (!g) return;
        const s = useGame.getState();
        const line = s.dialogue[0];
        if (!line || s.combat.phase !== "idle") {
            g.visible = false;
            return;
        }

        // 화자 → 필드 위치 해석: 리더 / 동료 / 요리사(상인). 그 외(일지 등)는 마커 없음
        let pos: { x: number; y: number; z: number } | undefined;
        let color = "#fbbf24";
        if (line.speakerId) {
            const leader = s.player.party[s.player.activeCharacter];
            if (leader?.id === line.speakerId) {
                pos = scene.userData.__playerWorldPos as THREE.Vector3;
            } else {
                pos = (
                    scene.userData.__companionPositions as
                        | Record<string, { x: number; y: number; z: number }>
                        | undefined
                )?.[line.speakerId];
            }
            color = PARTY_META[line.speakerId].color;
        } else if (line.speaker === "요리사") {
            pos = scene.userData.__merchantPos as THREE.Vector3;
        }

        if (!pos) {
            g.visible = false;
            return;
        }
        g.visible = true;
        const bob = 0.15 * Math.sin(performance.now() / 250);
        g.position.set(pos.x, pos.y + HEAD_Y + bob, pos.z);
        if (coneRef.current) {
            (coneRef.current.material as THREE.MeshBasicMaterial).color.set(
                color
            );
        }
    });

    return (
        <group ref={groupRef} visible={false}>
            {/* 아래를 향한 ▼ 마커 */}
            <mesh ref={coneRef} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.22, 0.4, 4]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
        </group>
    );
}
