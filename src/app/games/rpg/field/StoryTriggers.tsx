// rpg/field/StoryTriggers.tsx — 스토리 트리거 감시 (위치/플래그 조건 → 대화·스테이지 진행)
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { STORY_TRIGGERS } from "../data/storyData";

export function StoryTriggers() {
    const frame = useRef(0);

    useFrame((state) => {
        frame.current++;
        if (frame.current % 10 !== 0) return; // 10프레임 스로틀

        const g = useGame.getState();
        if (g.combat.phase !== "idle") return;
        if (g.dialogue.length > 0) return; // 대화 중엔 다음 트리거 보류
        const ui = g.ui as { mapOpen?: boolean; fishingOpen?: boolean; smithOpen?: boolean; bountyOpen?: boolean };
        if (ui.mapOpen || ui.fishingOpen || ui.smithOpen || ui.bountyOpen) return; // 오버레이 중에도 보류

        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;

        for (const t of STORY_TRIGGERS) {
            if (g.story.stage !== t.stage) continue;
            if (g.flags[`story_${t.id}`]) continue;
            if (t.near) {
                if (!p) continue;
                if (
                    Math.hypot(p.x - t.near.x, p.z - t.near.z) > t.near.radius
                )
                    continue;
            }
            if (t.flagsAll && !t.flagsAll.every((f) => g.flags[f])) continue;

            // 발동 (1회성)
            useGame.setState((s: { flags: Record<string, boolean> }) => ({
                flags: { ...s.flags, [`story_${t.id}`]: true },
            }));
            if (t.dialogue) g.startDialogue(t.dialogue);
            const patch: {
                stage?: string;
                objective?: string;
                target?: { x: number; z: number } | null;
            } = {};
            if (t.nextStage) patch.stage = t.nextStage;
            if (t.objective) patch.objective = t.objective;
            if (t.target !== undefined) patch.target = t.target;
            if (Object.keys(patch).length) g.setStory(patch);
            break; // 프레임당 1개만
        }
    });

    return null;
}
