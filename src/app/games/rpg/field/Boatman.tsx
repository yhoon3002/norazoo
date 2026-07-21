// rpg/field/Boatman.tsx — 사공 NPC (항구 ↔ 협곡 상륙지 왕복, E: 승선)
// 퀘스트 상태 없음 — 단순 대화 + requestTeleport. FieldQuestNpc/FieldSmith 골격 재사용.
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";
import { GORGE_LANDING } from "../data/placementData";

const INTERACT_RANGE = 2.6;

// 부두 정박지 — 협곡 상륙지의 왕복 목적지
const PIER_POS = { x: 224.9, y: -38.25, z: -16.1 };

// (225.5,-11.5)는 walkable 표면이 부두 지면보다 2.6m 높아(선착장 구조물) NPC가 공중 스냅됨
// → 부두 끝 지면 셀로 배치 (헤드리스 nav 프로브로 지면 y≈-38.35 확인)
const PORT_POS = { x: 224.5, y: -38.25, z: -15.5 };
const GORGE_POS = { x: 137, y: -42.25, z: 15 };

function BoatmanNode({
    pos,
    line,
    destination,
}: {
    pos: { x: number; y: number; z: number };
    line: string;
    destination: { x: number; y: number; z: number };
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 지면 스냅 — 다른 NPC와 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(pos.x, pos.z, pos.y ?? p.y);
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
            snapped.current = true;
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

    // E키 상호작용 — 짧은 대사 후 왕복 텔레포트 (10m+ 점프라 자동 지면 재스냅)
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.fastTravelOpen || ui.inventoryOpen || ui.pauseOpen) return;

            s.startDialogue([{ speaker: "사공", text: line }]);
            s.requestTeleport(destination);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, line, destination]);

    return (
        <group position={[pos.x, pos.y, pos.z]} ref={groupRef}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/Elf.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 20 }}>⛵</div>
            </Html>

            {inRange && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
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
                        E: 대화 — 사공
                    </div>
                </Html>
            )}
        </group>
    );
}

export function Boatman() {
    const stage = useGame((s) => s.story.stage);
    const visible = stageAtLeast(stage, "ch5_gorge");
    if (!visible) return null;

    return (
        <>
            <BoatmanNode
                pos={PORT_POS}
                line="협곡까지 모셔다 드리리다. 꽉 잡으시오."
                destination={GORGE_LANDING}
            />
            <BoatmanNode
                pos={GORGE_POS}
                line="돌아가시겠소? 부두까지 데려다 드리지."
                destination={PIER_POS}
            />
        </>
    );
}
