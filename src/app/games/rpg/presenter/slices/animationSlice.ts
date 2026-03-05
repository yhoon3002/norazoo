// rpg/presenter/slices/animationSlice.ts
"use client";

export const animationSlice = (set: any, get: any) => ({
    // ===== Attack Motion =====
    attackMotion: {} as Record<
        string,
        {
            targetId: string;
            side: "player" | "enemy";
            startTime: number;
            duration: number;
        } | null
    >,

    startAttackMotion: (
        attackerId: string,
        targetId: string,
        side: "player" | "enemy",
        duration = 650
    ) => {
        set((s: any) => ({
            attackMotion: {
                ...s.attackMotion,
                [attackerId]: {
                    targetId,
                    side,
                    startTime: performance.now(),
                    duration,
                },
            },
        }));

        setTimeout(() => {
            set((s: any) => ({
                attackMotion: { ...s.attackMotion, [attackerId]: null },
            }));
        }, duration);
    },

    // ===== Animation States =====
    attackSwing: {} as Record<string, boolean>,
    animNonce: {} as Record<string, number>,
    currentAnimState: {} as Record<string, string>,

    triggerSwing: (id: string, ms = 500) => {
        set((s: any) => ({
            attackSwing: { ...s.attackSwing, [id]: true },
            animNonce: {
                ...s.animNonce,
                [id]: (s.animNonce[id] ?? 0) + 1,
            },
        }));
        setTimeout(() => {
            const st = get();
            set({
                attackSwing: { ...st.attackSwing, [id]: false },
            });
        }, ms);
    },

    triggerAnimatedAction: (id: string, animState: string, ms = 500) => {
        set((s: any) => ({
            attackSwing: { ...s.attackSwing, [id]: true },
            animNonce: {
                ...s.animNonce,
                [id]: (s.animNonce[id] ?? 0) + 1,
            },
            currentAnimState: { ...s.currentAnimState, [id]: animState },
        }));
        setTimeout(() => {
            const st = get();
            set({
                attackSwing: { ...st.attackSwing, [id]: false },
                currentAnimState: { ...st.currentAnimState, [id]: "idle" },
            });
        }, ms);
    },
});