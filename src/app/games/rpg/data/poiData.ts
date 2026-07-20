// rpg/data/poiData.ts — 탐험 보상 포인트 (전망 포인트 + 숨은 보물 지도 연동)
// 발견: flags[`poi_${id}`] — 반경 접근 시 자동 발견, 보상 지급
import { ZONE_DEFS, GEN_POIS, GEN_TREASURES } from "./placementData";

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

// 존 전망 포인트 — 고지대/물가 (티어별 보상)
const ZONE_POI_DESC: Record<string, string> = {
    town: "성채와 광장이 한눈에 들어온다",
    port: "멈춘 만의 물결이 유리처럼 빛난다",
    hill: "바람의 결이 굳은 벌판",
    west_forest: "끝없는 수해가 펼쳐진다",
    north_woods: "서리 낀 숲 사이로 옛길이 보인다",
    ne_water: "갈대밭 너머 수로가 얽혀 있다",
    south_coast: "굳은 파도가 해안을 감싼다",
};
for (const zd of ZONE_DEFS) {
    GEN_POIS[zd.id].forEach((s, i) => {
        POIS.push({
            id: `z_${zd.id}${i}`,
            x: s.x,
            z: s.z,
            y: s.y,
            label: `${zd.label} 전망`,
            desc: ZONE_POI_DESC[zd.id] ?? "",
            rewardGold: 100,
            rewardExp: 60,
        });
    });
}

/** 지도 '?' 표시 대상인 숨은 보물 (FIELD_TREASURES의 t11~t16) */
export const HIDDEN_TREASURE_IDS = ["t11", "t12", "t13", "t14", "t15", "t16"];

// 지도 '?' 대상에 존 보물 포함
for (const zd of ZONE_DEFS) {
    GEN_TREASURES[zd.id].forEach((_, i) => {
        HIDDEN_TREASURE_IDS.push(`z_${zd.id}_t${i}`);
    });
}
