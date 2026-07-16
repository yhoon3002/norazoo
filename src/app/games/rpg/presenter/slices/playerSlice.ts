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
    // 광장 초입 — 요리사(광장)까지 ~20m. 튜토리얼을 짧게 끝내고
    // 마을 어귀~광장 길(동쪽 81m)은 자유 탐험 지역으로 해방한다.
    pos: { x: 28, y: -33.2, z: -24 },
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

    // 패스트 트래블/리스폰용 텔레포트 요청 — FieldPlayer가 다음 프레임에 소비
    pendingTeleport: null as Vec3 | null,
    requestTeleport: (p: Vec3) => set(() => ({ pendingTeleport: p })),

    gainGold: (n: number) =>
        set((s: any) => ({
            player: { ...s.player, gold: s.player.gold + n },
        })),

    // ===== Experience =====
    // 성장은 반드시 baseStats에 적용한다 — 파생 stats에 직접 더하면
    // calculateStats(장비 착탈 등)가 재계산될 때 성장분이 소실된다.
    gainExp: (characterId: string, exp: number) =>
        set((s: any) => {
            const party = s.player.party.map((c: Character) => {
                if (c.id !== characterId) return c;
                let level = c.level,
                    expToNext = c.expToNext,
                    total = c.exp + exp;
                const baseStats = { ...c.baseStats };
                let leveled = false;
                while (total >= expToNext) {
                    total -= expToNext;
                    level++;
                    expToNext = level * 50;
                    leveled = true;
                    baseStats.maxHp += 10;
                    baseStats.atk += 2;
                    baseStats.def += 1;
                    baseStats.speed += 1;
                }
                if (!leveled) return { ...c, exp: total, expToNext };
                // 레벨업 시 완전 회복 (stats: undefined → calculateStats가 hp=maxHp로 채움)
                return calculateStats({
                    ...c,
                    level,
                    exp: total,
                    expToNext,
                    baseStats,
                    stats: undefined,
                });
            });
            return { player: { ...s.player, party } };
        }),

    // ===== Equipment =====
    // 가방의 장비를 캐릭터에 장착 — 같은 부위의 기존 장비는 가방으로 돌아간다
    equipItem: (characterId: string, equipId: string): boolean => {
        const eq = EQUIPMENT[equipId];
        if (!eq) return false;
        const s = get();
        const owned = s.bag.find((b: { id: string; qty: number }) => b.id === equipId && b.qty > 0);
        if (!owned) return false;
        const target = s.player.party.find(
            (c: Character) => c.id === characterId
        );
        if (!target) return false;
        const prev = target.equipment[eq.type];
        if (prev === equipId) return false;

        set((st: any) => {
            const party = st.player.party.map((c: Character) =>
                c.id === characterId
                    ? calculateStats({
                          ...c,
                          equipment: { ...c.equipment, [eq.type]: equipId },
                      })
                    : c
            );
            type BagItem = { id: string; qty: number };
            let bag = st.bag
                .map((b: BagItem) =>
                    b.id === equipId ? { ...b, qty: b.qty - 1 } : b
                )
                .filter((b: BagItem) => b.qty > 0);
            if (prev) {
                const i = bag.findIndex((b: BagItem) => b.id === prev);
                if (i === -1) bag = [...bag, { id: prev, qty: 1 }];
                else
                    bag = bag.map((b: BagItem, j: number) =>
                        j === i ? { ...b, qty: b.qty + 1 } : b
                    );
            }
            return { player: { ...st.player, party }, bag };
        });
        return true;
    },

    unequipItem: (
        characterId: string,
        slot: "weapon" | "armor" | "accessory"
    ): boolean => {
        const s = get();
        const target = s.player.party.find(
            (c: Character) => c.id === characterId
        );
        const prev = target?.equipment[slot];
        if (!prev) return false;

        set((st: any) => {
            const party = st.player.party.map((c: Character) =>
                c.id === characterId
                    ? calculateStats({
                          ...c,
                          equipment: { ...c.equipment, [slot]: undefined },
                      })
                    : c
            );
            type BagItem = { id: string; qty: number };
            const i = st.bag.findIndex((b: BagItem) => b.id === prev);
            const bag =
                i === -1
                    ? [...st.bag, { id: prev, qty: 1 }]
                    : st.bag.map((b: BagItem, j: number) =>
                          j === i ? { ...b, qty: b.qty + 1 } : b
                      );
            return { player: { ...st.player, party }, bag };
        });
        return true;
    },

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