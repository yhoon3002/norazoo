// rpg/presenter/slices/bagSlice.ts
"use client";

import { EQUIPMENT, ITEM_PRICES, SELL_RATIO } from "../../data/gameData";

export const bagSlice = (set: any, get: any) => ({
    // ===== State =====
    bag: [
        { id: "health_potion", qty: 3 },
        { id: "mana_potion", qty: 3 },
    ],
    treasures: [],
    // 도감 진행 — 장비/기술 획득·사용 이력 (base id로 정규화 저장)
    // 시작 파티가 이미 착용 중인 장비는 도감에 처음부터 공개(addItem 미경유 보완)
    unlockedEquipment: ["steel_sword", "chain_mail", "mage_staff", "mage_robes", "iron_sword", "leather_armor", "health_amulet"] as string[],
    unlockedSkills: [] as string[],

    // ===== Add Item =====
    addItem: (id: string, qty: number = 1) =>
        set((s: any) => {
            const bag = [...s.bag];
            const i = bag.findIndex((b: any) => b.id === id);
            if (i === -1) bag.push({ id, qty });
            else bag[i] = { id, qty: bag[i].qty + qty };

            const patch: any = { bag };
            if (EQUIPMENT[id]) {
                const baseId = id.replace(/_p[1-5]$/, "");
                if (!s.unlockedEquipment.includes(baseId)) {
                    patch.unlockedEquipment = [...s.unlockedEquipment, baseId];
                }
            }
            return patch;
        }),

    // ===== Shop =====
    buyItem: (id: string): boolean => {
        const price = ITEM_PRICES[id];
        if (price == null) return false;
        const s = get();
        if (s.player.gold < price) return false;
        set((st: any) => ({
            player: { ...st.player, gold: st.player.gold - price },
        }));
        get().addItem(id, 1);
        return true;
    },

    sellItem: (id: string): boolean => {
        const base = ITEM_PRICES[id];
        if (base == null) return false;
        const s = get();
        const item = s.bag.find((b: { id: string; qty: number }) => b.id === id && b.qty > 0);
        if (!item) return false;
        const price = Math.max(1, Math.floor(base * SELL_RATIO));
        set((st: any) => {
            type BagItem = { id: string; qty: number };
            const bag = st.bag
                .map((b: BagItem) =>
                    b.id === id ? { ...b, qty: b.qty - 1 } : b
                )
                .filter((b: BagItem) => b.qty > 0);
            return {
                bag,
                player: { ...st.player, gold: st.player.gold + price },
            };
        });
        return true;
    },

    // ===== Use Item =====
    useItem: (id: string, targetId?: string) => {
        set((s: any) => {
            const i = s.bag.findIndex((b: any) => b.id === id);
            if (i === -1) return s;
            const bag = [...s.bag];
            bag[i].qty--;
            if (bag[i].qty <= 0) bag.splice(i, 1);

            // health_potion 특별 처리
            if (id === "health_potion" && targetId) {
                const party = s.player.party.map((c: any) =>
                    c.id === targetId
                        ? {
                              ...c,
                              stats: {
                                  ...c.stats,
                                  hp: Math.min(c.stats.maxHp, c.stats.hp + 50),
                              },
                          }
                        : c
                );
                return { bag, player: { ...s.player, party } };
            }
            // revive_elixir: 사망 아군 부활 — HP 50%
            if (id === "revive_elixir" && targetId) {
                const party = s.player.party.map((c: any) =>
                    c.id === targetId && c.stats.hp <= 0
                        ? {
                              ...c,
                              stats: {
                                  ...c.stats,
                                  hp: Math.round(c.stats.maxHp * 0.5),
                              },
                          }
                        : c
                );
                return { bag, player: { ...s.player, party } };
            }
            // mana_potion: 에테르 +3 회복
            if (id === "mana_potion" && targetId) {
                const party = s.player.party.map((c: any) =>
                    c.id === targetId
                        ? {
                              ...c,
                              ether: Math.min(
                                  c.maxEther ?? 9,
                                  (c.ether ?? 0) + 3
                              ),
                          }
                        : c
                );
                return { bag, player: { ...s.player, party } };
            }
            return { bag };
        });
    },
});