// rpg/data/tailorData.ts — 재봉 레시피: 재료+골드 → 장비 (아낙 재봉소, 에필로그 해금)
export type TailorRecipe = {
    id: string;          // 산출 EQUIPMENT id
    needs: Array<{ id: string; qty: number }>;
    gold: number;
};
export const TAILOR_RECIPES: TailorRecipe[] = [
    { id: "reed_cloak", needs: [{ id: "reed", qty: 6 }, { id: "tree_sap", qty: 2 }], gold: 200 },
    { id: "frost_coat", needs: [{ id: "frost_moss", qty: 4 }, { id: "ice_fish", qty: 2 }], gold: 300 },
    { id: "sailor_gloves", needs: [{ id: "driftwood", qty: 3 }, { id: "sea_salt", qty: 3 }], gold: 250 },
    { id: "festival_dress", needs: [{ id: "gold_carp", qty: 1 }, { id: "wind_flower", qty: 4 }], gold: 500 },
];
