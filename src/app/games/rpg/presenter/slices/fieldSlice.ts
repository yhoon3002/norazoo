// rpg/presenter/slices/fieldSlice.ts — 필드 리스폰 타이머 (비영속 — 세이브에 저장하지 않는다)
"use client";

export const fieldSlice = (set: any, get: any) => ({
    /** key = 리스폰 시 지울 플래그들을 '|'로 연결한 문자열, 값 = 예정 시각(ms) */
    fieldRespawn: {} as Record<string, number>,

    /** 황금 약초 스폰 지점 — 세션당 1회 롤 (전투로 FieldScene이 리마운트돼도 유지) */
    goldenHerbIdx: Math.floor(Math.random() * 3),

    /** 요리 버프 대기열 — 다음 전투 시작 시 파티 전원에게 적용 (5분 내 미사용 시 만료, 비영속) */
    pendingBuffs: [] as Array<{ type: string; value: number; duration: number; expiresAt: number }>,

    /** 템플릿별 누적 처치 수 (+ 의뢰 기준점 `bounty_${id}_base`) — 세이브 영속 */
    killCounts: {} as Record<string, number>,

    addKill: (template: string) =>
        set((s: any) => ({
            killCounts: {
                ...s.killCounts,
                [template]: (s.killCounts[template] ?? 0) + 1,
                "*": (s.killCounts["*"] ?? 0) + 1,
            },
        })),

    addPendingBuffs: (buffs: Array<{ type: string; value: number; duration: number }>) =>
        set((s: any) => ({
            pendingBuffs: [
                ...s.pendingBuffs,
                ...buffs.map((b) => ({ ...b, expiresAt: Date.now() + 300_000 })),
            ],
        })),

    /** 전투 시작 시 1회 소비 */
    consumePendingBuffs: () => {
        const now = Date.now();
        const valid = get().pendingBuffs.filter((b: any) => b.expiresAt > now);
        set({ pendingBuffs: [] });
        return valid as Array<{ type: string; value: number; duration: number }>;
    },

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
