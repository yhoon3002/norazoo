// rpg/presenter/slices/turnSlice.ts
"use client";

import type { BossPhase, CombatState, Enemy, SaveData } from "../../types/RpgTypes";
import { SKILLS, SKILL_ANIMATIONS, STARTING_EQUIPMENT_IDS, ENEMY_TEMPLATES } from "../../data/gameData";
import { bossPhaseIndex } from "../bossHelpers";
import {
    aliveEnemies,
    enemiesInCombat,
    getEnemyById,
    findNextAliveIndex,
    effectiveStat,
    buildTurnQueue,
    rollDamage,
    startingEther,
} from "../gameStoreHelpers";

// 다음 턴 인덱스가 현재 인덱스보다 앞서지 않으면(모듈로 wrap) 한 라운드가 끝난 것 —
// 라운드 경계마다 현재 유효 speed(속도 버프 반영)로 턴 큐를 재정렬한다.
// s.turnQueue/s.currentTurn과 next를 받아 { turnQueue?, currentTurn } partial을 반환.
function advanceTurnOrRewrap(s: any, next: number) {
    if (next > s.currentTurn) return { currentTurn: next };
    const queue = buildTurnQueue(s);
    if (queue.length === 0) return { currentTurn: next };
    return { turnQueue: queue, currentTurn: 0 };
}

export type BossPhaseMergeBase = {
    skills: string[];
    aiPattern: Enemy["aiPattern"];
    tint?: string;
    scale?: number;
};

export type BossPhaseMergeResult = BossPhaseMergeBase & {
    announce?: string;
};

// 단일 히트로 여러 페이즈 임계(cur+1..next)를 동시에 통과할 때 중간 페이즈의
// skills/aiPattern/tint/scaleMul이 유실되지 않도록 순서대로 순회 병합한다.
// - skills/aiPattern/tint/scaleMul: 각 페이즈에서 값이 정의된 경우에만 덮어쓰고
//   (미정의면 이전 값 유지), scaleMul은 매번 baseScale(템플릿 기준 스케일) 기준으로
//   절대값을 재계산한다(페이즈 간 누적 곱이 아님 — 기존 단일 페이즈 로직과 동일 의미).
// - announce: 중간 페이즈 announce까지 모두 띄우면 스팸이므로, 최종 도달 페이즈
//   (next)의 announce 1개만 채택한다(의도된 선택 — 중간 페이즈 announce는 버려짐).
export function mergeBossPhases(
    base: BossPhaseMergeBase,
    phases: BossPhase[],
    cur: number,
    next: number,
    baseScale: number
): BossPhaseMergeResult {
    let skills = base.skills;
    let aiPattern = base.aiPattern;
    let tint = base.tint;
    let scale = base.scale;

    for (let i = cur + 1; i <= next; i++) {
        const ph = phases[i];
        if (ph.skills) skills = ph.skills;
        if (ph.aiPattern) aiPattern = ph.aiPattern;
        if (ph.tint) tint = ph.tint;
        if (ph.scaleMul) scale = baseScale * ph.scaleMul;
    }

    return { skills, aiPattern, tint, scale, announce: phases[next].announce };
}

