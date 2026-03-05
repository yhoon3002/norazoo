// rpg/presenter/slices/combatSlice.ts
"use client";

import type { CombatState, Enemy } from "../../types/RpgTypes";
import { ENEMY_TEMPLATES } from "../../data/gameData";
import { enemiesInCombat, findNextAliveIndex } from "../gameStoreHelpers";

export const combatSlice = (set: any, get: any) => ({
    // ===== State =====
    combat: { phase: "idle" } as CombatState,
    turnQueue: [] as string[],
    currentTurn: 0,

    battleMenu: ["Attack", "Skills", "Items"],
    battleSubMenu: [] as string[],
    battleIndex: 0,
    subMenuIndex: 0,

    defenseTimeoutId: null as NodeJS.Timeout | null,

    // ===== Menu Navigation =====
    setBattleIndex: (i: number) => set({ battleIndex: i }),
    setSubMenuIndex: (i: number) => set({ subMenuIndex: i }),

    moveBattleIndex: (d: number) =>
        set((s: any) => ({
            battleIndex:
                (s.battleIndex + d + s.battleMenu.length) % s.battleMenu.length,
        })),

    moveSubMenuIndex: (d: number) =>
        set((s: any) => ({
            subMenuIndex:
                (s.subMenuIndex + d + s.battleSubMenu.length) %
                s.battleSubMenu.length,
        })),

    // ===== Target Selection =====
    moveTargetIndex: (d: number) =>
        set((s: any) => {
            if (s.combat.phase !== "targetSelect") return s;
            const n = s.combat.allowedTargets.length;
            const idx = (s.combat.index + d + n) % n;
            return { combat: { ...s.combat, index: idx } as CombatState };
        }),

    cancelTargeting: () =>
        set((s: any) => {
            if (s.combat.phase !== "targetSelect") return s;
            return {
                combat: {
                    phase: "playerMenu",
                    enemies: enemiesInCombat(s),
                },
                battleSubMenu: [],
            };
        }),

    // ===== Start Combat =====
    startCombat: (payload: any) =>
        set((s: any) => {
            const group =
                "group" in payload
                    ? payload.group
                    : [
                          {
                              template: payload.template,
                              fieldId: payload.fieldId,
                          },
                      ];

            const enemies: Enemy[] = group.map(({ template, fieldId }: any) => {
                const tpl = ENEMY_TEMPLATES[template];
                if (!tpl)
                    throw new Error(`Unknown enemy template: ${template}`);
                return { id: fieldId, ...tpl };
            });

            const all = [
                ...s.player.party
                    .filter((c: any) => c.stats.hp > 0)
                    .map((c: any) => ({ id: c.id, speed: c.stats.speed })),
                ...enemies.map((e: any) => ({ id: e.id, speed: e.stats.speed })),
            ].sort((a: any, b: any) => b.speed - a.speed);

            return {
                combat: { phase: "entering", enemies },
                turnQueue: all.map((x: any) => x.id),
                currentTurn: 0,
                battleIndex: 0,
                subMenuIndex: 0,
                encounterFieldIds: enemies.map((e: any) => e.id),
                battleStartPartyState: s.player.party.map((c: any) => ({
                    ...c,
                })),
                battleStartPosition: { ...s.player.pos },
            };
        }),

    // ===== Turn Management =====
    nextTurn: () =>
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        }),

    endPlayerTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        });

        setTimeout(() => {
            const s = get();
            if (["victory", "defeat", "idle"].includes(s.combat.phase))
                return;

            const nextId = s.turnQueue[s.currentTurn];
            const isPlayerTurn = s.player.party.some(
                (c: any) => c.id === nextId && c.stats.hp > 0
            );

            if (isPlayerTurn) {
                set({
                    combat: {
                        phase: "playerMenu",
                        enemies: enemiesInCombat(get()),
                    },
                });
            } else {
                get().startEnemyTelegraph();
            }
        }, 350);
    },

    endEnemyTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        });

        setTimeout(() => {
            const s = get();
            if (["victory", "defeat", "idle"].includes(s.combat.phase))
                return;

            const nextId = s.turnQueue[s.currentTurn];
            const isPlayerTurn = s.player.party.some(
                (c: any) => c.id === nextId && c.stats.hp > 0
            );

            if (isPlayerTurn) {
                set({
                    combat: {
                        phase: "playerMenu",
                        enemies: enemiesInCombat(get()),
                    },
                });
            } else {
                get().startEnemyTelegraph();
            }
        }, 350);
    },
});