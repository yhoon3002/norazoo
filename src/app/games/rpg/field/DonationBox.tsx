// rpg/field/DonationBox.tsx — 광장 재건 기부함 (게이트 없음·상시, E: 단계별 재건 기부)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

const INTERACT_RANGE = 2.6;
const DONATION_POS = { x: 18.5, y: -33.25, z: -20.5 };

/** 단계별 비용 — killCounts["donation_lv"] 0→3 */
const DONATION_COSTS = [500, 1500, 5000];

const FLOWER_COLORS = ["#f472b6", "#facc15", "#f87171", "#a78bfa"];
const FESTIVAL_COLORS = ["#fb923c", "#34d399", "#60a5fa", "#f472b6", "#facc15", "#f87171"];

/** 재건 단계 데코 — 1단계 이상 꽃, 3단계 이상 축제 장식 추가 (donation_lv 구독) */
function DonationDeco({ lv }: { lv: number }) {
    if (lv < 1) return null;
    return (
        <>
            {FLOWER_COLORS.map((color, i) => {
                const angle = (i / FLOWER_COLORS.length) * Math.PI * 2;
                const r = 0.85;
                return (
                    <group
                        key={`flower_${i}`}
                        position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                    >
                        <mesh position={[0, 0.08, 0]}>
                            <coneGeometry args={[0.04, 0.16, 6]} />
                            <meshStandardMaterial color="#4ade80" />
                        </mesh>
                        <mesh position={[0, 0.18, 0]}>
                            <sphereGeometry args={[0.06, 8, 8]} />
                            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
                        </mesh>
                    </group>
                );
            })}
            {lv >= 3 &&
                FESTIVAL_COLORS.map((color, i) => {
                    const angle = (i / FESTIVAL_COLORS.length) * Math.PI * 2 + Math.PI / 6;
                    const r = 1.3;
                    return (
                        <mesh key={`fest_${i}`} position={[Math.cos(angle) * r, 0.5, Math.sin(angle) * r]}>
                            <coneGeometry args={[0.1, 0.5, 8]} />
                            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
                        </mesh>
                    );
                })}
        </>
    );
}

export function DonationBox() {
    const donationLv = useGame((s) => s.killCounts["donation_lv"] ?? 0);

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
            const found = navFindWalkable(DONATION_POS.x, DONATION_POS.z, DONATION_POS.y ?? p.y);
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

    // E키 상호작용 — 현재 단계 비용 지불 시 재건 단계 상승 + 효과, 미보유/완료 시 안내 팝업
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return;

            // fresh 재검증 — useGame.getState()는 항상 최신 상태이므로 더블 클릭 시에도
            // 두 번째 호출은 lv 증가 이후 상태를 보고 다시 판정한다 (단계 중복 지급 방지)
            const lv = s.killCounts["donation_lv"] ?? 0;
            if (lv >= 3) {
                s.spawnPopup({
                    side: "ally",
                    text: "🏛️ 이미 재건이 완료된 광장이다",
                    color: "#facc15",
                });
                return;
            }

            const cost = DONATION_COSTS[lv];
            if (s.player.gold < cost) {
                s.spawnPopup({
                    side: "ally",
                    text: `골드가 부족하다 (${cost}G 필요)`,
                    color: "#f87171",
                });
                return;
            }

            // 단일 setState — 골드 차감 + 재건 단계 증가를 한 번에 반영 (1회성 보장)
            useGame.setState((st: any) => ({
                player: { ...st.player, gold: st.player.gold - cost },
                killCounts: { ...st.killCounts, donation_lv: lv + 1 },
            }));

            if (lv === 0) {
                useGame.getState().spawnPopup({
                    side: "ally",
                    text: "🌸 광장에 꽃이 피었다",
                    color: "#f472b6",
                });
            } else if (lv === 1) {
                useGame.getState().feastStat("maxHp", 10);
                useGame.getState().spawnPopup({
                    side: "ally",
                    text: "🏮 거리가 밝아졌다 — 파티 최대 HP +10",
                    color: "#fbbf24",
                });
            } else if (lv === 2) {
                useGame.getState().feastStat("atk", 2);
                useGame.getState().feastStat("def", 2);
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, donation_max: true },
                }));
                useGame.getState().spawnPopup({
                    side: "ally",
                    text: "🎉 노라 재건 완료! 공격/방어 +2",
                    color: "#facc15",
                });
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group ref={groupRef} position={[DONATION_POS.x, DONATION_POS.y, DONATION_POS.z]}>
            {/* 상자 몸체 */}
            <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[0.8, 0.5, 0.55]} />
                <meshStandardMaterial color="#6b3f22" />
            </mesh>
            {/* 금색 테두리 (윗면) */}
            <mesh position={[0, 0.62, 0]} castShadow>
                <boxGeometry args={[0.86, 0.08, 0.6]} />
                <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* 금색 잠금쇠 */}
            <mesh position={[0, 0.42, 0.28]}>
                <boxGeometry args={[0.14, 0.14, 0.04]} />
                <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
            </mesh>

            <DonationDeco lv={donationLv} />

            <Html position={[0, 1.1, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 20 }}>💰</div>
            </Html>

            {inRange && (
                <Html position={[0, 0.95, 0]} center distanceFactor={8}>
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
                        E: 재건 기부
                    </div>
                </Html>
            )}
        </group>
    );
}
