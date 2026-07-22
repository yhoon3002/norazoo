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
/** statusEffects의 buff_atk/buff_def를 합산한 유효 스탯 (def는 debuff_def 합만큼 추가 감산, 최저 0) */
export function effectiveStat(
    unit: { stats?: { atk: number; def: number }; statusEffects: Array<{ type: string; value: number }> },
    key: "atk" | "def"
): number {
    const base = unit.stats?.[key] ?? 0;
    const buffType = key === "atk" ? "buff_atk" : "buff_def";
    const buffed =
        base +
        unit.statusEffects
            .filter((e) => e.type === buffType)
            .reduce((s, e) => s + e.value, 0);
    if (key !== "def") return buffed;
    const debuff = unit.statusEffects
        .filter((e) => e.type === "debuff_def")
        .reduce((s, e) => s + e.value, 0);
    return Math.max(0, buffed - debuff);
}

export function calcBasicAttackDamage(actor: Character, enemy: Enemy): number {
    const base = effectiveStat(actor, "atk");
    const dmg = Math.max(1, Math.round(1.2 * base - effectiveStat(enemy, "def") * 0.4));
    return dmg;
}

/** ===== 치명타(luck) · 진형(formation) 배율 =====
 * 확률 (5 + luck*0.5)% → 치명타 시 최종 피해 ×1.5.
 * 진형: front ×1.1/×1.1(가하는/받는), back ×0.9/×0.9, balanced ×1.0 — 공격자·피격자가
 * 각각 파티 소속이면(=player.party에 id가 존재) 해당 배율을 곱한다(적끼리는 무영향).
 * 산식 자체(rawDamage로 넘어오는 기본 수치)는 불변 — 이 헬퍼는 치명/진형 배율만 덧붙인다.
 */
export function rollDamage(
    s: any,
    attacker: { id: string; stats?: { luck?: number } },
    defender: { id: string },
    rawDamage: number
): { damage: number; crit: boolean } {
    const luck = attacker.stats?.luck ?? 0;
    // luck 인플레 대비 상한 95%
    const critChance = Math.min(0.95, (5 + luck * 0.5) / 100);
    const crit = Math.random() < critChance;
    let dmg = crit ? rawDamage * 1.5 : rawDamage;

    const formation = s.player.formation as "front" | "back" | "balanced";
    const mul = formation === "front" ? 1.1 : formation === "back" ? 0.9 : 1.0;
    const isParty = (id: string) => s.player.party.some((c: any) => c.id === id);
    if (isParty(attacker.id)) dmg *= mul;
    if (isParty(defender.id)) dmg *= mul;

    return { damage: Math.max(1, Math.round(dmg)), crit };
}

/** ===== 도주(escape) 성공률 =====
 * clamp(0.5 + (파티 평균 speed - 적 평균 speed) * 0.02, 0.3, 0.9)
 */
export function escapeChance(s: any): number {
    const partyAlive = s.player.party.filter((c: any) => (c.stats?.hp ?? 0) > 0);
    const enemyAlive = aliveEnemies(s);
    const avg = (arr: any[]) =>
        arr.length ? arr.reduce((sum, u) => sum + effSpeed(u), 0) / arr.length : 0;
    return clamp(0.5 + (avg(partyAlive) - avg(enemyAlive)) * 0.02, 0.3, 0.9);
}

/** ===== MP → 에테르 연계 =====
 * 전투 시작 에테르 = clamp(3 + floor(유효 maxMp / 30), 0, maxEther).
 * etherBonus는 UI(MenuUI)에서도 동일 수치를 표시하는 데 공유한다.
 */
export function etherBonus(maxMp: number): number {
    return Math.floor((maxMp ?? 0) / 30);
}

export function startingEther(c: {
    stats?: { maxMp?: number };
    maxEther?: number;
}): number {
    return clamp(3 + etherBonus(c.stats?.maxMp ?? 0), 0, c.maxEther ?? 9);
}