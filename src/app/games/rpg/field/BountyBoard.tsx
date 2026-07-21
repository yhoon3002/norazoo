// rpg/field/BountyBoard.tsx — 사냥 의뢰판 (E: 반복 토벌 의뢰 목록 오픈)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

const INTERACT_RANGE = 2.6;
/** 전체지도(FullMapPanel) 마커도 이 좌표를 재사용 */
// 상인(12.8,-14)과 상호작용 반경이 겹치지 않게 8m+ 이격
export const BOARD_POS = { x: 20.5, y: -33.25, z: -10 };

export function BountyBoard() {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 지면 스냅 — 깃발/상인과 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((
                      px: number,
                      pz: number,
                      preferY?: number
                  ) => { x: number; y: number; z: number } | null)
                | undefined;
            const playerPos = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (navFindWalkable && playerPos) {
                const found = navFindWalkable(
                    BOARD_POS.x,
                    BOARD_POS.z,
                    BOARD_POS.y ?? playerPos.y
                );
                if (found)
                    groupRef.current.position.set(found.x, found.y, found.z);
                snapped.current = true;
            }
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

    // E키: 의뢰판 오픈
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.tailorOpen) return;

            document.exitPointerLock?.();
            (s as any).toggleBounty();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group ref={groupRef} position={[BOARD_POS.x, BOARD_POS.y, BOARD_POS.z]}>
            {/* 기둥 */}
            <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.16, 1.2, 0.16]} />
                <meshStandardMaterial color="#6b4a2b" />
            </mesh>
            {/* 게시판 */}
            <mesh position={[0, 1.35, 0]} castShadow>
                <boxGeometry args={[1.1, 0.8, 0.1]} />
                <meshStandardMaterial color="#8a6438" />
            </mesh>

            {inRange && (
                <Html position={[0, 2.1, 0]} center distanceFactor={8}>
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
                        E: 의뢰판 📋
                    </div>
                </Html>
            )}
        </group>
    );
}
