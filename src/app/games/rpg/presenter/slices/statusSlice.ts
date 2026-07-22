// rpg/presenter/slices/statusSlice.ts
"use client";

export const statusSlice = (set: any, get: any) => ({
    // ===== Apply Status Effect =====
    applyStatusEffect: (
        targetId: string,
        effect: { type: string; duration: number; value: number }
    ) => {
        set((s: any) => {
            const partyIndex = s.player.party.findIndex(
                (c: any) => c.id === targetId
            );

            if (partyIndex >= 0) {
                const party = [...s.player.party];
                const char = { ...party[partyIndex] };

                const existing = char.statusEffects.find(
                    (e: any) => e.type === effect.type
                );
                char.statusEffects = char.statusEffects.filter(
                    (e: any) => e.type !== effect.type
                );
                char.statusEffects.push(
                    existing
                        ? {
                              ...effect,
                              value: Math.max(existing.value, effect.value),
                              duration: Math.max(
                                  existing.duration,
                                  effect.duration
                              ),
                          }
                        : { ...effect }
                );

                party[partyIndex] = char;
                return { player: { ...s.player, party } };
            }

            if (s.combat.phase !== "idle") {
                const enemies = [...(s.combat as any).enemies];
                const enemyIndex = enemies.findIndex(
                    (e: any) => e.id === targetId
                );

                if (enemyIndex >= 0) {
                    const enemy = { ...enemies[enemyIndex] };

                    const existing = enemy.statusEffects.find(
                        (e: any) => e.type === effect.type
                    );
                    enemy.statusEffects = enemy.statusEffects.filter(
                        (e: any) => e.type !== effect.type
                    );
                    enemy.statusEffects.push(
                        existing
                            ? {
                                  ...effect,
                                  value: Math.max(existing.value, effect.value),
                                  duration: Math.max(
                                      existing.duration,
                                      effect.duration
                                  ),
                              }
                            : { ...effect }
                    );

                    enemies[enemyIndex] = enemy;

                    return {
                        combat: {
                            ...s.combat,
                            enemies,
                        },
                    };
                }
            }

            return s;
        });
    },

    // ===== Process Status Effects =====
    processStatusEffects: (characterId: string) => {
        const s = get();
        const char = s.player.party.find((c: any) => c.id === characterId);
        const enemy =
            s.combat.phase !== "idle"
                ? (s.combat as any).enemies.find(
                      (e: any) => e.id === characterId
                  )
                : null;

        const target = char || enemy;
        if (!target) return;

        // Process each status effect
        target.statusEffects.forEach((effect: any) => {
            switch (effect.type) {
                case "burn":
                case "poison":
                    get().applyDamage(characterId, effect.value);
                    get().spawnPopup({
                        side: char ? "ally" : "enemy",
                        charId: characterId,
                        text: `-${effect.value} (${effect.type})`,
                        color: "#ff6b35",
                    });
                    break;

                case "buff_atk":
                case "buff_def":
                case "debuff_def":
                    // Buff/debuff effect handled in effectiveStat — no-op here
                    break;

                case "regen":
                    // healCharacter 액션은 스토어에 없음(전역 검색 확인) — 직접 회복 처리
                    set((state: any) => {
                        const party = state.player.party.map((c: any) =>
                            c.id === characterId
                                ? { ...c, stats: { ...c.stats, hp: Math.min(c.stats.maxHp, c.stats.hp + effect.value) } }
                                : c
                        );
                        return { player: { ...state.player, party } };
                    });
                    get().spawnPopup({
                        side: char ? "ally" : "enemy",
                        charId: characterId,
                        text: `+${effect.value} (재생)`,
                        color: "#4ade80",
                    });
                    break;

                case "stun":
                case "freeze":
                    get().spawnPopup({
                        side: char ? "ally" : "enemy",
                        charId: characterId,
                        text: effect.type.toUpperCase(),
                        color: "#60a5fa",
                    });
                    break;
            }
        });

        // Decrease duration and remove expired effects
        set((state: any) => {
            const partyIndex = state.player.party.findIndex(
                (c: any) => c.id === characterId
            );

            if (partyIndex >= 0) {
                const party = [...state.player.party];
                const char = { ...party[partyIndex] };

                char.statusEffects = char.statusEffects
                    .map((e: any) => ({ ...e, duration: e.duration - 1 }))
                    .filter((e: any) => e.duration > 0);

                party[partyIndex] = char;
                return { player: { ...state.player, party } };
            }

            if (state.combat.phase !== "idle") {
                const enemies = [...(state.combat as any).enemies];
                const enemyIndex = enemies.findIndex(
                    (e: any) => e.id === characterId
                );

                if (enemyIndex >= 0) {
                    const enemy = { ...enemies[enemyIndex] };

                    enemy.statusEffects = enemy.statusEffects
                        .map((e: any) => ({
                            ...e,
                            duration: e.duration - 1,
                        }))
                        .filter((e: any) => e.duration > 0);

                    enemies[enemyIndex] = enemy;

                    return {
                        combat: {
                            ...state.combat,
                            enemies,
                        },
                    };
                }
            }

            return state;
        });

        // DoT(burn/poison)로 사망했을 수 있음 — 전투 중이면 종료 체크
        if (get().combat.phase !== "idle") get().checkCombatEnd();
    },
});