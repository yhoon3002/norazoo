// rpg/field/FieldLorePoint.tsx — 조사 포인트: 멈춘 주민(석상)과 일지
// 시계탑이 멈춘 밤의 단서를 환경으로 전달한다. E로 조사(1회 플래그),
// awakeAtStage 이후에는 깨어난 주민으로 바뀌어 대화·보상을 준다.
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { stageAtLeast, type LorePoint } from "../data/storyData";

const INTERACT_RANGE = 2.6;

export function FieldLorePoint({ point }: { point: LorePoint }) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const stage = useGame((s) => s.story.stage);
    const inspected = useGame((s) => !!s.flags[`lore_${point.id}`]);
    const awakeDone = useGame((s) => !!s.flags[`lore_awake_${point.id}`]);

    const isAwake =
        !!point.awakeAtStage && stageAtLeast(stage, point.awakeAtStage);

    useFrame((state, dt) => {
        if (!groupRef.current) return;

        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((x: number, z: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            if (navFindWalkable) {
                const found = navFindWalkable(point.x, point.z, point.y);
                if (found)
                    groupRef.current.position.set(found.x, found.y, found.z);
                else groupRef.current.position.set(point.x, point.y, point.z);
                snapped.current = true;
            }
            return;
        }

        // 일지는 살짝 부유
        if (point.kind === "note") {
            const bob = groupRef.current.children.find(
                (c) => c.userData.__bob
            );
            if (bob) {
                bob.position.y =
                    1.0 + Math.sin(state.clock.elapsedTime * 1.8) * 0.1;
                bob.rotation.y += dt * 0.8;
            }
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
            if (e.repeat) return;
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;

            if (isAwake && !awakeDone && point.awakeLines) {
                // 깨어난 주민 — 대화 + 보상 (1회)
                s.startDialogue(point.awakeLines);
                for (const r of point.awakeReward ?? []) {
                    s.addItem(r.id, r.qty);
                }
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, [`lore_awake_${point.id}`]: true },
                }));
                return;
            }
            s.startDialogue(point.lines);
            if (!inspected) {
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, [`lore_${point.id}`]: true },
                }));
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, isAwake, awakeDone, inspected, point]);

    // 깨어난 주민의 미조사 강조 / 석상 프로스트 톤
    const statueColor = isAwake ? "#e5c89a" : "#9aa4ad";
    const emissive = isAwake ? "#f2b04a" : "#7dd3fc";
    const emissiveIntensity = isAwake && !awakeDone ? 0.35 : inspected ? 0.04 : 0.14;

    return (
        <group ref={groupRef} position={[point.x, point.y, point.z]}>
            {point.kind === "statue" ? (
                <>
                    {/* 굳은 주민 — 간이 인형 (다리/몸/머리) */}
                    <mesh position={[0, 0.35, 0]} castShadow>
                        <boxGeometry args={[0.42, 0.7, 0.3]} />
                        <meshStandardMaterial
                            color={statueColor}
                            emissive={emissive}
                            emissiveIntensity={emissiveIntensity}
                        />
                    </mesh>
                    <mesh position={[0, 0.95, 0]} castShadow>
                        <boxGeometry args={[0.5, 0.55, 0.34]} />
                        <meshStandardMaterial
                            color={statueColor}
                            emissive={emissive}
                            emissiveIntensity={emissiveIntensity}
                        />
                    </mesh>
                    <mesh position={[0, 1.45, 0]} castShadow>
                        <boxGeometry args={[0.36, 0.36, 0.32]} />
                        <meshStandardMaterial
                            color={statueColor}
                            emissive={emissive}
                            emissiveIntensity={emissiveIntensity + 0.05}
                        />
                    </mesh>
                </>
            ) : (
                <>
                    {/* 일지/쪽지 — 부유하는 금빛 책 */}
                    <mesh position={[0, 1.0, 0]} userData={{ __bob: true }} castShadow>
                        <boxGeometry args={[0.42, 0.08, 0.32]} />
                        <meshStandardMaterial
                            color="#d9b76a"
                            emissive="#f5c96b"
                            emissiveIntensity={inspected ? 0.15 : 0.6}
                        />
                    </mesh>
                    <pointLight
                        position={[0, 1.2, 0]}
                        color="#f5c96b"
                        intensity={inspected ? 0.4 : 1.4}
                        distance={4}
                    />
                </>
            )}

            {inRange && (
                <Html position={[0, 2.1, 0]} center distanceFactor={8}>
                    <div className="whitespace-nowrap rounded-lg border border-sky-300/60 bg-black/80 px-3 py-1 text-sm text-sky-100">
                        [E] {isAwake && !awakeDone ? "말 걸기" : "조사"} —{" "}
                        {isAwake ? point.label.replace("굳은 ", "깨어난 ") : point.label}
                    </div>
                </Html>
            )}
        </group>
    );
}
