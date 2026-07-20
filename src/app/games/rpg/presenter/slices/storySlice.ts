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
        target: { x: 4, z: -4 }, // 요리사의 불빛
        respawn: null,
    } as StoryState,
    dialogue: [] as DialogueLine[],

    // ===== Dialogue =====
    startDialogue: (lines: DialogueLine[]) => set({ dialogue: [...lines] }),

    advanceDialogue: () =>
        set((s: any) => ({ dialogue: s.dialogue.slice(1) })),

    // ===== Story Progress =====
    setStory: (patch: Partial<StoryState>) =>
        set((s: any) => ({ story: { ...s.story, ...patch } })),
});
