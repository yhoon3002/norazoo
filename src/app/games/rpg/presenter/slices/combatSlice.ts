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
    // 다단 히트 방어 상태 (유닛별 공격 프로필)
    defenseHitIndex: 0,
    defenseResults: [] as Array<"parry" | "dodge" | "fail">,
    defenseSpent: false, // 현재 히트에 이른 입력을 해서 방어권 소진(연타 방지)
    defenseTimeoutIds: [] as NodeJS.Timeout[],
    // 패배 복귀 직후 재조우 방지 무적 시간 (performance.now 기준)
    encounterCooldownUntil: 0,

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
    startCombat: (payload: any) => {
        // ether 버프는 즉시 효과라 set() 밖에서 처리 — set 콜백 안에서 채워 넣는다
        let cookedBuffs: Array<{ type: string; value: number; duration: number }> = [];

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
                return { id: fieldId, template, ...tpl };
            });

            // 요리 버프 소비 — 파티 전원 statusEffects에 부여, ether는 즉시(아래 set 이후 처리)
            const buffs = (get() as any).consumePendingBuffs?.() ?? [];
            cookedBuffs = buffs;
            const statusBuffs = buffs.filter((b: any) => b.type !== "ether");
            const party = s.player.party.map((c: any) => ({
                ...c,
                statusEffects: [
                    ...c.statusEffects,
                    ...statusBuffs.map((b: any) => ({
                        type: b.type,
                        duration: b.duration,
                        value: b.value,
                    })),
                ],
            }));

            // 유효 speed = stats.speed + Σ(speed 버프) — 요리 버프가 턴 순서에도 반영되도록
            const effSpeed = (u: any) =>
                u.stats.speed +
                u.statusEffects
                    .filter((e: any) => e.type === "speed")
                    .reduce((sum: number, e: any) => sum + e.value, 0);

            const all = [
                ...party
                    .filter((c: any) => c.stats.hp > 0)
                    .map((c: any) => ({ id: c.id, speed: effSpeed(c) })),
                ...enemies.map((e: any) => ({ id: e.id, speed: effSpeed(e) })),
            ].sort((a: any, b: any) => b.speed - a.speed);

            return {
                combat: { phase: "entering", enemies },
                turnQueue: all.map((x: any) => x.id),
                currentTurn: 0,
                battleIndex: 0,
                subMenuIndex: 0,
                player: { ...s.player, party },
                // 방어 튜토리얼은 "처음 실행된 전투" 한 판만 — 다음 전투부터는 종료 확정
                defenseTutorial: null,
                flags:
                    s.flags.defense_tutorial_started &&
                    !s.flags.defense_tutorial_done
                        ? { ...s.flags, defense_tutorial_done: true }
                        : s.flags,
                encounterFieldIds: enemies.map((e: any) => e.id),
                // 재도전(다시하기) 시 이름 추론 없이 실제 인카운터 구성을 복원하기 위한 스냅샷 — 세이브엔 포함하지 않음
                lastEncounterGroup: group as Array<{
                    template: string;
                    fieldId: string;
                }>,
                // 요리로 버프가 부여되기 전(패배 시 복귀 기준) 파티 스냅샷
                battleStartPartyState: s.player.party.map((c: any) => ({
                    ...c,
                })),
                battleStartPosition: { ...s.player.pos },
            };
        });

        // ether 버프는 즉시 섭취 효과 — set 완료 직후(액션 말미) 적용
        for (const b of cookedBuffs.filter((x: any) => x.type === "ether"))
            for (const c of get().player.party) get().gainEther(c.id, b.value);
    },

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