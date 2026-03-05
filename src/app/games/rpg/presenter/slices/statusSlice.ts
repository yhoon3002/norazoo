// rpg/presenter/slices/statusSlice.ts
"use client";

import { enemiesInCombat } from "../gameStoreHelpers";

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

                char.statusEffects = char.statusEffects.filter(
                    (e: any) => e.type !== effect.type
                );
                char.statusEffects.push({ ...effect });

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

                    enemy.statusEffects = enemy.statusEffects.filter(
                        (e: any) => e.type !== effect.type
                    );
                    enemy.statusEffects.push({ ...effect });

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
                    // Buff effect handled elsewhere
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
    },
});