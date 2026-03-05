// rpg/field/FieldEnemyAvatar.tsx
"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ModelAvatar } from "../actors/ModelAvatar";
import { ENEMY_MODEL_BY_TEMPLATE } from "../data/gameData";
import { useGame } from "../presenter/useGameStore";

interface FieldEnemyAvatarProps {
    id: string;
    template: string;
    pos: THREE.Vector3;
}

const WANDER_RADIUS = 4;   // 스폰 지점에서 최대 이탈 거리
const WANDER_SPEED = 1.2;  // 이동 속도 (units/s)

function EnemyMarker({ template }: { template: string }) {
    const color =
        template === "slime"
            ? "#4CAF50"
            : template === "orc"
            ? "#CD853F"
            : "#9B59B6";
    return (
        <mesh position={[0, 1, 0]}>
            <coneGeometry args={[0.45, 1.8, 8]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
            />
        </mesh>
    );
}

export default function FieldEnemyAvatar({
    id,
    template,
    pos,
}: FieldEnemyAvatarProps) {
    const defeated = useGame((s) => !!s.flags[`defeated_${id}`]);
    const groupRef = useRef<THREE.Group>(null);

    // 스폰 지점 (변하지 않음)
    const homeX = useRef(pos.x);
    const homeZ = useRef(pos.z);

    // 현재 목적지
    const targetX = useRef(pos.x);
    const targetZ = useRef(pos.z);

    // 대기 상태
    const waitTimer = useRef(Math.random() * 2 + 0.5); // 인스턴스별 초기 대기
    const isWaiting = useRef(true);

    // 애니메이션 상태 (re-render 최소화를 위해 ref로 중복 호출 방지)
    const animRef = useRef<"idle" | "walk">("idle");
    const [animState, setAnimState] = useState<"idle" | "walk">("idle");

    useFrame((_, dt) => {
        if (!groupRef.current) return;

        // 플레이어 y에 동기화
        groupRef.current.position.y = useGame.getState().player.pos.y;

        if (isWaiting.current) {
            // 대기 중 → 카운트다운
            waitTimer.current -= dt;
            if (waitTimer.current <= 0) {
                // 스폰 중심에서 랜덤 방향·거리로 새 목적지 설정
                const angle = Math.random() * Math.PI * 2;
                const r = 0.5 + Math.random() * WANDER_RADIUS;
                targetX.current = homeX.current + Math.cos(angle) * r;
                targetZ.current = homeZ.current + Math.sin(angle) * r;
                isWaiting.current = false;
                if (animRef.current !== "walk") {
                    animRef.current = "walk";
                    setAnimState("walk");
                }
            }
        } else {
            // 목적지로 이동
            const dx = targetX.current - groupRef.current.position.x;
            const dz = targetZ.current - groupRef.current.position.z;
            const dist = Math.hypot(dx, dz);

            if (dist < 0.15) {
                // 도착 → 잠시 대기
                isWaiting.current = true;
                waitTimer.current = 1.5 + Math.random() * 2.5;
                if (animRef.current !== "idle") {
                    animRef.current = "idle";
                    setAnimState("idle");
                }
            } else {
                const step = Math.min(WANDER_SPEED * dt, dist);
                groupRef.current.position.x += (dx / dist) * step;
                groupRef.current.position.z += (dz / dist) * step;
                // 이동 방향으로 회전 (모델 기본 방향이 -Z이므로 +π 보정)
                groupRef.current.rotation.y = Math.atan2(dx, dz) + Math.PI;
            }
        }
    });

    const modelUrl = ENEMY_MODEL_BY_TEMPLATE[template];
    if (!modelUrl || defeated) return null;

    return (
        <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
            <Suspense fallback={<EnemyMarker template={template} />}>
                <ModelAvatar
                    url={modelUrl}
                    scale={0.01}
                    state={animState}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>
        </group>
    );
}