export const turnSlice = (set: any, get: any) => ({
    // ===== Turn Management =====
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
            return advanceTurnOrRewrap(s, next);
        });

        setTimeout(() => get().beginNextTurn(), 350);
    },

    endEnemyTurn: () => {
        set((s: any) => {
            if (s.turnQueue.length === 0) return s;
            const next = findNextAliveIndex(s, s.currentTurn);
            return advanceTurnOrRewrap(s, next);
        });

        setTimeout(() => get().beginNextTurn(), 350);
    },

    // ===== Apply Damage =====
    applyDamage: (id: string, dmg: number) => {
        // 보스 페이즈 전이 선언 연출(팝업/FX)은 set 콜백의 순수성을 지키기 위해
        // set 완료 후 액션 말미에 처리 — combatSlice.startCombat의 cookedBuffs 패턴과 동일
        let phaseAnnounce: string | undefined;
        let phaseTransitioned = false;

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
                        const newHp = Math.max(0, enemy.stats.hp - dmg);
                        let newEnemy: Enemy = {
                            ...enemy,
                            stats: {
                                ...enemy.stats,
                                hp: newHp,
                            },
                        };

                        // 보스 페이즈 전이 — hp 임계 통과 시 스킬셋/패턴/비주얼 교체 + 선언 연출.
                        // 단일 히트로 여러 임계를 동시에 통과할 수 있으므로 cur+1..next를
                        // mergeBossPhases로 순서대로 순회 병합한다(중간 페이즈 유실 방지).
                        if (enemy.boss) {
                            const ratio = newHp / enemy.stats.maxHp;
                            const next = bossPhaseIndex(ratio, enemy.boss.phases);
                            const cur = enemy.phase ?? -1;
                            if (next > cur) {
                                const merged = mergeBossPhases(
                                    {
                                        skills: newEnemy.skills,
                                        aiPattern: newEnemy.aiPattern,
                                        tint: newEnemy.tint,
                                        scale: newEnemy.scale,
                                    },
                                    enemy.boss.phases,
                                    cur,
                                    next,
                                    ENEMY_TEMPLATES[enemy.template!]?.scale ?? 1
                                );
                                newEnemy = {
                                    ...newEnemy,
                                    phase: next,
                                    skills: merged.skills,
                                    aiPattern: merged.aiPattern,
                                    tint: merged.tint,
                                    scale: merged.scale,
                                };
                                phaseTransitioned = true;
                                phaseAnnounce = merged.announce;
                            }
                        }

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

        // 보스 페이즈 전이 선언 연출 — set 완료 후(액션 말미) 부수효과 적용
        if (phaseTransitioned) {
            if (phaseAnnounce)
                get().spawnPopup({ side: "enemy", text: phaseAnnounce, color: "#f87171" });
            get().triggerFX("enemy", 1);
        }
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

                // 스킬 실효(QTE 성공) 지점 — 기술 도감 기록
                if (!s.unlockedSkills.includes(sk.id)) {
                    set((st: any) => ({
                        unlockedSkills: [...st.unlockedSkills, sk.id],
                    }));
                }

                const skillAnim = SKILL_ANIMATIONS[sk.id] || "attack";

                // ===== Heal/Buff Skills =====
                if (sk.type === "heal" || sk.type === "buff") {
                    get().triggerAnimatedAction(actor.id, skillAnim, 900);

                    const healVal = Math.abs(sk.damage || 0);
                    let targetIdList: string[] = [];
                    if (sk.targetType === "all" && action.targetIds) {
                        targetIdList = action.targetIds;
                        if (sk.damage !== 0) {
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
                        }
                    } else {
                        const tId = action.targetId ?? actor.id;
                        targetIdList = [tId];
                        if (sk.damage !== 0) {
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
                    }

                    if (sk.statusEffect) {
                        for (const tid of targetIdList) {
                            get().applyStatusEffect(tid, sk.statusEffect);
                            get().spawnPopup({
                                side: "ally",
                                charId: tid,
                                text: `${sk.statusEffect.type}!`,
                                color: "#a78bfa",
                            });
                        }
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
                        const raw = Math.max(
                            1,
                            Math.round(
                                base * (1.05 + bonus) -
                                    effectiveStat(enemy, "def") * 0.3
                            )
                        );
                        const { damage, crit } = rollDamage(
                            get(),
                            actor,
                            enemy,
                            raw
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
                                    : sk.element === "earth"
                                    ? "#b45309"
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
                        if (crit) {
                            get().spawnPopup({
                                side: "enemy",
                                charId: enemyId,
                                text: "💥 치명타!",
                                color: "#f97316",
                            });
                        }
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

    // ===== Flee Battle (도주 성공 전용 정리) =====
    // victory/defeat 어느 쪽도 아닌 도주 전용 경로 — 보상 지급·defeated_ 플래그 기록 없이
    // 파티 ether/statusEffects만 승리 규약과 동일하게 정리하고 필드로 즉시 복귀한다.
    // (flags를 건드리지 않으므로 StoryTriggers의 battleUnwon 판정이 그대로 유지돼
    //  스토리 전투 도주 후 재발동이 가능하다.)
    fleeBattle: () =>
        set((s: any) => {
            const restoredParty = s.player.party.map((c: any) => ({
                ...c,
                ether: startingEther(c),
                statusEffects: [],
            }));

            return {
                player: { ...s.player, party: restoredParty },
                combat: { phase: "idle" },
                turnQueue: [],
                currentTurn: 0,
                encounterFieldIds: undefined,
                popups: [],
                battleStartPartyState: undefined,
                battleStartPosition: undefined,
                lastEncounterGroup: undefined,
                // 도주 직후 스폰 인접 재조우 루프 방지 — 패배 복귀와 동일한 무적 유예
                encounterCooldownUntil: performance.now() + 2500,
            };
        }),

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
                enemiesInCombat(s).forEach((e: any) => {
                    if (e.template) get().addKill(e.template);
                });

                // gainExp가 nested set()으로 exp/레벨업을 이미 반영했으므로, 여기서
                // s.player.party(호출 당시의 stale snapshot)를 쓰면 그 갱신이 병합 시 되돌아간다.
                // get().player.party로 최신 상태를 읽어야 exp/레벨업이 유지된다.
                const restoredParty = get().player.party.map((c: any) => ({
                    ...c,
                    ether: startingEther(c),
                    // 전투 한정 버프/상태는 승리 종료 시 소멸 — 비약(99턴)이 다음 전투로 이월되는 것 방지
                    statusEffects: [],
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
                    lastEncounterGroup: undefined,
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
                    lastEncounterGroup: undefined,
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
                lastEncounterGroup: undefined,
            };
        }),

    // ===== Save/Load =====
    applySave: (d: SaveData) =>
        set((s: any) => ({
            player: d.player,
            world: d.world,
            flags: d.flags,
            bag: d.bag,
            treasures: d.treasures || [],
            unlockedSkills: d.unlockedSkills ?? [],
            // 구세이브(활성화 이전, 빈 배열 저장)가 시작 장비 시드를 지우지 않도록 합집합 복원:
            // 저장분 ∪ 시작 7종 ∪ 현재 착용 장비(base id)
            unlockedEquipment: Array.from(new Set([
                ...(d.unlockedEquipment ?? []),
                ...STARTING_EQUIPMENT_IDS,
                ...d.player.party.flatMap((c: any) =>
                    Object.values(c.equipment ?? {}).filter(Boolean).map((id: any) => String(id).replace(/_p[1-5]$/, ""))
                ),
            ])),
            story: (d as any).story ?? s.story, // 구버전 세이브 호환
            killCounts: (d as any).counters ?? {},
            dialogue: [],
            // 대사 종료 대기 중이던 스토리 전투 예약도 함께 초기화 —
            // 안 그러면 새 타임라인에서 엉뚱한 전투가 다음 대사 종료 시 발동한다.
            pendingStoryBattle: null,
            // 컷신도 로드와 함께 정리 — 구 타임라인의 battle 스텝이 새 상태에서 발동하는 것 방지
            cutscene: null,
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
            treasures: s.treasures,
            story: s.story,
            counters: s.killCounts,
            unlockedSkills: s.unlockedSkills ?? [],
            unlockedEquipment: s.unlockedEquipment ?? [],
        };
    },
});