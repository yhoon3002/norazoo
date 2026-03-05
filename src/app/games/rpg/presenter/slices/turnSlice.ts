// rpg/presenter/slices/turnSlice.ts
"use client";

import type { CombatState, Enemy, SaveData } from "../../types/RpgTypes";
import { SKILLS, SKILL_ANIMATIONS } from "../../data/gameData";
import {
    aliveEnemies,
    enemiesInCombat,
    getEnemyById,
} from "../gameStoreHelpers";

export const turnSlice = (set: any, get: any) => ({
    // ===== Turn Management =====
    nextTurn: () =>
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = get().findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        }),

    endPlayerTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = get().findNextAliveIndex(s, s.currentTurn);
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
            const next = get().findNextAliveIndex(s, s.currentTurn);
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

    // ===== Apply Damage =====
    applyDamage: (id: string, dmg: number) => {
        set((s: any) => {
            const newState = { ...s };

            // Enemy damage
            if (s.combat.phase !== "idle") {
                const currentCombat = s.combat as any;
                if (currentCombat.enemies) {
                    const enemies = [...currentCombat.enemies] as Enemy[];
                    const enemyIndex = enemies.findIndex((e) => e.id === id);

                    if (enemyIndex >= 0) {
                        const enemy = enemies[enemyIndex];
                        const newEnemy = {
                            ...enemy,
                            stats: {
                                ...enemy.stats,
                                hp: Math.max(0, enemy.stats.hp - dmg),
                            },
                        };

                        const newEnemies = [...enemies];
                        newEnemies[enemyIndex] = newEnemy;

                        let newCombat: CombatState;

                        if (s.combat.phase === "playerMenu") {
                            newCombat = {
                                phase: "playerMenu",
                                enemies: newEnemies,
                            };
                        } else if (s.combat.phase === "targetSelect") {
                            newCombat = {
                                phase: "targetSelect",
                                enemies: newEnemies,
                                pending: currentCombat.pending,
                                allowedTargets: currentCombat.allowedTargets,
                                index: currentCombat.index,
                            };
                        } else if (s.combat.phase === "turnEnd") {
                            newCombat = {
                                phase: "turnEnd",
                                enemies: newEnemies,
                            };
                        } else if (s.combat.phase === "defenseWindow") {
                            newCombat = {
                                phase: "defenseWindow",
                                enemies: newEnemies,
                                enemyId: currentCombat.enemyId,
                                action: currentCombat.action,
                                telegraph: currentCombat.telegraph,
                            };
                        } else if (s.combat.phase === "enemyResolve") {
                            newCombat = {
                                phase: "enemyResolve",
                                enemies: newEnemies,
                                enemyId: currentCombat.enemyId,
                                action: currentCombat.action,
                                effectMessage: currentCombat.effectMessage,
                            };
                        } else {
                            newCombat = {
                                ...s.combat,
                                enemies: newEnemies,
                            } as CombatState;
                        }

                        newState.combat = newCombat;
                        return newState;
                    }
                }
            }

            // Allied damage
            const partyIndex = s.player.party.findIndex(
                (c: any) => c.id === id
            );
            if (partyIndex >= 0) {
                const character = s.player.party[partyIndex];
                const newCharacter = {
                    ...character,
                    stats: {
                        ...character.stats,
                        hp: Math.max(0, character.stats.hp - dmg),
                    },
                };

                const newParty = [...s.player.party];
                newParty[partyIndex] = newCharacter;

                newState.player = {
                    ...s.player,
                    party: newParty,
                };

                return newState;
            }

            return s;
        });
    },

    // ===== Resolve Player Action (After QTE) =====
    resolvePlayerAction: (ok: boolean, bonus = 0) =>
        set((s: any) => {
            if (s.combat.phase !== "playerQTE") return s;

            const { action } = s.combat;
            const actor = s.player.party.find(
                (c: any) => c.id === action.actorId
            );
            if (!actor) return s;

            const sk = action.skillId ? SKILLS[action.skillId] : undefined;

            if (action.type === "skill" && sk) {
                if (!ok) {
                    get().spawnPopup({
                        side: "ally",
                        charId: actor.id,
                        text: "MISS",
                        color: "#f59e0b",
                    });
                    setTimeout(() => {
                        if (
                            !["victory", "defeat"].includes(get().combat.phase)
                        )
                            get().endPlayerTurn();
                    }, 450);
                    return {
                        combat: {
                            phase: "turnEnd",
                            enemies: enemiesInCombat(s),
                        },
                    };
                }

                const skillAnim = SKILL_ANIMATIONS[sk.id] || "attack";

                // ===== Heal/Buff Skills =====
                if (sk.type === "heal" || sk.type === "buff") {
                    get().triggerAnimatedAction(actor.id, skillAnim, 900);

                    const healVal = Math.abs(sk.damage || 0);
                    if (sk.targetType === "all" && action.targetIds) {
                        const party = s.player.party.map((c: any) =>
                            action.targetIds!.includes(c.id)
                                ? {
                                      ...c,
                                      stats: {
                                          ...c.stats,
                                          hp: Math.min(
                                              c.stats.maxHp,
                                              c.stats.hp +
                                                  healVal * (1.1 + bonus)
                                          ),
                                      },
                                  }
                                : c
                        );
                        get().spawnPopup({
                            side: "ally",
                            text: "+ALL",
                            color: "#22c55e",
                        });
                        set({ player: { ...s.player, party } });
                    } else {
                        const tId = action.targetId ?? actor.id;
                        const party = s.player.party.map((c: any) =>
                            c.id === tId
                                ? {
                                      ...c,
                                      stats: {
                                          ...c.stats,
                                          hp: Math.min(
                                              c.stats.maxHp,
                                              c.stats.hp +
                                                  healVal * (1.2 + bonus)
                                          ),
                                      },
                                  }
                                : c
                        );
                        get().spawnPopup({
                            side: "ally",
                            charId: tId,
                            text: `+${healVal}`,
                            color: "#22c55e",
                        });
                        set({ player: { ...s.player, party } });
                    }
                } else {
                    // ===== Damage Skills =====
                    const targetId =
                        action.targetId || aliveEnemies(s)[0]?.id;
                    if (targetId) {
                        get().startAttackMotion(actor.id, targetId, "player");
                    }

                    get().triggerAnimatedAction(actor.id, skillAnim, 1000);

                    const actorAtk = actor.stats.atk || 0;
                    const base = (sk.damage || 0) + actorAtk * 0.5;

                    const applyToEnemy = (enemyId: string) => {
                        const enemy = getEnemyById(get(), enemyId);
                        if (!enemy) return;
                        const damage = Math.max(
                            1,
                            Math.round(
                                base * (1.05 + bonus) - enemy.stats.def * 0.3
                            )
                        );

                        const enemies = enemiesInCombat(get());
                        const enemyIndex = enemies.findIndex(
                            (e) => e.id === enemyId
                        );
                        if (enemyIndex >= 0) {
                            const enemyCount = enemies.length;
                            const enemySpacing = 1.8;
                            const x =
                                (enemyIndex - (enemyCount - 1) / 2) *
                                enemySpacing;
                            const color =
                                sk.element === "fire"
                                    ? "#ff4400"
                                    : sk.element === "ice"
                                    ? "#44ddff"
                                    : sk.element === "lightning"
                                    ? "#ffff00"
                                    : "#aa44ff";
                            get().spawnHitEffect([x, 1.5, 4.5], color);
                        }

                        get().applyDamage(enemyId, damage);

                        if (sk.statusEffect) {
                            get().applyStatusEffect(enemyId, sk.statusEffect);
                            get().spawnPopup({
                                side: "enemy",
                                text: `${sk.statusEffect.type}!`,
                                color: "#a78bfa",
                            });
                        }

                        get().triggerFX("player", ok ? 2 : 1);
                        get().spawnPopup({
                            side: "enemy",
                            text: `-${damage}`,
                            color: "#ef4444",
                        });
                    };

                    if (sk.targetType === "all") {
                        aliveEnemies(get()).forEach((e) =>
                            applyToEnemy(e.id)
                        );
                    } else if (action.targetId) {
                        applyToEnemy(action.targetId);
                    }
                }
            }

            get().checkCombatEnd();
            const phaseAfter = get().combat.phase;
            if (phaseAfter === "victory" || phaseAfter === "defeat")
                return {};

            setTimeout(() => {
                if (
                    !["victory", "defeat"].includes(get().combat.phase)
                )
                    get().endPlayerTurn();
            }, 900);

            return {
                combat: {
                    phase: "turnEnd",
                    enemies: enemiesInCombat(get()),
                },
            };
        }),

    // ===== Check Combat End =====
    checkCombatEnd: () => {
        const st = get();
        if (st.combat.phase === "idle") return;
        const stillAlive = aliveEnemies(st);
        if (stillAlive.length === 0) {
            const all = enemiesInCombat(st);
            const rewards = all.reduce(
                (acc: any, e: any) => {
                    acc.exp += e.rewards.exp;
                    acc.gold += e.rewards.gold;
                    if (e.rewards.items)
                        acc.items.push(...e.rewards.items.map((i: any) => i.id));
                    return acc;
                },
                { exp: 0, gold: 0, items: [] as string[] }
            );
            set({
                combat: {
                    phase: "victory",
                    enemies: all,
                    rewards,
                },
            });
            return;
        }
        if (st.player.party.every((c: any) => c.stats.hp <= 0)) {
            set({
                combat: {
                    phase: "defeat",
                    enemies: enemiesInCombat(st),
                },
            });
        }
    },

    // ===== Exit Battle =====
    exitBattle: () =>
        set((s: any) => {
            if (s.combat.phase === "victory") {
                const r = (s.combat as any).rewards!;
                const gold = s.player.gold + r.gold;
                const alive = s.player.party.filter(
                    (c: any) => c.stats.hp > 0
                );
                const per = Math.floor(
                    r.exp / Math.max(1, alive.length)
                );
                alive.forEach((c: any) => get().gainExp(c.id, per));
                r.items.forEach((id: string) => get().addItem(id, 1));
                const defeatedIds =
                    s.encounterFieldIds ||
                    enemiesInCombat(s).map((e: any) => e.id);
                const newFlags = { ...s.flags };
                defeatedIds.forEach(
                    (id: any) => (newFlags[`defeated_${id}`] = true)
                );

                const restoredParty = s.player.party.map((c: any) => ({
                    ...c,
                    ether: 3,
                }));

                return {
                    player: { ...s.player, gold, party: restoredParty },
                    combat: { phase: "idle" },
                    flags: newFlags,
                    turnQueue: [],
                    currentTurn: 0,
                    encounterFieldIds: undefined,
                    popups: [],
                    battleStartPartyState: undefined,
                    battleStartPosition: undefined,
                };
            }

            if (s.combat.phase === "defeat") {
                const restoredParty =
                    s.battleStartPartyState || s.player.party;
                const restoredPosition =
                    s.battleStartPosition || s.player.pos;

                return {
                    player: {
                        ...s.player,
                        party: restoredParty.map((c: any) => ({ ...c })),
                        pos: { ...restoredPosition },
                    },
                    combat: { phase: "idle" },
                    turnQueue: [],
                    currentTurn: 0,
                    encounterFieldIds: undefined,
                    popups: [],
                    battleStartPartyState: undefined,
                    battleStartPosition: undefined,
                };
            }

            return {
                combat: { phase: "idle" },
                turnQueue: [],
                currentTurn: 0,
                encounterFieldIds: undefined,
                popups: [],
                battleStartPartyState: undefined,
                battleStartPosition: undefined,
            };
        }),

    // ===== Save/Load =====
    applySave: (d: SaveData) =>
        set({
            player: d.player,
            world: d.world,
            flags: d.flags,
            bag: d.bag,
            quests: d.quests || [],
            treasures: d.treasures || [],
            combat: { phase: "idle" },
            turnQueue: [],
            currentTurn: 0,
            popups: [],
        }),

    snapshot: () => {
        const s = get();
        return {
            version: 1,
            player: s.player,
            world: s.world,
            flags: s.flags,
            bag: s.bag,
            quests: s.quests,
            treasures: s.treasures,
            unlockedSkills: [],
            unlockedEquipment: [],
        };
    },
});