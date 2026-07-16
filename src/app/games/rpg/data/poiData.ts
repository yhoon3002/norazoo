// rpg/data/poiData.ts — 탐험 보상 포인트 (전망 포인트 + 숨은 보물 지도 연동)
// 발견: flags[`poi_${id}`] — 반경 접근 시 자동 발견, 보상 지급

export type Poi = {
    id: string;
    x: number;
    z: number;
    /** 의도 층 지면 y (없으면 플레이어 층 기준 스냅) */
    y?: number;
    label: string;
    desc: string;
    rewardGold: number;
    rewardExp: number;
};

export const POIS: Poi[] = [
    {
        id: "pier_end",
        x: 224.9, z: -16.1, y: -38.25,
        label: "부두 끝",
        desc: "시간이 멈춘 바다가 한눈에 들어온다",
        rewardGold: 80, rewardExp: 40,
    },
    {
        id: "hill_path",
        x: 0, z: -170,
        label: "바람 언덕 초입",
        desc: "마을 너머 벌판으로 멈춘 바람의 결이 보인다",
        rewardGold: 80, rewardExp: 40,
    },
    {
        id: "east_coast",
        x: 150, z: 6, y: -35,
        label: "동쪽 해안",
        desc: "굳은 파도가 유리처럼 반짝인다",
        rewardGold: 80, rewardExp: 40,
    },
];

/** 지도 '?' 표시 대상인 숨은 보물 (FIELD_TREASURES의 t11~t16) */
export const HIDDEN_TREASURE_IDS = ["t11", "t12", "t13", "t14", "t15", "t16"];
