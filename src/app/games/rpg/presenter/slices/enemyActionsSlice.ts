// rpg/presenter/slices/enemyActionsSlice.ts
"use client";

import type { Telegraph } from "../../types/RpgTypes";
import {
    SKILLS,
    ENEMY_ATTACK_PROFILES,
    DEFAULT_ATTACK_PROFILE,
} from "../../data/gameData";
import { enemiesInCombat, getEnemyById, effectiveStat } from "../gameStoreHelpers";

const PARRY_WINDOW = 90; // ±ms
const DODGE_WINDOW = 180; // ±ms

// 유닛별 공격 프로필 — template 키 우선, 없으면 이름 휴리스틱
function profileFor(enemy: { template?: string; name?: string }) {
    if (enemy.template && ENEMY_ATTACK_PROFILES[enemy.template]) {
        return ENEMY_ATTACK_PROFILES[enemy.template];
    }
    const n = (enemy.name ?? "").toLowerCase();
    if (n.includes("orc")) return ENEMY_ATTACK_PROFILES.orc;
    if (n.includes("slime")) return ENEMY_ATTACK_PROFILES.slime;
    if (n.includes("mage")) return ENEMY_ATTACK_PROFILES.mage;
    return DEFAULT_ATTACK_PROFILE;
}

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
            const target = alive[Math.floor(Math.random() * alive.length)];
            const usedSkill =
                enemy.skills[Math.floor(Math.random() * enemy.skills.length)];

            // 유닛별 공격 프로필로 타이밍 구성 (차지 + 다단 히트)
            const prof = profileFor(enemy);
            const now = performance.now();
            const firstHit = now + prof.chargeMs;
            const hits = prof.hits.map((o: number) => firstHit + o);
            const tele: Telegraph = {
                startAt: now,
                hitAt: hits[0],
                endAt: hits[hits.length - 1] + DODGE_WINDOW + 150,
                hits,
                parryable: prof.parryable,
                ringColor: prof.ringColor,
            };

            // 공격 모션은 텔레그래프 전체 구간 동안 재생 (차지 → 타격)
            get().startAttackMotion(
                enemy.id,
                target.id,
                "enemy",
                tele.endAt - now + 250
            );
            // 타격 시점마다 스윙 연출
            for (const h of hits) {
                setTimeout(
                    () => get().triggerSwing(enemy.id, 400),
                    Math.max(0, h - now - 150)
                );
            }

            // 방어 세대 토큰 — 낡은(교체된) 텔레그래프의 판정 타이머를 무효화한다
            const seq = (s.defenseSeq ?? 0) + 1;
            // 히트별 판정 확정 타이머 (윈도우 종료 시점 — 입력 없으면 fail)
            const timeoutIds = hits.map((h: number, i: number) =>
                setTimeout(
                    () => get().resolveDefenseHit(i, seq),
                    h - now + DODGE_WINDOW + 5
                )
            );

            // ===== 첫 전투 방어 튜토리얼 — 타격 직전 시간 정지 =====
            // 패리(파리 가능한 공격) → 회피 순으로 한 번씩. 완료/전투 종료 후에는
            // defense_tutorial_done이 켜져 다시는 발동하지 않는다.
            if (!s.flags.defense_tutorial_done) {
                const lesson =
                    !s.flags.tut_parry && prof.parryable !== false
                        ? "parry"
                        : !s.flags.tut_dodge
                        ? "dodge"
                        : null;
                if (lesson) {
                    setTimeout(
                        () => get().freezeDefenseTutorial(lesson),
                        Math.max(0, prof.chargeMs - 450)
                    );
                }
            }

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
                defenseTimeoutId: null,
                defenseSeq: seq,
                defenseTimeoutIds: timeoutIds,
                defenseHitIndex: 0,
                defenseResults: [],
                defenseSpent: false,
            };
        }),

    // ===== 방어 튜토리얼 (첫 전투 한정) =====
    // 타격 직전 시간 정지 — 확정 타이머를 모두 멈추고 안내 카드를 띄운다
    freezeDefenseTutorial: (lesson: "parry" | "dodge") => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        if (st.defenseTutorial) return;
        (st.defenseTimeoutIds ?? []).forEach(
            (id: NodeJS.Timeout | null) => id && clearTimeout(id)
        );
        set({
            defenseTimeoutIds: [],
            defenseTutorial: {
                lesson,
                stage: "frozen",
                frozenAt: performance.now(),
            },
            flags: { ...st.flags, defense_tutorial_started: true },
        });
    },

    // 시간 재개 — 정지한 만큼 텔레그래프 타임스탬프를 밀고 확정 타이머 재장전
    resumeDefenseTutorial: () => {
        const st = get();
        const tut = st.defenseTutorial;
        if (!tut || tut.stage !== "frozen") return;
        if (st.combat.phase !== "defenseWindow") {
            set({ defenseTutorial: null });
            return;
        }
        const now = performance.now();
        const dt = now - tut.frozenAt;
        const tele = st.combat.telegraph as Telegraph;
        const hits = (tele.hits ?? [tele.hitAt]).map((h) => h + dt);
        const newTele: Telegraph = {
            ...tele,
            startAt: tele.startAt + dt,
            hitAt: hits[0],
            endAt: tele.endAt + dt,
            hits,
        };
        const i0 = st.defenseHitIndex ?? 0;
        const seq = st.defenseSeq ?? 0;
        const ids = hits.map((h, i) =>
            i >= i0
                ? setTimeout(
                      () => get().resolveDefenseHit(i, seq),
                      h - now + DODGE_WINDOW + 5
                  )
                : null
        );
        set({
            combat: { ...st.combat, telegraph: newTele },
            defenseTimeoutIds: ids,
            defenseTutorial: { ...tut, stage: "active" },
        });
    },

    // 튜토리얼 중 실패 — 데미지 없이 같은 공격을 처음부터 다시
    restartTutorialTelegraph: () => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        (st.defenseTimeoutIds ?? []).forEach(
            (id: NodeJS.Timeout | null) => id && clearTimeout(id)
        );
        const tele = st.combat.telegraph as Telegraph;
        const oldHits = tele.hits ?? [tele.hitAt];
        const offsets = oldHits.map((h) => h - oldHits[0]);
        const charge = Math.max(900, oldHits[0] - tele.startAt);
        const now = performance.now();
        const firstHit = now + charge;
        const hits = offsets.map((o) => firstHit + o);
        const newTele: Telegraph = {
            ...tele,
            startAt: now,
            hitAt: hits[0],
            endAt: hits[hits.length - 1] + DODGE_WINDOW + 150,
            hits,
        };
        const enemyId = (st.combat as { enemyId?: string }).enemyId;
        const targetId = st.combat.action?.targetId;
        if (enemyId && targetId) {
            get().startAttackMotion(
                enemyId,
                targetId,
                "enemy",
                newTele.endAt - now + 250
            );
            for (const h of hits) {
                setTimeout(
                    () => get().triggerSwing(enemyId, 400),
                    Math.max(0, h - now - 150)
                );
            }
        }
        const seq = st.defenseSeq ?? 0;
        const ids = hits.map((h, i) =>
            setTimeout(
                () => get().resolveDefenseHit(i, seq),
                h - now + DODGE_WINDOW + 5
            )
        );
        get().spawnPopup({
            side: "ally",
            text: "다시! 링이 닿는 순간이야",
            color: "#fbbf24",
        });
        set({
            combat: { ...st.combat, telegraph: newTele },
            defenseTimeoutIds: ids,
            defenseHitIndex: 0,
            defenseResults: [],
            defenseSpent: false,
        });
    },

    // 레슨 성공 — 플래그 기록 + 설명 배너 (3.2초 후 자동 종료)
    completeDefenseLesson: (lesson: "parry" | "dodge") => {
        set((s: any) => ({
            flags: { ...s.flags, [`tut_${lesson}`]: true },
            defenseTutorial: { lesson, stage: "success" },
        }));
        setTimeout(() => {
            const cur = get().defenseTutorial;
            if (cur?.stage === "success" && cur.lesson === lesson) {
                set({ defenseTutorial: null });
            }
        }, 3200);
    },

    // ===== Attempt Parry (F) =====
    attemptParry: () => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        const tut = st.defenseTutorial;
        if (tut?.stage === "frozen") return; // 정지 중엔 입력 무시
        if (tut?.stage === "active" && tut.lesson === "dodge") {
            get().spawnPopup({
                side: "ally",
                text: "지금은 W — 회피!",
                color: "#fbbf24",
            });
            return;
        }
        const tele = st.combat.telegraph as Telegraph;
        const hits = tele.hits ?? [tele.hitAt];
        const i = st.defenseHitIndex ?? 0;
        if (i >= hits.length) return;
        const results = [...(st.defenseResults ?? [])];
        if (results[i] !== undefined || st.defenseSpent) return;

        // 회피 전용 공격 — 패리 시도는 소진 처리 (연타로 뚫기 방지)
        if (tele.parryable === false) {
            set({ defenseSpent: true });
            get().spawnPopup({
                side: "ally",
                text: "패리 불가!",
                color: "#f87171",
            });
            return;
        }

        const now = performance.now();
        if (Math.abs(now - hits[i]) <= PARRY_WINDOW) {
            results[i] = "parry";
            const action = st.combat.action!;
            const target = st.player.party.find(
                (c: any) => c.id === action.targetId
            );
            if (target) {
                get().triggerAnimatedAction(target.id, "parry", 400);
                get().gainEther(target.id, 1);
            }
            if (tut?.stage === "active" && tut.lesson === "parry") {
                get().completeDefenseLesson("parry");
            }
            get().advanceDefenseHit(i, results);
        } else if (now < hits[i] - PARRY_WINDOW) {
            // 너무 이른 입력 — 이 타는 방어권 소진 (F 연타 익스플로잇 방지)
            set({ defenseSpent: true });
            get().spawnPopup({
                side: "ally",
                text: "Too early!",
                color: "#fbbf24",
            });
        }
    },

    // ===== Attempt Dodge (W) =====
    attemptDodge: () => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        const tut = st.defenseTutorial;
        if (tut?.stage === "frozen") return; // 정지 중엔 입력 무시
        if (tut?.stage === "active" && tut.lesson === "parry") {
            get().spawnPopup({
                side: "ally",
                text: "지금은 F — 패리!",
                color: "#fbbf24",
            });
            return;
        }
        const tele = st.combat.telegraph as Telegraph;
        const hits = tele.hits ?? [tele.hitAt];
        const i = st.defenseHitIndex ?? 0;
        if (i >= hits.length) return;
        const results = [...(st.defenseResults ?? [])];
        if (results[i] !== undefined || st.defenseSpent) return;

        const now = performance.now();
        if (Math.abs(now - hits[i]) <= DODGE_WINDOW) {
            results[i] = "dodge";
            const action = st.combat.action!;
            const target = st.player.party.find(
                (c: any) => c.id === action.targetId
            );
            if (target) {
                get().spawnPopup({
                    side: "ally",
                    charId: target.id,
                    text: "DODGE",
                    color: "#a3e635",
                });
            }
            get().triggerFX("player", 1.4);
            if (tut?.stage === "active" && tut.lesson === "dodge") {
                get().completeDefenseLesson("dodge");
            }
            get().advanceDefenseHit(i, results);
        } else if (now < hits[i] - DODGE_WINDOW) {
            set({ defenseSpent: true });
            get().spawnPopup({
                side: "ally",
                text: "Too early!",
                color: "#fbbf24",
            });
        }
    },

    // ===== 히트 판정 후 다음 히트로 진행 (성공 입력 시 즉시) =====
    advanceDefenseHit: (i: number, results: Array<string>) => {
        const st = get();
        const tele = st.combat.telegraph as Telegraph;
        const hits = tele.hits ?? [tele.hitAt];
        // 이 히트의 확정 타이머 취소
        const ids = st.defenseTimeoutIds ?? [];
        if (ids[i]) clearTimeout(ids[i]);

        if (i + 1 < hits.length) {
            set({
                defenseResults: results,
                defenseHitIndex: i + 1,
                defenseSpent: false,
            });
        } else {
            set({ defenseResults: results });
            get().finishDefense(results);
        }
    },

    // ===== 히트 윈도우 종료 — 입력 없었으면 실패 확정 =====
    resolveDefenseHit: (i: number, seq?: number) => {
        const st = get();
        if (st.combat.phase !== "defenseWindow") return;
        // 낡은 텔레그래프(교체/재시작 이전)의 타이머는 무효
        if (seq !== undefined && seq !== st.defenseSeq) return;
        const tut = st.defenseTutorial;
        // 시간 정지 중에는 어떤 판정도 확정하지 않는다
        if (tut?.stage === "frozen") return;
        // 튜토리얼 레슨 중 실패 — 데미지 없이 같은 공격을 재시작 (성공할 때까지)
        if (
            tut?.stage === "active" &&
            !st.flags[`tut_${tut.lesson}`] &&
            (st.defenseResults ?? [])[i] === undefined
        ) {
            get().restartTutorialTelegraph();
            return;
        }
        const tele = st.combat.telegraph as Telegraph;
        const hits = tele.hits ?? [tele.hitAt];
        const results = [...(st.defenseResults ?? [])];
        if (results[i] === undefined) {
            results[i] = "fail";
            get().applyEnemyHitDamage(i);
        }
        if (i + 1 < hits.length) {
            set({
                defenseResults: results,
                defenseHitIndex: i + 1,
                defenseSpent: false,
            });
        } else {
            set({ defenseResults: results });
            get().finishDefense(results);
        }
    },

    // ===== 히트 1회분 데미지 적용 (다단 히트는 총 데미지를 균등 분할) =====
    applyEnemyHitDamage: (i: number) => {
        const s = get();
        if (s.combat.phase !== "defenseWindow") return;
        const enemy = getEnemyById(s, s.combat.enemyId)!;
        const action = s.combat.action!;
        const target = s.player.party.find(
            (c: any) => c.id === action.targetId
        );
        if (!target || target.stats.hp <= 0) return;

        const tele = s.combat.telegraph as Telegraph;
        const hits = tele.hits ?? [tele.hitAt];
        const sk = action.skillId ? SKILLS[action.skillId] : undefined;
        const atk = effectiveStat(enemy, "atk");
        const base = sk ? sk.damage + atk * 0.5 : atk;
        const total = Math.max(1, Math.round(base - effectiveStat(target, "def") * 0.5));
        const dmg = Math.max(1, Math.round(total / hits.length));

        const party = s.player.party.filter((c: any) => c.stats.hp > 0);
        const targetIndex = party.findIndex((c: any) => c.id === target.id);
        if (targetIndex >= 0) {
            const partySpacing = 2.2;
            const x = (targetIndex - (party.length - 1) / 2) * partySpacing;
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

        // 상태이상은 마지막 타에만 (다단 히트 중복 방지)
        if (sk?.statusEffect && i === hits.length - 1) {
            get().applyStatusEffect(target.id, sk.statusEffect);
            get().spawnPopup({
                side: "ally",
                charId: target.id,
                text: `${sk.statusEffect.type}!`,
                color: "#a78bfa",
            });
        }
    },

    // ===== 방어 시퀀스 종료 처리 =====
    finishDefense: (results: Array<string>) => {
        const s = get();
        if (s.combat.phase !== "defenseWindow") return;

        // 남은 타이머 방어적 정리
        (s.defenseTimeoutIds ?? []).forEach((id: NodeJS.Timeout) =>
            clearTimeout(id)
        );
        // 성공 배너는 잠시 유지, 그 외(frozen/active) 튜토리얼 상태는 정리
        set({
            defenseTimeoutIds: [],
            ...(s.defenseTutorial && s.defenseTutorial.stage !== "success"
                ? { defenseTutorial: null }
                : {}),
        });

        const enemy = getEnemyById(s, s.combat.enemyId)!;
        const action = s.combat.action!;
        const target = s.player.party.find(
            (c: any) => c.id === action.targetId
        );

        const parries = results.filter((r) => r === "parry").length;
        const allParried = results.length > 0 && parries === results.length;
        const anyFail = results.some((r) => r === "fail");

        // ===== 풀 패리 — 카운터 + 슬로모션 =====
        if (allParried && target) {
            const SLOW_DURATION = 2000;
            const SCALE = 0.3;
            const msg = `Perfect Parry! +${parries} Ether`;

            const counter = Math.max(
                1,
                Math.round(effectiveStat(target, "atk") * 0.8 - effectiveStat(enemy, "def") * 0.3)
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
                get().triggerFX("player", 2.4);
                get().spawnPopup({
                    side: "enemy",
                    charId: enemy.id,
                    text: `-${counter}`,
                    color: "#ef4444",
                });
            }, 420);

            get().triggerSlowMotion(SLOW_DURATION, SCALE, () => {
                get().checkCombatEnd();
                const currentPhase = get().combat.phase;

                if (currentPhase !== "victory" && currentPhase !== "defeat") {
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
        }

        // ===== 일반 종료 (회피/부분 성공/실패) =====
        const msg = anyFail ? "" : "Dodged!";
        setTimeout(() => {
            get().checkCombatEnd();
            const currentPhase = get().combat.phase;

            if (currentPhase !== "victory" && currentPhase !== "defeat") {
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
        }, 250);
    },
});
