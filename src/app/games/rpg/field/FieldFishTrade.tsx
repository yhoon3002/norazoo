// rpg/field/FieldFishTrade.tsx — 어부 반복 납품 NPC (에필로그 해금, E: 어종 세트 납품 → 골드+보너스)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";

const INTERACT_RANGE = 2.6;
const FISH_TRADE_POS = { x: 200.5, y: -38.25, z: 1.5 };

/** 납품 세트 — 바람송어×2 + 빙어×2 + 심연어×1 */
const FISH_TRADE_SET = [
    { id: "wind_trout", qty: 2 },
    { id: "ice_fish", qty: 2 },
    { id: "deep_fish", qty: 1 },
];
const FISH_TRADE_SET_LABEL = "바람송어 2·빙어 2·심연어 1";

/** 보너스 재료 순환 (납품 횟수 n % 3 — 결정적) */
const FISH_TRADE_BONUS = ["monster_core", "silver_ore", "golden_herb"];
const FISH_TRADE_BONUS_NAME: Record<string, string> = {
    monster_core: "마물 결정",
    silver_ore: "은광석",
    golden_herb: "황금 약초",
};

export function FieldFishTrade() {
    const stage = useGame((s) => s.story.stage);
    const visible = stageAtLeast(stage, "epilogue");

    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!visible || !groupRef.current) return;

        // 지면 스냅 — 다른 NPC와 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(FISH_TRADE_POS.x, FISH_TRADE_POS.z, FISH_TRADE_POS.y ?? p.y);
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

    // E키 상호작용 — 세트 보유 시 납품(골드+보너스+대화), 미보유 시 안내 대사
    useEffect(() => {
        if (!visible || !inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return;

            // fresh 재검증 — 위 useGame.getState()가 이미 최신 상태이므로 더블 클릭 시에도
            // 두 번째 호출은 차감 이후의 상태를 보고 다시 판정한다 (이중지급 방지)
            const bagQty = (id: string) => s.bag.find((b: { id: string; qty: number }) => b.id === id)?.qty ?? 0;
            const hasSet = FISH_TRADE_SET.every((n) => bagQty(n.id) >= n.qty);

            if (!hasSet) {
                s.startDialogue([
                    {
                        speaker: "어부",
                        text: `${FISH_TRADE_SET_LABEL}를 모아다 주면 톡톡히 쳐주지.`,
                    },
                ]);
                return;
            }

            const n = s.killCounts["fish_trade"] ?? 0;
            const bonusId = FISH_TRADE_BONUS[n % 3];

            // 단일 setState — 재료 차감 + 골드 지급 + 납품 횟수 갱신을 한 번에 반영
            useGame.setState((st: any) => {
                let bag = [...st.bag];
                for (const item of FISH_TRADE_SET) {
                    bag = bag
                        .map((b: any) => (b.id === item.id ? { ...b, qty: b.qty - item.qty } : b))
                        .filter((b: any) => b.qty > 0);
                }
                return {
                    bag,
                    player: { ...st.player, gold: st.player.gold + 300 },
                    killCounts: { ...st.killCounts, fish_trade: n + 1 },
                };
            });
            useGame.getState().addItem(bonusId, 1);

            s.startDialogue([
                { speaker: "어부", text: "좋은 물건이군! 오늘 벌이는 이걸로 충분하겠어." },
                { speaker: "어부", text: "자, 이건 내가 챙겨둔 답례일세." },
            ]);
            useGame.getState().spawnPopup({
                side: "ally",
                text: `🐟 납품 완료! +300G · ${FISH_TRADE_BONUS_NAME[bonusId] ?? bonusId} 획득`,
                color: "#5eead4",
            });
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible]);

    if (!visible) return null;

    return (
        <group position={[FISH_TRADE_POS.x, FISH_TRADE_POS.y, FISH_TRADE_POS.z]} ref={groupRef}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url="/character/Elf.fbx"
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                <div style={{ fontSize: 20 }}>🐟</div>
            </Html>

            {inRange && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#5eead4",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #5eead4",
                            fontSize: 14,
                        }}
                    >
                        E: 생선 납품 — 어부 🐟
                    </div>
                </Html>
            )}
        </group>
    );
}
