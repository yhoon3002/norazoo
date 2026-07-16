// rpg/field/FieldGatherable.tsx — 채집물 (반짝이는 약초/수정, E로 획득 1회)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

const INTERACT_RANGE = 2.2;

const ITEM_LABEL: Record<string, string> = {
    herb: "약초",
    mana_crystal: "마나 수정",
    slime_gel: "슬라임 젤",
    golden_herb: "황금 약초",
};

const ITEM_COLOR: Record<string, string> = {
    herb: "#8fd67a",
    mana_crystal: "#7dd3fc",
    slime_gel: "#a3e635",
    golden_herb: "#fbbf24",
};

// 아이템별 지면 밀착 형태 — 부유 보석이 아니라 "심겨 있는 채집물"로 보이게.
// 길잡이 마커(공중 부유 다이아)와 시각적으로 확실히 구분한다.
function GatherableShape({ item, color }: { item: string; color: string }) {
    if (item === "mana_crystal") {
        // 반쯤 박힌 수정 클러스터
        return (
            <group>
                <mesh position={[0, 0.14, 0]} rotation={[0.12, 0.5, 0.18]}>
                    <octahedronGeometry args={[0.17]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.5}
                    />
                </mesh>
                <mesh position={[0.15, 0.08, -0.07]} rotation={[0.3, 1.2, -0.25]}>
                    <octahedronGeometry args={[0.1]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.5}
                    />
                </mesh>
            </group>
        );
    }
    if (item === "slime_gel") {
        // 바닥에 눌어붙은 젤 방울
        return (
            <mesh position={[0, 0.09, 0]} scale={[1, 0.55, 1]}>
                <sphereGeometry args={[0.17, 12, 10]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.45}
                    transparent
                    opacity={0.92}
                />
            </mesh>
        );
    }
    // 약초 — 잎줄기 3개를 벌려 심은 다발
    return (
        <group>
            {[
                { p: [0, 0.16, 0] as const, r: [0, 0, 0] as const },
                { p: [0.09, 0.13, 0.05] as const, r: [0.12, 0.8, 0.5] as const },
                { p: [-0.08, 0.13, -0.04] as const, r: [-0.1, 2.1, -0.45] as const },
            ].map((leaf, i) => (
                <mesh
                    key={i}
                    position={leaf.p as unknown as [number, number, number]}
                    rotation={leaf.r as unknown as [number, number, number]}
                >
                    <coneGeometry args={[0.05, 0.34, 5]} />
                    <meshStandardMaterial
                        color="#4e9a3d"
                        emissive={color}
                        emissiveIntensity={0.4}
                    />
                </mesh>
            ))}
        </group>
    );
}

export function FieldGatherable({
    id,
    x,
    y,
    z,
    item,
    qty,
}: {
    id: string;
    x: number;
    y: number;
    z: number;
    item: string;
    qty: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const [justPicked, setJustPicked] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const picked = useGame((s) => !!s.flags[`gather_${id}`]);
    const color = ITEM_COLOR[item] ?? "#8fd67a";

    useFrame((state) => {
        if (!groupRef.current) return;

        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            if (navFindWalkable) {
                const found = navFindWalkable(x, z, y);
                if (found)
                    groupRef.current.position.set(found.x, found.y, found.z);
                else groupRef.current.position.set(x, y, z);
                snapped.current = true;
            }
            return;
        }

        // 은은한 발광 펄스 — 채집물은 지면에 심겨 있고(부유·회전 없음),
        // 발광 세기만 숨쉬듯 변해 "채집 가능"을 알린다
        const t = state.clock.elapsedTime;
        const pulse = 0.35 + 0.25 * Math.sin(t * 2.2 + groupRef.current.position.x);
        groupRef.current.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.emissive) mat.emissiveIntensity = pulse;
        });

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
        if (!inRange || picked) return;
        const h = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            s.addItem(item, qty);
            useGame.setState((st: any) => ({
                flags: { ...st.flags, [`gather_${id}`]: true },
            }));
            setJustPicked(true);
            setTimeout(() => setJustPicked(false), 1400);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, picked, id, item, qty]);

    if (picked && !justPicked) return null;

    return (
        <group ref={groupRef} position={[x, y, z]}>
            {!picked && (
                <>
                    <GatherableShape item={item} color={color} />
                    <pointLight
                        position={[0, 0.4, 0]}
                        color={color}
                        intensity={0.6}
                        distance={2.5}
                    />
                </>
            )}

            {!picked && inRange && (
                <Html position={[0, 1.4, 0]} center distanceFactor={8}>
                    <div className="whitespace-nowrap rounded-lg border border-lime-300/60 bg-black/80 px-3 py-1 text-sm text-lime-100">
                        [E] 채집 — {ITEM_LABEL[item] ?? item}
                    </div>
                </Html>
            )}

            {justPicked && (
                <Html position={[0, 1.2, 0]} center distanceFactor={8}>
                    <div className="whitespace-nowrap rounded-lg bg-black/80 px-3 py-1 text-sm font-bold text-lime-300">
                        +{qty} {ITEM_LABEL[item] ?? item}
                    </div>
                </Html>
            )}
        </group>
    );
}
