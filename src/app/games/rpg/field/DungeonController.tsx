// rpg/field/DungeonController.tsx — SP0 Task 6: 던전 프레임워크
// (1) 8프레임 스로틀 리전 감시: __playerWorldPos로 dungeonAt 판정 → __dungeonActive·
//     __lightOverride·scene.fog 설정/원복 (전이 시점에만 — 존 현상 등 후속 태스크의
//     fog 소유권과 충돌 방지).
// (2) 게이트 E 상호작용: 각 게이트의 지상/지하 양단 2.6m 내 E → requestTeleport(반대편).
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { DUNGEONS, dungeonAt } from "../data/dungeonData";

const INTERACT_RANGE = 2.6;

/** 리전 감시 — 렌더 없음. 8프레임마다 플레이어 위치로 던전 진입/이탈 판정. */
function DungeonRegionTracker() {
    const { scene } = useThree();
    const frame = useRef(0);
    const activeId = useRef<string | null>(null);

    useFrame((state) => {
        frame.current++;
        if (frame.current % 8 !== 0) return;
        const p = state.scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        if (!p) return;

        const d = dungeonAt(p.x, p.y, p.z);
        const nextId = d ? d.id : null;
        if (nextId === activeId.current) return; // 전이 없음 — fog/오버라이드 건드리지 않음
        activeId.current = nextId;

        if (d) {
            state.scene.userData.__dungeonActive = d.id;
            state.scene.userData.__lightOverride = { ambient: d.light.ambient, lamp: d.light.lamp };
            state.scene.fog = new THREE.Fog(d.light.fogColor, d.light.fogNear, d.light.fogFar);
        } else {
            delete state.scene.userData.__dungeonActive;
            delete state.scene.userData.__lightOverride;
            state.scene.fog = null;
        }
    });

    // 언마운트 시 원복 — FieldScene은 전투마다 언마운트/리마운트되므로(RpgGame 분기)
    // 전투 진입 시 여기서 정리되고, 복귀 후 첫 판정 틱에서 재수립된다(실측 검증됨)
    useEffect(() => {
        return () => {
            if (!activeId.current) return;
            delete scene.userData.__dungeonActive;
            delete scene.userData.__lightOverride;
            scene.fog = null;
        };
    }, [scene]);

    return null;
}

function DungeonGateNode({
    pos,
    destination,
    promptLabel,
    popupText,
    color,
}: {
    pos: { x: number; y: number; z: number };
    destination: { x: number; y: number; z: number };
    promptLabel: string;
    popupText: string;
    color: string;
}) {
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const frame = useRef(0);

    // 좌표는 이미 헤드리스 프로브로 실측된 walkable 지점(드리프트 ≤0.01m) — 별도 스냅 불필요
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

    // E키 상호작용 — 기존 FieldSmith/Boatman 키 핸들러 패턴(combat idle·dialogue 0·
    // 컷신 중 무시·주요 패널 닫힘) 그대로 재사용
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            if (s.cutscene) return;
            const ui = s.ui as any;
            if (
                ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen ||
                ui.bountyOpen || ui.tailorOpen || ui.fastTravelOpen ||
                ui.inventoryOpen || ui.pauseOpen
            )
                return;

            s.requestTeleport(destination);
            s.spawnPopup({ side: "ally", text: popupText, color });
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, destination, popupText, color]);

    return (
        <group position={[pos.x, pos.y, pos.z]}>
            {/* 게이트 표시 — 바닥 링 + 은은한 포인트 라이트 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.6, 0.88, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} />
            </mesh>
            <pointLight color={color} intensity={0.6} distance={4} decay={2} position={[0, 1, 0]} />

            {inRange && (
                <Html position={[0, 1.6, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color,
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: `1px solid ${color}`,
                            fontSize: 14,
                        }}
                    >
                        E: {promptLabel}
                    </div>
                </Html>
            )}
        </group>
    );
}

export function DungeonController() {
    return (
        <>
            <DungeonRegionTracker />
            {DUNGEONS.flatMap((d) =>
                d.gates.flatMap((g, i) => [
                    <DungeonGateNode
                        key={`${d.id}_gate${i}_down`}
                        pos={g.overworld}
                        destination={g.underground}
                        promptLabel={`${d.label} 진입`}
                        popupText={`🌊 ${d.label}로 내려간다`}
                        color="#22d3ee"
                    />,
                    <DungeonGateNode
                        key={`${d.id}_gate${i}_up`}
                        pos={g.underground}
                        destination={g.overworld}
                        promptLabel="지상 복귀"
                        popupText="🌤️ 지상으로 돌아왔다"
                        color="#facc15"
                    />,
                ])
            )}
        </>
    );
}
