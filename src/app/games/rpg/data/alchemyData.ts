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
    { id: "revive_elixir", name: "부활의 정수", icon: "🕊️", desc: "쓰러진 아군 부활 (HP 50%) — 대상 선택(사망자만)",
      needs: [{ id: "coral_fish", qty: 1 }, { id: "golden_herb", qty: 1 }], gold: 150 },
    { id: "purify_elixir", name: "정화의 정수", icon: "✨", desc: "파티 전원 해로운 효과(poison/burn/freeze/stun) 제거",
      needs: [{ id: "reed", qty: 2 }, { id: "herb", qty: 1 }], gold: 60 },
    { id: "blast_elixir", name: "폭염 정수", icon: "💥", desc: "적 전체 60 피해",
      needs: [{ id: "driftwood", qty: 2 }, { id: "dark_crystal", qty: 1 }], gold: 120 },
    { id: "frost_elixir", name: "서리 정수", icon: "❄️", desc: "적 전체 빙결 1턴",
      needs: [{ id: "frost_moss", qty: 2 }, { id: "silver_trout", qty: 1 }], gold: 180 },
    { id: "swift_elixir", name: "신속의 비약", icon: "💨", desc: "사용자 속도 +10 (99턴)",
      needs: [{ id: "wind_flower", qty: 2 }, { id: "reed", qty: 1 }], gold: 70 },
    { id: "vital_elixir", name: "활력의 비약", icon: "💗", desc: "사용자 매 턴 HP 8 회복 (4턴)",
      needs: [{ id: "lotus", qty: 1 }, { id: "herb", qty: 2 }], gold: 70 },
];
