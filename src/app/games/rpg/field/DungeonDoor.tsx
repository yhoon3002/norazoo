// rpg/field/DungeonDoor.tsx — SP0 Task 7: 스위치-문 프리미티브
// (1) DoorBarrier: flags[flag] 구독. 닫힘이면 box 메시를 렌더하고 마운트 시
//     scene.userData.__environmentMeshes에 push(+BVH) — FieldPlayer의 벽
//     레이캐스트(castBlockedOptimized)가 이 배열을 읽어 충돌 판정하므로 실제
//     통행 차단 효과가 생긴다. 개방(flag=true)되거나 언마운트되면 배열에서
//     splice로 제거하고 geometry를 dispose한다.
// (2) DoorSwitch: 기존 게이트/체크포인트(DungeonController/FieldFlag) E키
//     패턴 그대로(combat idle·dialogue 0·cutscene 없음·주요 패널 닫힘, 8프레임
//     스로틀 근접판정) — 사거리 내 E → flags[flag]=true + spawnPopup.
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ensureBoundsTree } from "../environment/bvhRaycast";
import type { DungeonDoorDef } from "../data/dungeonData";

const INTERACT_RANGE = 2.6;

/** 닫힘 상태에서만 마운트되는 실제 충돌 메시. 열림 전환/언마운트 시 정리(splice+dispose). */
function DoorBarrier({ def }: { def: DungeonDoorDef }) {
    const { scene } = useThree();
    const meshRef = useRef<THREE.Mesh | null>(null);
    // StrictMode 이중 마운트에서도 cleanup이 정확히 한 번만 push한 항목을
    // 정확히 한 번만 splice하도록 대칭을 보장하는 가드
    const pushedRef = useRef(false);
    const open = useGame((s) => !!s.flags[def.flag]);

    useEffect(() => {
        if (open) return undefined;
        const mesh = meshRef.current;
        if (!mesh) return undefined;

        ensureBoundsTree(mesh);
        const arr =
            (scene.userData.__environmentMeshes as THREE.Object3D[] | undefined) ??
            (scene.userData.__environmentMeshes = []);
        if (!pushedRef.current) {
            arr.push(mesh);
            pushedRef.current = true;
        }

        return () => {
            if (!pushedRef.current) return;
            const idx = arr.indexOf(mesh);
            if (idx !== -1) arr.splice(idx, 1);
            pushedRef.current = false;
            // 개방/언마운트 시점 — 지오메트리까지 정리(브리프 요구사항)
            mesh.geometry.dispose();
        };
    }, [scene, open]);

    if (open) return null;

    const [w, h, d] = def.door.size;
    return (
        <mesh
            ref={meshRef}
            name={`dungeon_door_${def.id}`}
            position={[def.door.pos.x, def.door.pos.y + h / 2, def.door.pos.z]}
            userData={{ __type: "environment", __dungeonDoor: def.id }}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#4a3220" metalness={0.55} roughness={0.55} />
        </mesh>
    );
}

/** 스위치 — 기존 게이트 E 핸들러 조건(DungeonController 참조) 재사용. */
function DoorSwitch({ def }: { def: DungeonDoorDef }) {
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const frame = useRef(0);
    const open = useGame((s) => !!s.flags[def.flag]);
    const { pos, label } = def.switch;

    useFrame((state) => {
        frame.current++;
        if (frame.current % 8 !== 0) return;
        const p = state.scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        if (!p) return;
        const near =
            Math.hypot(p.x - pos.x, p.z - pos.z) <= INTERACT_RANGE &&
            Math.abs(p.y - pos.y) <= 2.4;
        if (near !== inRangeRef.current) {
            inRangeRef.current = near;
            setInRange(near);
        }
    });

    useEffect(() => {
        if (!inRange || open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            if (s.cutscene) return;
            if (s.flags[def.flag]) return;
            const ui = s.ui as any;
            if (
                ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen ||
                ui.bountyOpen || ui.tailorOpen || ui.fastTravelOpen ||
                ui.inventoryOpen || ui.pauseOpen
            )
                return;

            useGame.setState((st) => ({ flags: { ...st.flags, [def.flag]: true } }));
            s.spawnPopup({ side: "ally", text: `🔓 ${label}`, color: "#facc15" });
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, open, def.flag, label]);

    const color = open ? "#4ade80" : "#f87171";

    return (
        <group position={[pos.x, pos.y, pos.z]}>
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 1, 12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
            </mesh>
            <pointLight color={color} intensity={0.5} distance={3} decay={2} position={[0, 1, 0]} />

            {inRange && !open && (
                <Html position={[0, 1.4, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#facc15",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #facc15",
                            fontSize: 14,
                        }}
                    >
                        E: {label} 개방
                    </div>
                </Html>
            )}
        </group>
    );
}

export function DungeonDoor({ def }: { def: DungeonDoorDef }) {
    return (
        <>
            <DoorBarrier def={def} />
            <DoorSwitch def={def} />
        </>
    );
}
