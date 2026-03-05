// rpg/presenter/slices/bagSlice.ts
"use client";

export const bagSlice = (set: any, get: any) => ({
    // ===== State =====
    bag: [
        { id: "health_potion", qty: 3 },
        { id: "mana_potion", qty: 3 },
    ],
    quests: [],
    treasures: [],

    // ===== Add Item =====
    addItem: (id: string, qty: number = 1) =>
        set((s: any) => {
            const bag = [...s.bag];
            const i = bag.findIndex((b: any) => b.id === id);
            if (i === -1) bag.push({ id, qty });
            else bag[i] = { id, qty: bag[i].qty + qty };
            return { bag };
        }),

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
            return { bag };
        });
    },
});