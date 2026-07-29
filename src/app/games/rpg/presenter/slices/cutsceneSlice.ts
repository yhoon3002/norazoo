// rpg/presenter/slices/cutsceneSlice.ts — 컷신 재생 상태 (transient — 세이브 미포함)
"use client";

import { CUTSCENES } from "../../data/cutsceneData";

export const cutsceneSlice = (set: any, get: any) => ({
    cutscene: null as null | { id: string; index: number },

    startCutscene: (id: string) => {
        const steps = CUTSCENES[id];
        if (!steps || get().cutscene) return;
        // set 스텝 선적용 — 도중 세이브/이탈에도 상태 유실 없음 (재생은 순수 연출)
        // 주의: battle 컷신은 재도전 시 이 선적용이 다시 실행된다 — giveGold/giveItems를
        // battle 컷신에 넣으면 재도전마다 중복 지급되니 금지 (SP1 최종 리뷰 M-5).
        for (const st of steps) {
            if (st.type !== "set") continue;
            if (st.flags) set((s: any) => ({ flags: { ...s.flags, ...st.flags } }));
            if (st.story) get().setStory(st.story);
            if (st.giveGold) get().gainGold(st.giveGold);
            if (st.giveItems) for (const it of st.giveItems) get().addItem(it.id, it.qty);
        }
        set({ cutscene: { id, index: 0 } });
    },

    /** 현재 스텝 완료 → 다음으로. 끝이면 종료. battle 스텝은 컨트롤러가 진입 "전"에 호출해 둔다. */
    advanceCutsceneStep: () => {
        const c = get().cutscene;
        if (!c) return;
        const steps = CUTSCENES[c.id] ?? [];
        const next = c.index + 1;
        set({ cutscene: next >= steps.length ? null : { id: c.id, index: next } });
    },

    /**
     * 스킵 — 잔여 스텝에 미완료 battle(승리 플래그 없음)이 남아 있으면 컷신을 끝내는
     * 대신 그 battle 스텝 인덱스로 점프한다: 연출(say/cam)만 건너뛰고 전투는 그대로
     * 진행시켜, 스킵이 필수 전투까지 삼켜버리는 것을 막는다 (SP1 최종 리뷰 I-4).
     * 미완료 battle이 없으면 기존대로 컷신을 종료한다.
     */
    skipCutscene: () => {
        const c = get().cutscene;
        if (!c) return;
        const steps = CUTSCENES[c.id] ?? [];
        const flags = get().flags;
        for (let i = c.index; i < steps.length; i++) {
            const st = steps[i];
            if (st.type === "battle" && !flags[`defeated_${st.id}_0`]) {
                set({ cutscene: { id: c.id, index: i }, dialogue: [] });
                return;
            }
        }
        set({ cutscene: null, dialogue: [] }); // set 스텝은 이미 선적용됨
    },
});
