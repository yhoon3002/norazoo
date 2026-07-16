// rpg/field/FieldMerchant.tsx — 필드 상인 NPC (근접 시 E키로 상점)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { MERCHANT_POS, COOK_QUEST } from "../data/gameData";

const INTERACT_RANGE = 2.6;

export function FieldMerchant() {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 지면 스냅 — 적 스폰과 동일하게 플레이어 층 walkable에 배치
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((
                      x: number,
                      z: number,
                      preferY?: number
                  ) => { x: number; z: number; y: number } | null)
                | undefined;
            const playerPos = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (navFindWalkable && playerPos) {
                const found = navFindWalkable(
                    MERCHANT_POS.x,
                    MERCHANT_POS.z,
                    // 데이터에 의도 층 y가 있으면 그 층 기준 (플레이어가 딴 층이어도 안전)
                    MERCHANT_POS.y !== 0 ? MERCHANT_POS.y : playerPos.y
                );
                if (found) {
                    groupRef.current.position.set(found.x, found.y, found.z);
                    // 화자 마커(SpeakerHighlight)가 요리사 위치를 찾을 수 있게 공유
                    state.scene.userData.__merchantPos = groupRef.current.position;
                }
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
        const d = Math.hypot(
            p.x - groupRef.current.position.x,
            p.z - groupRef.current.position.z
        );
        const near =
            d <= INTERACT_RANGE &&
            Math.abs(p.y - groupRef.current.position.y) <= 2;
        if (near !== inRangeRef.current) {
            inRangeRef.current = near;
            setInRange(near);
            // 범위를 벗어나면 상점 자동 닫기
            if (!near && useGame.getState().ui.shopOpen) {
                useGame.getState().toggleShop();
            }
        }
    });

    // E키 상호작용
    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            if ((s.ui as any).mapOpen) return;

            // ── 미니퀘스트: 멈춘 화덕을 위한 재료 ──
            if (COOK_QUEST.availableFrom.includes(s.story.stage)) {
                if (!s.flags.quest_cook) {
                    useGame.setState((st: any) => ({
                        flags: { ...st.flags, quest_cook: true },
                    }));
                    s.startDialogue([
                        {
                            speaker: "요리사",
                            text: "부탁이 하나 있소. 화덕이 식은 지 오래라… 약초 3개와 슬라임 젤 2개만 구해다 주면 보답하지.",
                        },
                        {
                            speakerId: "lotti",
                            text: "사부님 화덕이 식다니, 큰일이네! 약초는 길가에 반짝이는 걸 채집(E)하면 돼. 젤은 슬라임이 떨구거나 풀숲에서 나와.",
                        },
                    ]);
                    return;
                }
                if (!s.flags.quest_cook_done) {
                    const has = COOK_QUEST.needs.every(
                        (n) =>
                            (s.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >=
                            n.qty
                    );
                    if (has) {
                        useGame.setState((st: any) => {
                            let bag = [...st.bag];
                            for (const n of COOK_QUEST.needs) {
                                bag = bag
                                    .map((b: any) =>
                                        b.id === n.id
                                            ? { ...b, qty: b.qty - n.qty }
                                            : b
                                    )
                                    .filter((b: any) => b.qty > 0);
                            }
                            return {
                                bag,
                                flags: { ...st.flags, quest_cook_done: true },
                            };
                        });
                        for (const r of COOK_QUEST.rewards) {
                            s.addItem(r.id, r.qty);
                        }
                        s.gainGold(COOK_QUEST.rewardGold);
                        s.startDialogue([
                            {
                                speaker: "요리사",
                                text: "오오, 재료가 다 모였군! 화덕에 다시 불을 지필 수 있겠어. 자 — 보수요.",
                            },
                            {
                                speakerId: "arin",
                                text: "(회복 물약 2, 마나 물약 1, 120골드를 받았다)",
                            },
                        ]);
                        return;
                    }
                }
            }

            if (!s.ui.shopOpen) {
                // 상점 UI는 마우스 조작이 필요하므로 포인터락 해제
                document.exitPointerLock?.();
            }
            s.toggleShop();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group
            ref={groupRef}
            position={[MERCHANT_POS.x, MERCHANT_POS.y, MERCHANT_POS.z]}
        >
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/Chef_Hat.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            {/* 상인 표시 링 */}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 0.85, 32]} />
                <meshBasicMaterial
                    color="#ffd700"
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* "광장의 불빛" — 요리사의 랜턴 */}
            <mesh position={[0.75, 2.15, 0]}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshBasicMaterial color="#ffdf8a" />
            </mesh>
            <mesh position={[0.75, 2.28, 0]}>
                <boxGeometry args={[0.1, 0.14, 0.1]} />
                <meshStandardMaterial color="#5b4226" />
            </mesh>
            <pointLight
                position={[0.75, 2.2, 0]}
                color="#ffcc66"
                intensity={3.2}
                distance={11}
                decay={1.8}
            />

            {inRange && (
                <Html position={[0, 2.3, 0]} center distanceFactor={8}>
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
                        E: 상점 💰
                    </div>
                </Html>
            )}
        </group>
    );
}
