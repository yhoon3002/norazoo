// rpg/data/recipeData.ts — 요리 레시피 (존 재료 → 다음 전투 버프, 즉석 섭취)
export type RecipeBuff = {
    type: "buff_atk" | "buff_def" | "regen" | "speed" | "ether";
    value: number;
    /** 전투 내 지속 턴 (ether는 즉시 적용이라 무시) */
    duration: number;
};

export type Recipe = {
    id: string;
    name: string;
    icon: string;
    desc: string;
    needs: Array<{ id: string; qty: number }>;
    buffs: RecipeBuff[];
};

export const RECIPES: Recipe[] = [
    {
        id: "clam_steam", name: "조개찜", icon: "🥘",
        desc: "다음 전투: 방어 +6 (4턴)",
        needs: [ { id: "clam", qty: 2 }, { id: "sea_salt", qty: 1 } ],
        buffs: [{ type: "buff_def", value: 6, duration: 4 }],
    },
    {
        id: "mushroom_stew", name: "버섯스튜", icon: "🍲",
        desc: "다음 전투: 매 턴 HP 8 회복 (4턴)",
        needs: [ { id: "forest_mushroom", qty: 2 }, { id: "herb", qty: 1 } ],
        buffs: [{ type: "regen", value: 8, duration: 4 }],
    },
    {
        id: "wind_tea", name: "바람꽃차", icon: "🍵",
        desc: "다음 전투: 속도 +5 (4턴)",
        needs: [{ id: "wind_flower", qty: 2 }],
        buffs: [{ type: "speed", value: 5, duration: 4 }],
    },
    {
        id: "grilled_fish", name: "생선구이", icon: "🐟",
        desc: "다음 전투: 공격 +5 (4턴)",
        needs: [ { id: "fish_common", qty: 2 }, { id: "sea_salt", qty: 1 } ],
        buffs: [{ type: "buff_atk", value: 5, duration: 4 }],
    },
    {
        id: "moon_sashimi", name: "월광어회", icon: "🌕",
        desc: "다음 전투: 공격 +8·속도 +4 (4턴)",
        needs: [{ id: "fish_rare", qty: 1 }],
        buffs: [
            { type: "buff_atk", value: 8, duration: 4 },
            { type: "speed", value: 4, duration: 4 },
        ],
    },
    {
        id: "lotus_porridge", name: "연꽃죽", icon: "🥣",
        desc: "즉시: 파티 전원 에테르 +2",
        needs: [ { id: "lotus", qty: 1 }, { id: "reed", qty: 2 } ],
        buffs: [{ type: "ether", value: 2, duration: 0 }],
    },
];
