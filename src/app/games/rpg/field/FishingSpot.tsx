// rpg/field/FishingSpot.tsx — 부두 낚시터 (E: 낚시 미니게임)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

const SPOT = { x: 222.5, y: -38.25, z: -18.9 }; // 부두 끝 근처
const INTERACT_RANGE = 2.6;

export function FishingSpot() {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(SPOT.x, SPOT.z, SPOT.y);
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
            snapped.current = true;
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
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen) return;
            document.exitPointerLock?.();
            (s as any).toggleFishing();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group ref={groupRef} position={[SPOT.x, SPOT.y, SPOT.z]}>
            {/* 꽂아 둔 낚싯대 */}
            <mesh position={[0.2, 0.7, 0]} rotation={[0, 0, -0.7]} castShadow>
                <cylinderGeometry args={[0.02, 0.03, 1.6, 6]} />
                <meshStandardMaterial color="#7c5a3a" />
            </mesh>
            {/* 표시 링 */}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.62, 24]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {inRange && (
                <Html position={[0, 1.8, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#7dd3fc",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #7dd3fc",
                            fontSize: 14,
                        }}
                    >
                        E: 낚시 🎣
                    </div>
                </Html>
            )}
        </group>
    );
}
