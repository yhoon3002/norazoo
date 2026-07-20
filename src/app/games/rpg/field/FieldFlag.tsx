// rpg/field/FieldFlag.tsx — 원정 깃발 체크포인트 (E: 활성화 → 회복 + 저장 + 부활 지점)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { save } from "../utils/persist";

const INTERACT_RANGE = 2.6;

export function FieldFlag({
    id,
    x,
    z,
    y,
    label,
}: {
    id: string;
    x: number;
    z: number;
    /** 의도한 층의 지면 y — 없으면 플레이어 층 기준으로 스냅 */
    y?: number;
    label: string;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);
    const activated = useGame((s) => !!s.flags[`flag_${id}`]);

    useFrame((state) => {
        if (!groupRef.current) return;

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
                const found = navFindWalkable(x, z, y ?? playerPos.y);
                if (found)
                    groupRef.current.position.set(found.x, found.y, found.z);
                snapped.current = true;
            }
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

    // E키: 깃발 활성화 — 완전 회복 + 부활 지점 등록 + 자동 저장
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            // 이미 활성화된 깃발 — 다른 깃발로 이동하는 패스트 트래블
            if (s.flags[`flag_${id}`]) {
                document.exitPointerLock?.();
                (s as any).openFastTravel();
                return;
            }
            const pos = groupRef.current!.position;
            useGame.setState((st: any) => ({
                player: {
                    ...st.player,
                    party: st.player.party.map((c: any) => ({
                        ...c,
                        stats: { ...c.stats, hp: c.stats.maxHp },
                        ether: Math.max(c.ether ?? 0, 3),
                        statusEffects: [],
                    })),
                },
                flags: { ...st.flags, [`flag_${id}`]: true },
            }));
            s.setStory({
                respawn: { x: pos.x, y: pos.y, z: pos.z, label },
            });
            s.spawnPopup({
                side: "ally",
                text: `🚩 ${label} — 기록됨`,
                color: "#ffd700",
            });
            save(0, useGame.getState().snapshot());
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, id, label]);

    const color = activated ? "#ffd700" : "#9ca3af";

    return (
        <group ref={groupRef} position={[x, 0, z]}>
            {/* 깃대 */}
            <mesh position={[0, 1.1, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.07, 2.2, 8]} />
                <meshStandardMaterial color="#6b4a2b" />
            </mesh>
            {/* 깃발 천 */}
            <mesh position={[0.42, 1.85, 0]} castShadow>
                <boxGeometry args={[0.8, 0.5, 0.04]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={activated ? 0.5 : 0.05}
                />
            </mesh>
            {/* 바닥 링 */}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.7, 32]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={activated ? 0.8 : 0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {inRange && (
                <Html position={[0, 2.6, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#ffd700",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #ffd700",
                            fontSize: 14,
                        }}
                    >
                        {activated
                            ? "E: 이동 🚩 (패스트 트래블)"
                            : "E: 깃발 🚩 (회복·저장)"}
                    </div>
                </Html>
            )}
        </group>
    );
}
