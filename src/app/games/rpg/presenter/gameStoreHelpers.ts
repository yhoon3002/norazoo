// rpg/presenter/gameStoreHelpers.ts
"use client";

import type { CombatAction, Character, Enemy } from "../types/RpgTypes";
import { SKILL_ANIMATIONS } from "../data/gameData";

/** ===== QTE 패턴 ===== */
export const QTE_PLANS: Record<string, number[]> = {
    attack: [1],
    skill1: [1, 2],
    skill2: [2, 3],
    slash: [1, 2],
    fireball: [2, 3],
    lightning: [1, 2],
    ice_shard: [2, 3],
    guard_break: [2],
    heal: [2],
    group_heal: [1, 2],
    // ===== 캐릭터 전용 레벨 언락 스킬 (신규 11종) — 위력에 맞춰 스케일 =====
    arin_whirl: [1, 2],
    arin_bastion: [1],
    arin_execute: [2, 3, 3],
    arin_bless: [1, 2],
    theo_gearburst: [1, 2],
    theo_haste: [1],
    theo_corrode: [1, 2],
    theo_collapse: [2, 3, 3],
    lotti_pan: [1, 2],
    lotti_spice: [1],
    lotti_fullcourse: [1, 2],
};

export const PARRY_ANIMATION_STATE = "parry";

/** ===== 기본 유틸 함수 ===== */
export const clamp = (v: number, a: number, b: number) => 
    Math.max(a, Math.min(b, v));

export function getSkillAnimationState(skillId: string): string {
    return SKILL_ANIMATIONS[skillId] || "attack";
}

export function getAnimationForAction(action: CombatAction): string {
    if (action.type === "skill" && action.skillId) {
        return getSkillAnimationState(action.skillId);
    }
    return "attack";
}

/** ===== 적 관련 헬퍼 함수 ===== */
export function enemiesInCombat(s: any): Enemy[] {
    return s.combat.phase === "idle" ? [] : s.combat.enemies;
}

export function getEnemyById(s: any, id?: string | null): Enemy | undefined {
    if (!id) return undefined;
    const list = enemiesInCombat(s);
    return list.find((e) => e.id === id);
}

export function aliveEnemies(s: any): Enemy[] {
    return enemiesInCombat(s).filter((e) => e.stats.hp > 0);
}

export function firstAliveEnemyId(s: any): string | undefined {
    return aliveEnemies(s)[0]?.id;
}

export function isIdAlive(s: any, id: string): boolean {
    const allyAlive = s.player.party.some(
        (c: Character) => c.id === id && (c.stats?.hp ?? 0) > 0
    );
    const enemyAlive = enemiesInCombat(s).some(
        (e) => e.id === id && e.stats.hp > 0
    );
    return allyAlive || enemyAlive;
}

export function findNextAliveIndex(s: any, from: number): number {
    if (s.turnQueue.length === 0) return 0;
    let idx = (from + 1) % s.turnQueue.length;
    let guard = 0;
    while (guard++ < s.turnQueue.length && !isIdAlive(s, s.turnQueue[idx])) {
        idx = (idx + 1) % s.turnQueue.length;
    }
    return idx;
}

/** 유효 speed = stats.speed + Σ(speed 버프) — 요리 버프/스킬 속도 버프가 턴 순서에도 반영되도록 */
export function effSpeed(u: {
    stats?: { speed: number };
    statusEffects: Array<{ type: string; value: number }>;
}): number {
    return (
        (u.stats?.speed ?? 0) +
        u.statusEffects
            .filter((e) => e.type === "speed")
            .reduce((sum, e) => sum + e.value, 0)
    );
}

/**
 * 생존 파티원 + 생존 적을 현재 유효 speed 내림차순으로 정렬한 턴 큐(id 목록).
 * 라운드 경계에서 재정렬할 때 사용 — startCombat의 초기 정렬과 동일한 규칙을 공유한다.
 */
export function buildTurnQueue(s: any): string[] {
    const partyEntries = s.player.party
        .filter((c: any) => c.stats.hp > 0)
        .map((c: any) => ({ id: c.id, speed: effSpeed(c) }));
    const enemyEntries = aliveEnemies(s).map((e: any) => ({
        id: e.id,
        speed: effSpeed(e),
    }));
    return [...partyEntries, ...enemyEntries]
        .sort((a, b) => b.speed - a.speed)
        .map((x) => x.id);
}

/** ===== 데미지 계산 ===== */
/** statusEffects의 buff_atk/buff_def를 합산한 유효 스탯 */
export function effectiveStat(
    unit: { stats?: { atk: number; def: number }; statusEffects: Array<{ type: string; value: number }> },
    key: "atk" | "def"
): number {
    const base = unit.stats?.[key] ?? 0;
    const buffType = key === "atk" ? "buff_atk" : "buff_def";
    return (
        base +
        unit.statusEffects
            .filter((e) => e.type === buffType)
            .reduce((s, e) => s + e.value, 0)
    );
}

export function calcBasicAttackDamage(actor: Character, enemy: Enemy): number {
    const base = effectiveStat(actor, "atk");
    const dmg = Math.max(1, Math.round(1.2 * base - effectiveStat(enemy, "def") * 0.4));
    return dmg;
}