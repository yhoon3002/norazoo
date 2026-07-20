// rpg/data/zoneRewards.ts — 존 정복 판정·보상 (기준: 깃발+보물3+전망 = 5요소)
import type { ZoneId } from "./placementData";

export const ZONE_REWARDS: Record<ZoneId, { gold: number; items: Array<{ id: string; qty: number }> }> = {
    town: { gold: 300, items: [{ id: "health_potion", qty: 3 }] },
    port: { gold: 400, items: [{ id: "clam", qty: 5 }] },
    hill: { gold: 500, items: [{ id: "wind_flower", qty: 3 }] },
    west_forest: { gold: 600, items: [{ id: "forest_mushroom", qty: 5 }] },
    south_coast: { gold: 600, items: [{ id: "coral_fish", qty: 2 }] },
    north_woods: { gold: 800, items: [{ id: "silver_ore", qty: 2 }] },
    ne_water: { gold: 800, items: [{ id: "lotus", qty: 3 }] },
    gorge: { gold: 1000, items: [{ id: "dark_crystal", qty: 3 }] },
};

const LEGACY_FLAG: Partial<Record<ZoneId, string>> = { town: "town", port: "port", hill: "hill" };

/** 존 정복 요소 플래그 목록 (깃발 1 + 보물 3 + 전망 1) */
export function zoneChecklist(zone: ZoneId): string[] {
    const flagId = LEGACY_FLAG[zone] ?? `z_${zone}`;
    return [
        `flag_${flagId}`,
        `treasure_z_${zone}_t0`,
        `treasure_z_${zone}_t1`,
        `treasure_z_${zone}_t2`,
        `poi_z_${zone}0`,
    ];
}

export function zoneProgress(zone: ZoneId, flags: Record<string, boolean>) {
    const list = zoneChecklist(zone);
    return { done: list.filter((f) => flags[f]).length, total: list.length };
}
