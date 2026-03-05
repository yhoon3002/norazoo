// rpg/presenter/slices/targetSlice.ts
"use client";

import { SKILLS } from "../../data/gameData";
import {
    aliveEnemies,
    getEnemyById,
    enemiesInCombat,
    calcBasicAttackDamage,
} from "../gameStoreHelpers";

export const targetSlice = (set: any, get: any) => ({
    // ===== Move Target Index =====
    moveTargetIndex: (d: number) =>
        set((s: any) => {
            if (s.combat.phase !== "targetSelect") return s;
            const n = s.combat.allowedTargets.length;
            const idx = (s.combat.index + d + n) % n;
            return { combat: { ...s.combat, index: idx } };
        }),

    // ===== Confirm Target =====
    confirmTarget: () => {
        const s = get();
        if (s.combat.phase !== "targetSelect") return;
        const targetId = s.combat.allowedTargets[s.combat.index];
        const pending = s.combat.pending;

        console.log(`=== Confirming target: ${targetId} for action:`, pending);

        // ===== Use Item =====
        if ("kind" in pending && pending.kind === "item") {
            get().useItem(pending.itemId, targetId);
            set({
                combat: { phase: "turnEnd", enemies: s.combat.enemies },
                battleSubMenu: [],
            });
            setTimeout(() => get().endPlayerTurn(), 450);
            return;
        }

        // ===== Basic Attack =====
        if (pending.type === "attack") {
            const actor = s.player.party.find(
                (c: any) => c.id === pending.actorId
            );
            const enemy = getEnemyById(s, targetId);

            if (!actor || !enemy) {
                set({
                    combat: {
                        phase: "playerMenu",
                        enemies: s.combat.enemies,
                    },
                    battleSubMenu: [],
                });
                return;
            }

            get().startAttackMotion(actor.id, targetId, "player");
            get().triggerAnimatedAction(actor.id, "attack", 800);

            const dmg = calcBasicAttackDamage(actor, enemy);

            setTimeout(() => {
                const enemies = enemiesInCombat(get());
                const enemyIndex = enemies.findIndex(
                    (e: any) => e.id === targetId
                );
                if (enemyIndex >= 0) {
                    const enemyCount = enemies.length;
                    const enemySpacing = 1.8;
                    const x =
                        (enemyIndex - (enemyCount - 1) / 2) * enemySpacing;
                    get().spawnHitEffect([x, 1.5, 4.5], "#ffaa00");
                }

                get().applyDamage(targetId, dmg);
                get().gainEther(actor.id, 1);
                get().triggerFX("player", 1.6);
                get().spawnPopup({
                    side: "enemy",
                    text: `-${dmg}`,
                    color: "#ef4444",
                });

                setTimeout(() => {
                    get().checkCombatEnd();
                    const currentPhase = get().combat.phase;

                    if (
                        currentPhase !== "victory" &&
                        currentPhase !== "defeat"
                    ) {
                        set((state: any) => ({
                            combat: {
                                phase: "turnEnd",
                                enemies: enemiesInCombat(state),
                            },
                            battleSubMenu: [],
                        }));

                        setTimeout(() => get().endPlayerTurn(), 600);
                    }
                }, 100);
            }, 500);

            return;
        }

        // ===== Use Skill =====
        const sk = pending.skillId ? SKILLS[pending.skillId] : undefined;
        if (!sk) {
            set({
                combat: { phase: "playerMenu", enemies: s.combat.enemies },
                battleSubMenu: [],
            });
            return;
        }

        if (!get().spendEther(pending.actorId, sk.etherCost)) {
            set({
                combat: { phase: "playerMenu", enemies: s.combat.enemies },
                battleSubMenu: [],
            });
            return;
        }

        const action = {
            type: "skill",
            actorId: pending.actorId,
            skillId: sk.id,
            targetId,
            qteType: "timing",
        };
        get().startPlayerQTE(action);
    },

    // ===== Cancel Targeting =====
    cancelTargeting: () =>
        set((s: any) => {
            if (s.combat.phase !== "targetSelect") return s;
            return {
                combat: {
                    phase: "playerMenu",
                    enemies: s.combat.enemies,
                },
                battleSubMenu: [],
            };
        }),
});