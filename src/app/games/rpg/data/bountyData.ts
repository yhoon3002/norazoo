// rpg/data/bountyData.ts — 사냥 의뢰 (반복 수주 가능: 수락→토벌→보상→재수락)
export type Bounty = {
    id: string;
    label: string;
    desc: string;
    template: string;
    count: number;
    rewardGold: number;
    rewardItems: Array<{ id: string; qty: number }>;
};

export const BOUNTIES: Bounty[] = [
    { id: "slime_cull", label: "슬라임 소탕", desc: "마을 주변 슬라임 5마리", template: "slime", count: 5, rewardGold: 120, rewardItems: [{ id: "health_potion", qty: 1 }] },
    { id: "orc_cull", label: "오크 토벌", desc: "언덕의 오크 4마리", template: "orc", count: 4, rewardGold: 200, rewardItems: [{ id: "iron_ore", qty: 1 }] },
    { id: "zombie_cull", label: "좀비 정화", desc: "서부 숲 좀비 4마리", template: "zombie", count: 4, rewardGold: 260, rewardItems: [{ id: "tree_sap", qty: 2 }] },
    { id: "witch_hunt", label: "마녀 추격", desc: "북부 숲 마녀 3마리", template: "witch", count: 3, rewardGold: 380, rewardItems: [{ id: "frost_moss", qty: 2 }] },
    { id: "ninja_hunt", label: "그림자 사냥", desc: "수변 지구 닌자 3마리", template: "ninja", count: 3, rewardGold: 450, rewardItems: [{ id: "silver_ore", qty: 1 }] },
    { id: "mage_cull", label: "마물 술사 처치", desc: "마법사 마물 3마리", template: "mage", count: 3, rewardGold: 220, rewardItems: [{ id: "mana_crystal", qty: 2 }] },
    { id: "slime_mass", label: "슬라임 대량 소탕", desc: "슬라임 12마리", template: "slime", count: 12, rewardGold: 320, rewardItems: [{ id: "golden_herb", qty: 1 }] },
    { id: "core_hunt", label: "결정 수집가", desc: "아무 마물 10마리", template: "*", count: 10, rewardGold: 300, rewardItems: [{ id: "monster_core", qty: 2 }] },
];
