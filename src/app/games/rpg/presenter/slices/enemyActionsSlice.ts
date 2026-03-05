// rpg/presenter/slices/enemyActionsSlice.ts
"use client";

import type { Telegraph } from "../../types/RpgTypes";
import { SKILLS } from "../../data/gameData";
import {
    aliveEnemies,
    enemiesInCombat,
    getEnemyById,
} from "../gameStoreHelpers";

export const enemyActionsSlice = (set: any, get: any) => ({
    // ===== Start Enemy Telegraph =====
    startEnemyTelegraph: () =>
        set((s: any) => {
            if (s.combat.phase === "idle") return s;

            const current = s.turnQueue[s.currentTurn];
            const enemy = enemiesInCombat(s).find((e: any) => e.id === current);
            if (!enemy) return s;

            setTimeout(() => get().processStatusEffects(enemy.id), 100);

            // Check if stunned
            const isStunned = enemy.statusEffects.some(
                (e: any) => e.type === "stun" || e.type === "freeze"
            );
            if (isStunned) {
                setTimeout(() => {
                    get().spawnPopup({
                        side: "enemy",
                        text: "Can't Move!",
                        color: "#60a5fa",
                    });
                    get().endEnemyTurn();
                }, 800);
                return s;
            }

            // Check if any allies alive
            const alive = s.player.party.filter((c: any) => c.stats.hp > 0);

            if (alive.length === 0) {
                setTimeout(() => get().checkCombatEnd(), 100);
                return s;
            }

            // Select random target and skill
            const target =
                alive[Math.floor(Math.random() * alive.length)];
            const usedSkill =
                enemy.skills[Math.floor(Math.random() * enemy.skills.length)];

            const now = performance.now();
            const tele: Telegraph = {
                startAt: now,
                hitAt: now + 900,
                endAt: now + 1300,
            };

            // Auto-fail if not defended in time
            const timeoutId = setTimeout(() => {
                const st = get();
                if (
                    st.combat.phase === "defenseWindow" &&
                    performance.now() > st.combat.telegraph.endAt
                ) {
                    get().resolveEnemyAttack("fail");
                }
            }, tele.endAt - now + 20);

            return {
                combat: {
                    phase: "defenseWindow",
                    enemies: enemiesInCombat(s),
                    enemyId: enemy.id,
                    action: {
                        type: "skill",
                        actorId: enemy.id,
                        targetId: target.id,
                        skillId: usedSkill,
                    },
                    telegraph: tele,
                    showDefenseUi: true,
                },
                defenseTimeoutId: timeoutId,
            };
        }),

    // ===== Attempt Parry =====
    attemptParry: () => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        const ok =
            Math.abs(performance.now() - st.combat.telegraph.hitAt) <= 90;
        if (ok) {
            if (st.defenseTimeoutId) {
                clearTimeout(st.defenseTimeoutId);
            }

            set({
                combat: {
                    phase: "enemyResolve",
                    enemies: st.combat.enemies,
                    enemyId: st.combat.enemyId!,
                    action: st.combat.action!,
                    effectMessage: "Perfect Parry!",
                },
                defenseTimeoutId: null,
            });
            get().resolveEnemyAttack("parry");
        }
    },

    // ===== Attempt Dodge =====
    attemptDodge: () => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        const ok =
            Math.abs(performance.now() - st.combat.telegraph.hitAt) <= 180;
        if (ok) {
            if (st.defenseTimeoutId) {
                clearTimeout(st.defenseTimeoutId);
            }

            set({
                combat: {
                    ...st.combat,
                    showDefenseUi: false,
                },
                defenseTimeoutId: null,
            });
            get().resolveEnemyAttack("dodge");
        }
    },

    // ===== Resolve Enemy Attack =====
    resolveEnemyAttack: (defense = "fail") => {
        const s = get();
        if (
            s.combat.phase !== "defenseWindow" &&
            s.combat.phase !== "enemyResolve"
        )
            return;

        const enemy =
            s.combat.phase === "enemyResolve"
                ? getEnemyById(s, (s.combat as any).enemyId)!
                : getEnemyById(s, s.combat.enemyId)!;

        const action =
            s.combat.phase === "enemyResolve"
                ? (s.combat as any).action!
                : s.combat.action!;

        const target = s.player.party.find((c: any) => c.id === action.targetId);

        if (target) {
            const duration = defense === "parry" ? 1400 : 800;
            get().startAttackMotion(enemy.id, target.id, "enemy", duration);
        }

        get().triggerSwing(enemy.id, 550);

        if (!target) {
            get().endEnemyTurn();
            return;
        }

        let dmg = 0;
        let msg = "";

        // ===== Parry Handling =====
        if (defense === "parry") {
            const SLOW_DURATION = 2000;
            const SCALE = 0.3;

            get().triggerAnimatedAction(target.id, "parry", 400);

            const counter = Math.max(
                1,
                Math.round(target.stats.atk * 0.8 - enemy.stats.def * 0.3)
            );

            setTimeout(() => {
                get().triggerAnimatedAction(target.id, "attack", 500);

                const enemies = enemiesInCombat(get());
                const enemyIndex = enemies.findIndex(
                    (e: any) => e.id === enemy.id
                );
                if (enemyIndex >= 0) {
                    const enemyCount = enemies.length;
                    const enemySpacing = 1.8;
                    const x =
                        (enemyIndex - (enemyCount - 1) / 2) * enemySpacing;
                    get().spawnHitEffect([x, 1.5, 4.5], "#44ff88");
                }

                get().applyDamage(enemy.id, counter);
                get().gainEther(target.id, 1);
                get().triggerFX("player", 2.4);
                get().spawnPopup({
                    side: "enemy",
                    text: `-${counter}`,
                    color: "#ef4444",
                });
            }, 420);

            msg = "Perfect Parry! +1 Ether";

            get().triggerSlowMotion(SLOW_DURATION, SCALE, () => {
                get().checkCombatEnd();
                const currentPhase = get().combat.phase;

                if (
                    currentPhase !== "victory" &&
                    currentPhase !== "defeat"
                ) {
                    set((state: any) => ({
                        combat: {
                            phase: "enemyResolve",
                            enemies: enemiesInCombat(state),
                            enemyId: enemy.id,
                            action,
                            effectMessage: msg,
                        },
                    }));

                    setTimeout(() => get().endEnemyTurn(), 600);
                }
            });

            return;
        } else if (defense === "dodge") {
            msg = "Dodged!";
            get().triggerFX("player", 1.4);
            get().spawnPopup({
                side: "ally",
                charId: target.id,
                text: "DODGE",
                color: "#a3e635",
            });
        } else {
            // ===== Normal Damage =====
            const sk = action.skillId ? SKILLS[action.skillId] : undefined;
            const base = sk
                ? sk.damage + enemy.stats.atk * 0.5
                : enemy.stats.atk;
            dmg = Math.max(1, Math.round(base - target.stats.def * 0.5));

            if (dmg > 0) {
                const party = get()
                    .player.party.filter((c: any) => c.stats.hp > 0);
                const targetIndex = party.findIndex(
                    (c: any) => c.id === target.id
                );
                if (targetIndex >= 0) {
                    const partySpacing = 2.2;
                    const x =
                        (targetIndex - (party.length - 1) / 2) * partySpacing;
                    get().spawnHitEffect([x, 1.5, -4.5], "#ff4444");
                }

                get().applyDamage(target.id, dmg);
                get().triggerFX("enemy");
                get().spawnPopup({
                    side: "ally",
                    charId: target.id,
                    text: `-${dmg}`,
                    color: "#f87171",
                });

                if (sk?.statusEffect) {
                    get().applyStatusEffect(target.id, sk.statusEffect);
                    get().spawnPopup({
                        side: "ally",
                        charId: target.id,
                        text: `${sk.statusEffect.type}!`,
                        color: "#a78bfa",
                    });
                }
            }
        }

        setTimeout(() => {
            get().checkCombatEnd();
            const currentPhase = get().combat.phase;

            if (
                currentPhase !== "victory" &&
                currentPhase !== "defeat"
            ) {
                set((state: any) => ({
                    combat: {
                        phase: "enemyResolve",
                        enemies: enemiesInCombat(state),
                        enemyId: enemy.id,
                        action,
                        effectMessage: msg,
                    },
                }));

                setTimeout(() => get().endEnemyTurn(), 600);
            }
        }, 100);
    },
});