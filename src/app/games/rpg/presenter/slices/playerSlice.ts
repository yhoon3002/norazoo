// rpg/presenter/slices/playerSlice.ts
"use client";

import type { Player, Character, Vec3, Skill } from "../../types/RpgTypes";
import { DEFAULT_PARTY, EQUIPMENT, SKILLS } from "../../data/gameData";
import { clamp } from "../gameStoreHelpers";

/** ===== Helper Functions ===== */
function calculateStats(character: Character): Character {
    const equipped = { ...character };
    const totalStats = { ...character.baseStats };

    // 장비 보너스 추가
    Object.values(character.equipment).forEach((equipId) => {
        if (equipId && EQUIPMENT[equipId]) {
            const equip = EQUIPMENT[equipId];
            Object.entries(equip.stats).forEach(([k, val]) => {
                if (val && k in totalStats) (totalStats as any)[k] += val;
            });
        }
    });

    // 현재 HP 유지 로직
    if (equipped.stats && equipped.stats.hp !== undefined) {
        totalStats.hp = Math.min(equipped.stats.hp, totalStats.maxHp);
    } else {
        totalStats.hp = totalStats.maxHp;
    }

    equipped.stats = totalStats;
    equipped.ether = clamp(equipped.ether ?? 0, 0, equipped.maxEther ?? 9);
    return equipped;
}

function getAvailableSkills(character: Character): Skill[] {
    const ids = new Set(character.skills);
    Object.values(character.equipment).forEach((eq) => {
        if (eq && EQUIPMENT[eq]?.skills)
            EQUIPMENT[eq]!.skills!.forEach((id) => ids.add(id));
    });
    return Array.from(ids)
        .map((id) => SKILLS[id])
        .filter(Boolean);
}

const PLAYER_INITIAL: Player = {
    pos: { x: 0, y: 2, z: 0 },
    party: DEFAULT_PARTY.slice(0, 3).map(calculateStats),
    activeCharacter: 0,
    gold: 0,
    formation: "balanced",
};

/** ===== Slice ===== */
export const playerSlice = (set: any, get: any) => ({
    // ===== State =====
    player: PLAYER_INITIAL,

    // ===== Movement & Gold =====
    moveTo: (p: Vec3) =>
        set((s: any) => ({ player: { ...s.player, pos: p } })),

    gainGold: (n: number) =>
        set((s: any) => ({
            player: { ...s.player, gold: s.player.gold + n },
        })),

    // ===== Experience =====
    gainExp: (characterId: string, exp: number) =>
        set((s: any) => {
            const party = s.player.party.map((c: Character) => {
                if (c.id !== characterId) return c;
                let level = c.level,
                    expToNext = c.expToNext,
                    total = c.exp + exp;
                while (total >= expToNext) {
                    total -= expToNext;
                    level++;
                    expToNext = level * 50;
                    c.stats.maxHp += 10;
                    c.stats.atk += 2;
                    c.stats.def += 1;
                    c.stats.speed += 1;
                    c.stats.hp = c.stats.maxHp;
                    c.maxEther = Math.min(9, c.maxEther + 0);
                }
                return { ...c, level, exp: total, expToNext };
            });
            return { player: { ...s.player, party } };
        }),

    // ===== Ether (Action Points) =====
    etherOf: (charId: string) =>
        get().player.party.find((c: Character) => c.id === charId)?.ether ?? 0,

    gainEther: (charId: string, n: number) =>
        set((s: any) => {
            const party = s.player.party.map((c: Character) =>
                c.id === charId
                    ? { ...c, ether: clamp(c.ether + n, 0, c.maxEther) }
                    : c
            );
            return { player: { ...s.player, party } };
        }),

    spendEther: (charId: string, n: number) => {
        const s = get();
        const c = s.player.party.find((x: Character) => x.id === charId);
        if (!c || c.ether < n) return false;
        c.ether -= n;
        set({
            player: {
                ...s.player,
                party: s.player.party.map((p: Character) =>
                    p.id === c.id ? { ...c } : p
                ),
            },
        });
        return true;
    },

    // ===== Skills =====
    getAvailableSkills: (character: Character) => getAvailableSkills(character),
});

export { getAvailableSkills };