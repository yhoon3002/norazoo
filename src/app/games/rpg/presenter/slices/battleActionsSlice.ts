// rpg/presenter/slices/battleActionsSlice.ts
"use client";

import type { CombatAction, PendingAction } from "../../types/RpgTypes";
import { SKILLS } from "../../data/gameData";
import {
    QTE_PLANS,
    aliveEnemies,
    getEnemyById,
    enemiesInCombat,
    calcBasicAttackDamage,
} from "../gameStoreHelpers";

const popupSeq = 1;

export const battleActionsSlice = (set: any, get: any) => ({
    // ===== Confirm Selection =====
    confirmSelection: () => {
        const s = get();
        if (s.combat.phase !== "playerMenu") return;
        get().confirmSelectionAt(s.battleIndex);
    },

    confirmSelectionAt: (index: number) =>
        set((s: any) => {
            if (s.combat.phase !== "playerMenu") return s;
            const currentId = s.turnQueue[s.currentTurn];
            const actor = s.player.party.find((c: any) => c.id === currentId);
            if (!actor) return s;

            const choice = s.battleMenu[index];

            // ===== Attack =====
            if (choice === "Attack") {
                const aliveEnemyIds = aliveEnemies(s).map((e: any) => e.id);

                if (aliveEnemyIds.length === 0) return s;

                const labels = aliveEnemyIds.map((id: any) => {
                    const e = getEnemyById(s, id)!;
                    return `${e.name} (${e.stats.hp}/${e.stats.maxHp})`;
                });

                const pending: PendingAction = {
                    type: "attack",
                    actorId: actor.id,
                };

                return {
                    combat: {
                        phase: "targetSelect",
                        enemies: enemiesInCombat(s),
                        pending,
                        allowedTargets: aliveEnemyIds,
                        index: 0,
                    },
                    battleSubMenu: labels,
                };
            }

            // ===== Skills =====
            if (choice === "Skills") {
                const skills = get().getAvailableSkills(actor);
                return {
                    combat: {
                        phase: "skillMenu",
                        enemies: enemiesInCombat(s),
                        availableSkills: skills.map((sk: any) => sk.id),
                    },
                    battleSubMenu: skills.map(
                        (sk: any) => `${sk.name}  [${sk.etherCost}]`
                    ),
                    subMenuIndex: 0,
                };
            }

            // ===== Items =====
            if (choice === "Items") {
                const items = s.bag.filter(
                    (b: any) =>
                        b.qty > 0 &&
                        (b.id.includes("potion") || b.id.includes("elixir"))
                );
                return {
                    combat: {
                        phase: "itemMenu",
                        enemies: enemiesInCombat(s),
                        availableItems: items,
                    },
                    battleSubMenu: items.map(
                        (it: any) => `Use ${it.id.replace(/_/g, " ")} x${it.qty}`
                    ),
                    subMenuIndex: 0,
                };
            }
            return s;
        }),

    // ===== Execute Attack (F key) =====
    executeAttack: () => {
        const s = get();
        if (s.combat.phase !== "playerMenu") return;
        get().confirmSelectionAt(0);
    },

    // ===== Select Skill =====
    selectSkill: (label: string) =>
        set((s: any) => {
            if (s.combat.phase !== "skillMenu") return s;

            const name = label.split("  [")[0];
            const sk = Object.values(SKILLS).find((x: any) => x.name === name);
            if (!sk) return s;

            const currentId = s.turnQueue[s.currentTurn];
            const actor = s.player.party.find((c: any) => c.id === currentId);
            if (!actor) return s;

            const isAllySkill = sk.type === "heal" || sk.type === "buff";

            // ===== Single Target Skill =====
            if (sk.targetType === "single") {
                const allowed = isAllySkill
                    ? s.player.party
                          .filter((c: any) => c.stats.hp > 0)
                          .map((c: any) => c.id)
                    : aliveEnemies(s).map((e: any) => e.id);

                if (allowed.length === 0) {
                    return {
                        combat: {
                            phase: "playerMenu",
                            enemies: enemiesInCombat(s),
                        },
                        battleSubMenu: [],
                    };
                }

                const labels = allowed.map((id: any) => {
                    if (isAllySkill) {
                        const c = s.player.party.find((x: any) => x.id === id)!;
                        return `${c.name} (HP ${c.stats.hp}/${c.stats.maxHp})`;
                    } else {
                        const e = getEnemyById(s, id)!;
                        return `${e.name} (${e.stats.hp}/${e.stats.maxHp})`;
                    }
                });

                const pending: PendingAction = {
                    type: "skill",
                    actorId: actor.id,
                    skillId: sk.id,
                };

                return {
                    combat: {
                        phase: "targetSelect",
                        enemies: enemiesInCombat(s),
                        pending,
                        allowedTargets: allowed,
                        index: 0,
                    },
                    battleSubMenu: labels,
                };
            }

            // ===== Self/All Skills (Instant Execution) =====
            if (!get().spendEther(actor.id, sk.etherCost)) {
                return {
                    combat: {
                        phase: "playerMenu",
                        enemies: enemiesInCombat(s),
                    },
                    battleSubMenu: [],
                };
            }

            const action: CombatAction = {
                type: "skill",
                actorId: actor.id,
                skillId: sk.id,
                qteType: "timing",
            };

            if (sk.targetType === "self") {
                action.targetId = actor.id;
            } else if (sk.targetType === "all") {
                action.targetIds =
                    sk.type === "heal" || sk.type === "buff"
                        ? s.player.party
                              .filter((c: any) => c.stats.hp > 0)
                              .map((c: any) => c.id)
                        : aliveEnemies(s).map((e: any) => e.id);
            }

            get().startPlayerQTE(action);
            return s;
        }),

    // ===== Select Item =====
    selectItem: (labelOrId: string) =>
        set((s: any) => {
            if (s.combat.phase !== "itemMenu") return s;
            const id = labelOrId.startsWith("Use ")
                ? labelOrId.slice(4).split(" x")[0].replace(/ /g, "_")
                : labelOrId;
            const currentId = s.turnQueue[s.currentTurn];
            const actor = s.player.party.find((c: any) => c.id === currentId);
            if (!actor) return s;
            const idx = s.bag.findIndex((b: any) => b.id === id);
            if (idx === -1 || s.bag[idx].qty <= 0) {
                return {
                    combat: {
                        phase: "playerMenu",
                        enemies: enemiesInCombat(s),
                    },
                    battleSubMenu: [],
                };
            }

            // ===== Items That Need Target =====
            if (id === "health_potion") {
                const allies = s.player.party
                    .filter((c: any) => c.stats.hp > 0)
                    .map((c: any) => c.id);
                return {
                    combat: {
                        phase: "targetSelect",
                        enemies: enemiesInCombat(s),
                        pending: {
                            kind: "item",
                            actorId: actor.id,
                            itemId: id,
                        },
                        allowedTargets: allies,
                        index: 0,
                    },
                    battleSubMenu: allies.map(
                        (cid: any) =>
                            s.player.party.find((c: any) => c.id === cid)!.name
                    ),
                };
            }

            // ===== Instant Consume Items =====
            const bag = [...s.bag];
            bag[idx] = { id, qty: bag[idx].qty - 1 };
            if (bag[idx].qty <= 0) bag.splice(idx, 1);

            get().triggerFX("player", 1.2);
            setTimeout(() => {
                if (!["victory", "defeat"].includes(get().combat.phase))
                    get().endPlayerTurn();
            }, 450);
            return {
                bag,
                combat: { phase: "turnEnd", enemies: enemiesInCombat(s) },
                battleSubMenu: [],
            };
        }),

    // ===== Back to Menu =====
    backToMenu: () =>
        set((s: any) =>
            s.combat.phase === "skillMenu" || s.combat.phase === "itemMenu"
                ? {
                      combat: {
                          phase: "playerMenu",
                          enemies: enemiesInCombat(s),
                      },
                      battleSubMenu: [],
                  }
                : s
        ),

    // ===== QTE System =====
    startPlayerQTE: (action: CombatAction) =>
        set((s: any) => {
            const key =
                action.type === "attack"
                    ? "attack"
                    : action.skillId ?? "attack";
            const plan = [...(QTE_PLANS[key] ?? [1])];
            const startAt = performance.now();

            setTimeout(() => {
                const st = get().combat;
                if (
                    st.phase === "playerQTE" &&
                    st.startAt === startAt &&
                    st.index === 0
                ) {
                    if (action.type === "skill") {
                        set({
                            combat: {
                                phase: "turnEnd",
                                enemies: st.enemies,
                            },
                        });
                        get().spawnPopup({
                            side: "ally",
                            charId: action.actorId,
                            text: "MISS",
                            color: "#f59e0b",
                        });
                        setTimeout(() => get().endPlayerTurn(), 450);
                    } else {
                        get().resolvePlayerAction(false);
                    }
                }
            }, 950);

            return {
                combat: {
                    phase: "playerQTE",
                    enemies: enemiesInCombat(s),
                    action,
                    startAt,
                    windowMs: 900,
                    plan,
                    index: 0,
                },
                battleSubMenu: [],
            };
        }),

    qteTap: () => {
        const st = get();
        if (st.combat.phase !== "playerQTE") return;

        const { startAt, windowMs, plan, index, action } = st.combat;
        const t = (performance.now() - startAt) / windowMs;
        const edgeF = Math.max(0, Math.min(3.999, t * 4));
        const edge = Math.floor(edgeF);

        const needEdge = plan[index];
        const okThis = edge === needEdge;

        if (!okThis) {
            if (action.type === "skill") {
                set({
                    combat: {
                        phase: "turnEnd",
                        enemies: st.combat.enemies,
                    },
                });
                get().spawnPopup({
                    side: "ally",
                    charId: action.actorId,
                    text: "MISS",
                    color: "#f59e0b",
                });
                setTimeout(() => get().endPlayerTurn(), 450);
            } else {
                get().resolvePlayerAction(false);
            }
            return;
        }

        const last = index >= plan.length - 1;
        if (!last) {
            set({
                combat: {
                    ...st.combat,
                    index: index + 1,
                    startAt: performance.now(),
                },
            });
            return;
        }
        get().resolvePlayerAction(true, 0.25);
    },
});