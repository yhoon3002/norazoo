// rpg/field/ObjectiveBeacon.tsx — 현재 목표 지점에 세워지는 빛기둥
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

export function ObjectiveBeacon() {
    const groupRef = useRef<THREE.Group>(null);
    const pillarRef = useRef<THREE.Mesh>(null);
    const snappedFor = useRef<string | null>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const g = useGame.getState();
        const target = g.story.target;

        if (!target || g.combat.phase !== "idle") {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;

        // 목표가 바뀔 때만 지면 스냅
        const key = `${target.x},${target.z}`;
        if (snappedFor.current !== key) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((
                      px: number,
                      pz: number,
                      preferY?: number
                  ) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(target.x, target.z, p.y);
            groupRef.current.position.set(
                found?.x ?? target.x,
                found?.y ?? p.y,
                found?.z ?? target.z
            );
            snappedFor.current = key;
        }

        // 은은한 펄스
        if (pillarRef.current) {
            const t = performance.now() / 1000;
            const mat = pillarRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.16 + 0.08 * Math.sin(t * 2.4);
            pillarRef.current.rotation.y = t * 0.4;
        }
    });

    return (
        <group ref={groupRef} visible={false}>
            {/* 빛기둥 */}
            <mesh ref={pillarRef} position={[0, 15, 0]}>
                <cylinderGeometry args={[0.5, 0.9, 30, 12, 1, true]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.2}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            {/* 바닥 링 */}
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.9, 1.15, 32]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <pointLight
                position={[0, 2.5, 0]}
                color="#7dd3fc"
                intensity={2}
                distance={9}
                decay={2}
            />
        </group>
    );
}
