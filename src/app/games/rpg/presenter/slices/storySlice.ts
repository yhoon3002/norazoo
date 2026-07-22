// rpg/presenter/slices/storySlice.ts — 스토리 진행/대화/체크포인트 상태
"use client";

import {
    INITIAL_STAGE,
    INITIAL_OBJECTIVE,
    type DialogueLine,
} from "../../data/storyData";

export type StoryState = {
    stage: string;
    objective: string;
    /** 목표 지점 (빛기둥 비콘 + HUD 거리 표시용) */
    target: null | { x: number; z: number };
    respawn: null | { x: number; y: number; z: number; label: string };
};

export const storySlice = (set: any, get: any) => ({
    // ===== State =====
    story: {
        stage: INITIAL_STAGE,
        objective: INITIAL_OBJECTIVE,
        target: { x: 12.8, z: -14 }, // 요리사의 불빛(프롤로그 목표와 일치)
        respawn: null,
    } as StoryState,
    dialogue: [] as DialogueLine[],
    // 대사 종료 후 진입할 전투 — StoryTriggers가 대사 발동과 함께 저장해 두고,
    // advanceDialogue에서 대화 큐가 비는 시점에 소비한다.
    pendingStoryBattle: null as null | { id: string; templates: string[] },

    // ===== Dialogue =====
    startDialogue: (lines: DialogueLine[]) => set({ dialogue: [...lines] }),

    setPendingStoryBattle: (
        b: null | { id: string; templates: string[] }
    ) => set({ pendingStoryBattle: b }),

    advanceDialogue: () => {
        set((s: any) => ({ dialogue: s.dialogue.slice(1) }));

        // 큐가 비는 순간 대기 중인 스토리 전투가 있으면 진입시킨다.
        // 필드 적 그룹과 동일한 { group: [{template, fieldId}] } 경로를 재사용 —
        // 승리 시 exitBattle이 defeated_${fieldId} 플래그를 자동 기록한다.
        const s = get();
        if (s.dialogue.length === 0 && s.pendingStoryBattle) {
            const b = s.pendingStoryBattle;
            set({ pendingStoryBattle: null });
            get().startCombat({
                group: b.templates.map((template: string, i: number) => ({
                    template,
                    fieldId: `${b.id}_${i}`,
                })),
            });
        }
    },

    // ===== Story Progress =====
    setStory: (patch: Partial<StoryState>) =>
        set((s: any) => ({ story: { ...s.story, ...patch } })),
});
