// rpg/presenter/slices/cutsceneSlice.ts — 컷신 재생 상태 (transient — 세이브 미포함)
"use client";

import { CUTSCENES } from "../../data/cutsceneData";

export const cutsceneSlice = (set: any, get: any) => ({
    startCutscene: (id: string) => {
        const steps = CUTSCENES[id];
        if (!steps || get().cutscene) return;
        // set 스텝 선적용 — 도중 세이브/이탈에도 상태 유실 없음 (재생은 순수 연출)
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

    skipCutscene: () => {
        if (!get().cutscene) return;
        set({ cutscene: null, dialogue: [] }); // set 스텝은 이미 선적용됨
    },
});
