// rpg/presenter/bossHelpers.ts — 보스 페이즈 순수 계산
import type { BossPhase } from "../types/RpgTypes";

/** hpRatio(0~1)가 넘어선 마지막 페이즈 인덱스. 못 넘었으면 -1 */
export function bossPhaseIndex(hpRatio: number, phases: BossPhase[]): number {
    let idx = -1;
    for (let i = 0; i < phases.length; i++) {
        if (hpRatio <= phases[i].hpPct) idx = i;
    }
    return idx;
}
