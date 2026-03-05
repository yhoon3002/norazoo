// rpg/presenter/slices/effectsSlice.ts
"use client";

type Popup = {
    id: number;
    side: "enemy" | "ally";
    charId?: string;
    text: string;
    color: string;
    createdAt: number;
};

// popupSeq는 세션 내에서 단조 증가하지만 실제 ID는 순환 사용
let popupSeq = 1;
const MAX_POPUPS = 20;

export const effectsSlice = (set: any, get: any) => ({
    // ===== Screen Shake (FX) =====
    fx: { t: 0, side: null as "player" | "enemy" | null, intensity: 1 },

    triggerFX: (side: "player" | "enemy", intensity = 1) =>
        set({ fx: { t: performance.now(), side, intensity } }),

    // ===== Popups (Damage, Status, Messages) =====
    popups: [] as Popup[],

    spawnPopup: (p: Omit<Popup, "id" | "createdAt">) =>
        set((s: any) => {
            const newPopups = [
                ...s.popups,
                { id: popupSeq++, createdAt: performance.now(), ...p },
            ];
            // 최대 개수 초과 시 가장 오래된 것부터 제거
            return { popups: newPopups.slice(-MAX_POPUPS) };
        }),

    // 만료된 팝업 일괄 정리 (DamageFeedUI 등에서 호출)
    clearOldPopups: (olderThanMs: number) =>
        set((s: any) => ({
            popups: s.popups.filter(
                (p: Popup) => performance.now() - p.createdAt < olderThanMs
            ),
        })),

    // ===== Hit Effects =====
    hitEffects: [] as Array<{
        id: number;
        position: [number, number, number];
        color: string;
        createdAt: number;
    }>,

    spawnHitEffect: (position: [number, number, number], color = "#ffaa00") =>
        set((s: any) => ({
            hitEffects: [
                ...s.hitEffects,
                {
                    id: popupSeq++,
                    position,
                    color,
                    createdAt: performance.now(),
                },
            ],
        })),

    // HitEffects.tsx에서 useFrame으로 호출 - 만료된 이펙트 제거
    clearOldHitEffects: (beforeTimestamp: number) =>
        set((s: any) => {
            const filtered = s.hitEffects.filter(
                (e: { createdAt: number }) => e.createdAt > beforeTimestamp
            );
            // 변경이 없으면 새 배열 생성 방지
            if (filtered.length === s.hitEffects.length) return s;
            return { hitEffects: filtered };
        }),

    // ===== Slow Motion =====
    slowMotion: {
        active: false,
        scale: 1.0,
        endAt: 0,
        onComplete: undefined as (() => void) | undefined,
    },

    triggerSlowMotion: (
        durationMs: number,
        scale = 0.3,
        onComplete?: () => void
    ) => {
        set({
            slowMotion: {
                active: true,
                scale,
                endAt: performance.now() + durationMs,
                onComplete,
            },
        });

        setTimeout(() => {
            const callback = get().slowMotion.onComplete;

            set({
                slowMotion: {
                    active: false,
                    scale: 1.0,
                    endAt: 0,
                    onComplete: undefined,
                },
            });

            if (callback) callback();
        }, durationMs);
    },
});
