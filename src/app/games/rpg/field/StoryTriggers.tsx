// rpg/field/StoryTriggers.tsx — 스토리 트리거 감시 (위치/플래그 조건 → 대화·스테이지 진행)
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { STORY_TRIGGERS } from "../data/storyData";

export function StoryTriggers() {
    const frame = useRef(0);
    // 재도전 대기 중인 전투 트리거 중, 반경 밖으로 한 번이라도 나간 적이 있는 트리거 id 집합.
    // 체크포인트 깃발이 트리거 반경 안에 있으면 패배→복귀가 즉시 재발동으로 이어져
    // 대사가 이동을 잠그고 전투가 재시작되는 소프트락이 생긴다 — 한 번 반경을 벗어났다
    // 돌아와야 재발동을 허용해 이를 막는다. FieldScene은 전투마다 리마운트되므로 이 ref는
    // 매 전투 후 초기화된다(= 다시 한 번 반경을 벗어나야 함) — 의도된 동작.
    const exitedRadiusOnce = useRef<Set<string>>(new Set());

    useFrame((state) => {
        frame.current++;
        if (frame.current % 10 !== 0) return; // 10프레임 스로틀

        const g = useGame.getState();
        if (g.combat.phase !== "idle") return;
        if (g.dialogue.length > 0) return; // 대화 중엔 다음 트리거 보류
        const ui = g.ui as { mapOpen?: boolean; fishingOpen?: boolean; smithOpen?: boolean; bountyOpen?: boolean; tailorOpen?: boolean };
        if (ui.mapOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen || ui.tailorOpen) return; // 오버레이 중에도 보류

        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;

        // 재도전 대기 중인 전투 트리거의 반경 이탈 여부를 매 틱 갱신 —
        // 이번 프레임에 발동할 트리거가 아니어도(1개만 발동하고 break) 전부 갱신한다.
        if (p) {
            for (const t of STORY_TRIGGERS) {
                if (g.story.stage !== t.stage || !t.battle || !t.near) continue;
                const alreadyFired = !!g.flags[`story_${t.id}`];
                const battleUnwon = !g.flags[`defeated_${t.battle.id}_0`];
                if (!alreadyFired || !battleUnwon) continue;
                const outside =
                    Math.hypot(p.x - t.near.x, p.z - t.near.z) > t.near.radius;
                if (outside) exitedRadiusOnce.current.add(t.id);
            }
        }

        for (const t of STORY_TRIGGERS) {
            if (g.story.stage !== t.stage) continue;

            const alreadyFired = !!g.flags[`story_${t.id}`];
            // 전투 트리거는 승리 플래그(defeated_${battleId}_0)가 없는 한
            // story_${id}가 이미 찍혀 있어도 재발동을 허용한다 — 패배 후 소프트락 방지.
            // (그룹 전투는 전멸 시에만 victory이므로 첫 번째 fieldId 플래그로 승패를 대표할 수 있다)
            const battleUnwon =
                !!t.battle && !g.flags[`defeated_${t.battle.id}_0`];
            if (alreadyFired && !battleUnwon) continue;

            // 재발동(재도전) 케이스: 반경이 있는 트리거는 한 번 벗어났다 돌아와야 재발동 허용
            // (반경이 없는 전투 트리거는 위치 재진입 개념이 없으므로 게이트를 걸지 않는다)
            if (alreadyFired && battleUnwon && t.near) {
                if (!exitedRadiusOnce.current.has(t.id)) continue;
            }

            if (t.near) {
                if (!p) continue;
                if (
                    Math.hypot(p.x - t.near.x, p.z - t.near.z) > t.near.radius
                )
                    continue;
            }
            if (t.flagsAll && !t.flagsAll.every((f) => g.flags[f])) continue;

            // 발동 — 재도전 소비: 다음 재도전을 위해선 다시 반경을 벗어났다 돌아와야 한다.
            exitedRadiusOnce.current.delete(t.id);

            // story_${id} 플래그와 1회성 부가효과(스테이지 진행·보상)는 최초 발동에만 적용.
            // 재발동(재도전)은 대사 재생 + 전투 재무장만 수행한다.
            if (!alreadyFired) {
                useGame.setState((s: { flags: Record<string, boolean> }) => ({
                    flags: { ...s.flags, [`story_${t.id}`]: true },
                }));
            }
            if (t.dialogue) g.startDialogue(t.dialogue);
            // 대사 종료 후 전투 진입 — advanceDialogue가 큐 소진 시 소비
            if (t.battle) g.setPendingStoryBattle(t.battle);

            if (!alreadyFired) {
                const patch: {
                    stage?: string;
                    objective?: string;
                    target?: { x: number; z: number } | null;
                } = {};
                if (t.nextStage) patch.stage = t.nextStage;
                if (t.objective) patch.objective = t.objective;
                if (t.target !== undefined) patch.target = t.target;
                if (Object.keys(patch).length) g.setStory(patch);

                // 트리거 보상 지급 (최초 1회만 — 재도전 시 중복 지급 방지)
                if (t.reward) {
                    if (t.reward.gold) g.gainGold(t.reward.gold);
                    if (t.reward.items)
                        for (const it of t.reward.items)
                            g.addItem(it.id, it.qty);
                    g.spawnPopup({
                        side: "ally",
                        text: `🎁 보상 획득!${
                            t.reward.gold ? ` +${t.reward.gold}G` : ""
                        }`,
                        color: "#fbbf24",
                    });
                }
            }
            break; // 프레임당 1개만
        }
    });

    return null;
}
