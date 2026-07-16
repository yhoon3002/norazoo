// rpg/presenter/slices/fieldSlice.ts — 필드 리스폰 타이머 (비영속 — 세이브에 저장하지 않는다)
"use client";

export const fieldSlice = (set: any, get: any) => ({
    /** key = 리스폰 시 지울 플래그들을 '|'로 연결한 문자열, 값 = 예정 시각(ms) */
    fieldRespawn: {} as Record<string, number>,

    /** 황금 약초 스폰 지점 — 세션당 1회 롤 (전투로 FieldScene이 리마운트돼도 유지) */
    goldenHerbIdx: Math.floor(Math.random() * 3),

    scheduleRespawn: (key: string, delayMs: number) =>
        set((s: any) => ({
            fieldRespawn: { ...s.fieldRespawn, [key]: Date.now() + delayMs },
        })),

    /** 만료된 타이머를 소거하고 해당 플래그를 지워 리스폰시킨다 */
    consumeRespawns: () => {
        const now = Date.now();
        const due = Object.entries(
            get().fieldRespawn as Record<string, number>
        ).filter(([, at]) => now >= at);
        if (!due.length) return;
        set((st: any) => {
            const fieldRespawn = { ...st.fieldRespawn };
            const flags = { ...st.flags };
            for (const [key] of due) {
                delete fieldRespawn[key];
                for (const f of key.split("|")) delete flags[f];
            }
            const revivedEnemy = due.some(([key]) => key.includes("defeated_"));
            // 적 리스폰 직후 2.5초 조우 유예 — 발밑 리스폰 기습 방지
            return revivedEnemy
                ? { fieldRespawn, flags, encounterCooldownUntil: performance.now() + 2500 }
                : { fieldRespawn, flags };
        });
    },
});
