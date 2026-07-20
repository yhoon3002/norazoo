// rpg/presenter/slices/turnSlice.ts
"use client";

import type { CombatState, Enemy, SaveData } from "../../types/RpgTypes";
import { SKILLS, SKILL_ANIMATIONS } from "../../data/gameData";
import {
    aliveEnemies,
    enemiesInCombat,
    getEnemyById,
    findNextAliveIndex,
    effectiveStat,
} from "../gameStoreHelpers";

export const turnSlice = (set: any, get: any) => ({
    // ===== Turn Management =====
    nextTurn: () =>
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        }),

    // 다음 턴 시작 공통 처리 — 플레이어 턴이면 상태이상 틱(DoT)·스턴 턴스킵까지 수행
    beginNextTurn: () => {
        const s = get();
        if (["victory", "defeat", "idle"].includes(s.combat.phase)) return;

        const nextId = s.turnQueue[s.currentTurn];
        const isPlayerTurn = s.player.party.some(
            (c: any) => c.id === nextId && c.stats.hp > 0
        );

        if (!isPlayerTurn) {
            get().startEnemyTelegraph();
            return;
        }

        // 스턴 여부는 틱(지속시간 감소) 전에 판정
        const char = s.player.party.find((c: any) => c.id === nextId);
        const stunned = char?.statusEffects.some(
            (e: any) => e.type === "stun" || e.type === "freeze"
        );
        get().processStatusEffects(nextId);

        // DoT로 사망/전투 종료 가능
        const phase = get().combat.phase;
        if (phase === "victory" || phase === "defeat") return;
        const after = get().player.party.find((c: any) => c.id === nextId);
        if (!after || after.stats.hp <= 0) {
            get().endPlayerTurn();
            return;
        }

        if (stunned) {
            get().spawnPopup({
                side: "ally",
                charId: nextId,
                text: "Can't Move!",
                color: "#60a5fa",
            });
            setTimeout(() => get().endPlayerTurn(), 700);
            return;
        }

        set({
            combat: {
                phase: "playerMenu",
                enemies: enemiesInCombat(get()),
            },
        });
    },

    endPlayerTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        });

        setTimeout(() => get().beginNextTurn(), 350);
    },

    endEnemyTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return { currentTurn: next };
        });

        setTimeout(() => get().beginNextTurn(), 350);
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

                    const actorAtk = effectiveStat(actor, "atk") || 0;
                    const base = (sk.damage || 0) + actorAtk * 0.5;

                    const applyToEnemy = (enemyId: string) => {
                        const enemy = getEnemyById(get(), enemyId);
                        if (!enemy) return;
                        const damage = Math.max(
                            1,
                            Math.round(
                                base * (1.05 + bonus) -
                                    effectiveStat(enemy, "def") * 0.3
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
                                charId: enemyId,
                                text: `${sk.statusEffect.type}!`,
                                color: "#a78bfa",
                            });
                        }

                        get().triggerFX("player", ok ? 2 : 1);
                        get().spawnPopup({
                            side: "enemy",
                            charId: enemyId,
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
                    // 드랍 확률 롤 적용
                    if (e.rewards.items)
                        e.rewards.items.forEach((i: any) => {
                            if (Math.random() < (i.chance ?? 1))
                                acc.items.push(i.id);
                        });
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
                    // 복귀 위치가 적 접촉 반경 안일 수 있으므로 잠시 무적 (즉시 재조우 방지)
                    encounterCooldownUntil: performance.now() + 3000,
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
        set((s: any) => ({
            player: d.player,
            world: d.world,
            flags: d.flags,
            bag: d.bag,
            quests: d.quests || [],
            treasures: d.treasures || [],
            story: (d as any).story ?? s.story, // 구버전 세이브 호환
            dialogue: [],
            combat: { phase: "idle" },
            turnQueue: [],
            currentTurn: 0,
            popups: [],
        })),

    snapshot: () => {
        const s = get();
        return {
            version: 1 as const,
            player: s.player,
            world: s.world,
            flags: s.flags,
            bag: s.bag,
            quests: s.quests,
            treasures: s.treasures,
            story: s.story,
            unlockedSkills: [],
            unlockedEquipment: [],
        };
    },
});