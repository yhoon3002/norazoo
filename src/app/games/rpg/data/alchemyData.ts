// rpg/data/alchemyData.ts — 조합(연금) 레시피: 재료+골드 → 전투 소모품
export type AlchemyRecipe = {
    id: string; // 전투 메뉴 필터(id.includes("elixir"))를 위해 반드시 "elixir" 포함
    name: string;
    icon: string;
    desc: string;
    needs: Array<{ id: string; qty: number }>;
    gold: number;
};
export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
    { id: "ether_elixir", name: "에테르 정수", icon: "💠", desc: "파티 전원 에테르 +2 (전투 중 사용)",
      needs: [{ id: "mana_crystal", qty: 2 }], gold: 50 },
    { id: "war_elixir", name: "용맹의 비약", icon: "⚔️", desc: "사용자 공격 +20% (이번 전투 동안)",
      needs: [{ id: "tree_sap", qty: 2 }, { id: "frost_moss", qty: 1 }], gold: 80 },
    { id: "guard_elixir", name: "수호의 비약", icon: "🛡️", desc: "사용자 방어 +20% (이번 전투 동안)",
      needs: [{ id: "frost_moss", qty: 2 }, { id: "tree_sap", qty: 1 }], gold: 80 },
];
