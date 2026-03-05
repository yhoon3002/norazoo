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
        (c: Character) => c.id === id && c.stats.hp > 0
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

/** ===== 데미지 계산 ===== */
export function calcBasicAttackDamage(actor: Character, enemy: Enemy): number {
    const base = actor.stats.atk;
    const dmg = Math.max(1, Math.round(1.2 * base - enemy.stats.def * 0.4));
    return dmg;
}