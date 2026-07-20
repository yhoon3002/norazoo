// rpg/data/storyData.ts — "멈춘 시계탑" 스토리 데이터
// 대사/트리거/체크포인트를 전부 여기서 선언적으로 관리한다 — 시나리오 수정은 이 파일만.
//
// 줄거리: 성채 마을 '노라'의 시계탑이 멈춘 날 주민들이 사라졌다.
// 유일하게 깨어 있는 요리사의 부탁으로, 왕도 조사대(아린·테오·로티)는 흩어진
// 태엽 조각 3개를 찾아 항구 → 바람 언덕 → 어둠의 협곡으로 향한다.

import type { PartyId } from "../types/RpgTypes";
import { GEN_FLAGS, ZONE_DEFS } from "./placementData";

export type DialogueLine = {
    text: string;
    /** NPC/사물 화자 표시명 (파티원이면 생략) */
    speaker?: string;
    /** 파티원 화자 — PARTY_META에서 표시명/색/초상화 조회 */
    speakerId?: PartyId;
};

// NPC/사물 화자 아이콘 (대사 박스 초상화 자리) — 매칭 실패 시 💬
export const NPC_SPEAKERS: Record<string, { icon: string }> = {
    요리사: { icon: "👨‍🍳" },
    일지: { icon: "📜" },
    쪽지: { icon: "📜" },
    소년: { icon: "🧒" },
};

export type StoryTrigger = {
    /** 1회성 발동 관리: flags[`story_${id}`] */
    id: string;
    /** 이 스테이지에서만 발동 */
    stage: string;
    /** 위치 조건: 반경 내 진입 시 */
    near?: { x: number; z: number; radius: number };
    /** 플래그 조건: 전부 true일 때 (처치/보물 등) */
    flagsAll?: string[];
    dialogue?: DialogueLine[];
    nextStage?: string;
    objective?: string;
    /** 다음 목표 지점 — 빛기둥 비콘과 HUD 거리 표시 */
    target?: { x: number; z: number } | null;
};

export const INITIAL_STAGE = "prologue";
export const INITIAL_OBJECTIVE = "마을을 살펴보자";

/** 스테이지 진행 순서 — "이 스테이지 이후" 비교용 */
export const STAGE_ORDER = [
    "prologue",
    "tutorial_merchant",
    "tutorial_treasure",
    "tutorial_battle",
    "ch2_cleanup",
    "ch3_port",
    "ch4_hill",
] as const;

export function stageAtLeast(current: string, target: string): boolean {
    const a = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
    const b = STAGE_ORDER.indexOf(target as (typeof STAGE_ORDER)[number]);
    return a >= 0 && b >= 0 && a >= b;
}

export const STORY_TRIGGERS: StoryTrigger[] = [
    {
        id: "prologue",
        stage: "prologue",
        near: { x: 0, z: 0, radius: 9999 }, // 시작 즉시
        dialogue: [
            {
                speakerId: "arin",
                text: "여기가 노라다. 시계탑이 멈춘 밤, 마을 전체와 연락이 끊겼다 — 왕도의 의뢰는 원인 조사와 생존자 구조. 이상.",
            },
            {
                speakerId: "theo",
                text: "공기 중 에테르가 정체되어 있어요. 시간이… 고여 있달까요. 거리의 주민들이 전부 그 자리에 굳어 있습니다. 흥미롭네요 — 아니, 큰일이네요.",
            },
            {
                speakerId: "lotti",
                text: "저기 광장에 불빛이 있어! 누가 깨어 있나 봐. 굳은 사람들도 조사해 보자(E). 뭔가 단서가 나올지도!",
            },
        ],
        nextStage: "tutorial_merchant",
        objective: "광장의 불빛을 찾아가 말을 걸자",
        target: { x: 12.8, z: -14 },
    },
    {
        id: "meet_cook",
        stage: "tutorial_merchant",
        near: { x: 12.8, z: -14, radius: 3.4 }, // 요리사(상인) 위치
        dialogue: [
            {
                speaker: "요리사",
                text: "손님이라니! 시계탑이 멈춘 뒤로 처음이군. 난 이 마을의 요리사요.",
            },
            {
                speakerId: "lotti",
                text: "사부님! 저예요, 로티! 왕도에서 검 배우러 떠났던… 설마 절 잊으신 건 아니죠?!",
            },
            {
                speaker: "요리사",
                text: "오오, 로티! 많이 컸구나. …그날 밤, 시계탑의 태엽 조각 셋이 흩어지면서 다들 잠들듯 사라졌단다.",
            },
            {
                speaker: "요리사",
                text: "조각을 모아 시계탑을 다시 돌려주게. 우선 저기 빛나는 상자의 물자부터 챙기고.",
            },
        ],
        nextStage: "tutorial_treasure",
        objective: "빛나는 보물상자를 조사하자",
        target: { x: 11.2, z: -16 },
    },
    {
        id: "got_treasure",
        stage: "tutorial_treasure",
        flagsAll: ["treasure_t1"],
        dialogue: [
            {
                speakerId: "lotti",
                text: "좋은 장비다! 인벤토리(I)에서 장착할 수 있어. 갓 구운 빵만큼 든든한걸.",
            },
            {
                speakerId: "arin",
                text: "저쪽에 마물이 보인다. 놈들부터 정리한다.",
            },
            {
                speakerId: "theo",
                text: "적 몸의 링이 조여들어 닿는 순간 — F로 쳐내고(패리), W로 피하세요(회피)! 빨간 링은 회피만 통합니다.",
            },
        ],
        nextStage: "tutorial_battle",
        objective: "남쪽 길의 슬라임을 처치하자 (F: 패리 / W: 회피)",
        target: { x: 12.8, z: -28.8 },
    },
    {
        id: "first_blood",
        stage: "tutorial_battle",
        flagsAll: ["defeated_e1_0", "defeated_e1_1"],
        dialogue: [
            {
                speaker: "요리사",
                text: "제법이군! 북쪽 광장엔 오크 무리가 진을 치고 있소.",
            },
            {
                speaker: "요리사",
                text: "놈들을 정리하면 항구로 가는 길이 열릴 거요. 광장에 깃발을 세워뒀으니 쉬어가시게.",
            },
        ],
        nextStage: "ch2_cleanup",
        objective: "북쪽의 오크 무리를 소탕하자",
        target: { x: 10, z: 2 },
    },
    {
        id: "cleanup_done",
        stage: "ch2_cleanup",
        flagsAll: ["defeated_e2_0", "defeated_e2_1", "defeated_e2_2"],
        dialogue: [
            {
                speakerId: "arin",
                text: "마을은 한숨 돌렸군. 다음은 항구다 — 등대지기가 태엽 조각을 지녔었다지.",
            },
            {
                speakerId: "theo",
                text: "동쪽 골목을 지나면 물가가 나옵니다. 가는 길에 깃발이 보이면 꼭 쉬어 가죠 — 기록은 생명이니까요.",
            },
        ],
        nextStage: "ch3_port",
        objective: "동쪽 해안 길을 따라 항구로 가자 🚩",
        target: { x: 218.6, z: -14.7 },
    },
    {
        id: "reach_port",
        stage: "ch3_port",
        near: { x: 218.6, z: -14.7, radius: 8 },
        dialogue: [
            {
                speakerId: "lotti",
                text: "여기가 항구구나… 배들이 시간에 갇힌 채 멈춰 있어. 생선 비린내조차 안 나.",
            },
            {
                speakerId: "arin",
                text: "등대 앞에 뭔가 반짝인다. 태엽 조각이다. …그리고 이건, 등대지기의 일지인가.",
            },
            {
                speakerId: "theo",
                text: "『협곡의 불빛이 밤마다 커진다. 무언가가 태엽을 삼키고 있다…』 — 흥미롭네요. 그리고 몹시 불길합니다.",
            },
        ],
        nextStage: "ch4_hill",
        objective: "북쪽 바람 언덕의 제단으로 가자 🚩",
        target: { x: 0, z: -210 },
    },
    // ch4_hill(제단 수호전), 최종장 협곡(보스)은 Phase 3에서 확장
];

// ===== 길잡이 마커 경로 (스테이지별) =====
// 벽 여유거리 가중 경로(길 중앙) + 수면·지하층·적 캠프 회피, 전 구간 도보 검증.
// [x, y(지면), z] — y는 렌더 시 navmesh로 재보정.
// 튜토리얼 압축: 스폰(광장 초입)→광장 구간만 안내한다.
export const TRAIL_TOWN: Array<[number, number, number]> = [
    [28, -33.25, -24],
    [28, -33.25, -20.5],
    [27.3, -33.25, -17.7],
    [24.5, -33.25, -17],
    [18.2, -33.25, -17],
    [14.7, -33.25, -17],
];
export const TRAIL_PORT_ROAD: Array<[number, number, number]> = [
    [224.9, -38.25, -16.1],
    [218.6, -38.25, -16.1],
    [215.8, -38.25, -14.7],
    [215.8, -38.25, -8.4],
    [213.7, -38.25, -7],
    [213, -38.25, -1.4],
    [210.2, -38.25, 0],
    [208.1, -38.25, 3.5],
    [205.3, -38.25, 4.2],
    [203.2, -38.25, 5.6],
    [200.4, -38.25, 7],
    [198.3, -38.25, 8.4],
    [192, -37.75, 9.1],
    [185.7, -37.25, 9.1],
    [183.6, -37.25, 7.7],
    [178.7, -37.25, 7.7],
    [177.3, -37.25, 9.8],
    [173.8, -37.25, 10.5],
    [172.4, -37.25, 8.4],
    [167.5, -37.25, 8.4],
    [164.7, -37.25, 6.3],
    [161.9, -37.25, 5.6],
    [161.2, -37.25, -0.7],
    [158.4, -37.25, -1.4],
    [155.6, -36.75, -2.1],
    [149.3, -34.25, -2.1],
    [147.2, -34.25, -3.5],
    [144.4, -34.25, -4.2],
    [142.3, -34.25, -5.6],
    [139.5, -34.25, -5.6],
    [136.7, -34.25, -7],
    [132.5, -34.25, -7],
    [130.4, -34.25, -8.4],
    [128.3, -34.25, -9.8],
    [126.9, -34.25, -11.9],
    [123.4, -33.25, -11.9],
    [122, -33.25, -14.7],
    [119.2, -33.25, -15.4],
    [117.8, -33.25, -18.2],
    [113.6, -33.25, -18.2],
    [112.2, -33.25, -21.7],
    [110.1, -33.25, -23.1],
    [108, -33.25, -25.2],
    [104.5, -33.25, -25.9],
    [101.7, -33.25, -26.6],
    [96.8, -33.25, -26.6],
    [94, -33.25, -28],
    [93.3, -33.25, -29.4],
];
/** 스테이지 → 표시할 길잡이 경로 (튜토리얼: 어귀→광장, 3장: 어귀→항구) */
export const TRAIL_BY_STAGE: Record<string, Array<[number, number, number]>> = {
    prologue: TRAIL_TOWN,
    tutorial_merchant: TRAIL_TOWN,
    ch3_port: TRAIL_PORT_ROAD,
};

// ===== 챕터 타이틀 (스테이지 진입 시 전환 연출) =====
export const CHAPTER_TITLES: Record<
    string,
    { sub: string; title: string; detail?: string }
> = {
    prologue: {
        sub: "왕도 조사대 임무 — 노라 시계탑 조사",
        title: "1장 — 멈춘 마을",
        detail: "시계탑이 멈춘 밤, 마을 전체가 잠들었다",
    },
    ch3_port: { sub: "태엽 조각 · 첫 번째", title: "2장 — 잠든 항구" },
    ch4_hill: { sub: "태엽 조각 · 두 번째", title: "3장 — 바람 언덕" },
};

// ===== 조사 포인트 — 멈춘 주민(석상)과 일지 =====
// 시계탑이 멈춘 밤의 단서를 환경으로 전달한다. 1회 조사 플래그 키: lore_<id>
export type LorePoint = {
    id: string;
    x: number;
    y: number;
    z: number;
    kind: "statue" | "note";
    label: string;
    lines: DialogueLine[];
    /** 이 스테이지부터 깨어난 주민으로 전환 (태엽 조각의 가시적 효과) */
    awakeAtStage?: string;
    awakeLines?: DialogueLine[];
    awakeReward?: Array<{ id: string; qty: number }>;
};

export const LORE_POINTS: LorePoint[] = [
    {
        id: "gate_wife",
        x: 96.8, y: -33.25, z: -26.6,
        kind: "statue",
        label: "굳은 아낙",
        lines: [
            { speakerId: "lotti", text: "빨래 바구니를 든 채로 굳었어… 옷이 아직 축축해. 멈춘 지 얼마 안 됐단 뜻이야." },
            { speakerId: "arin", text: "몸은 따뜻하다. 죽은 게 아니야 — 잠든 거다. 되돌릴 수 있어." },
        ],
    },
    {
        id: "smith",
        x: 40.6, y: -33.25, z: -28.9,
        kind: "statue",
        label: "굳은 대장장이",
        lines: [
            { speakerId: "theo", text: "망치를 치켜든 채 굳었네요. 모루 위의 검은 반만 접혀 있고요. 정지 단면이 이렇게 깨끗하다니." },
            { speakerId: "arin", text: "시계탑 종이 울리던 그 순간, 마을 전체가 한꺼번에 멈춘 거다." },
        ],
    },
    {
        id: "plaza_boy",
        x: 28, y: -33.25, z: -20.5,
        kind: "statue",
        label: "굳은 소년",
        lines: [
            { speakerId: "lotti", text: "연을 쫓다 굳었나 봐. …눈동자가 우리를 따라오는 것 같아." },
            { speakerId: "theo", text: "태엽 조각을 되찾으면 이 아이들도 깨어날 겁니다. 이론상으로는요." },
        ],
        awakeAtStage: "ch4_hill",
        awakeLines: [
            { speaker: "소년", text: "…어? 방금까지 연을 날리고 있었는데! 누, 누구세요?" },
            { speakerId: "lotti", text: "태엽 조각을 되찾을수록 마을이 깨어나고 있어! 얘, 이거 마시고 기운 차려." },
            { speaker: "소년", text: "고마워요! 이거… 광장에서 주운 건데 드릴게요!" },
        ],
        awakeReward: [{ id: "health_potion", qty: 1 }],
    },
    {
        id: "tower_note",
        x: 24.5, y: -33.25, z: -17,
        kind: "note",
        label: "시계탑 관리인의 일지",
        lines: [
            { speaker: "일지", text: "『태엽이 셋으로 갈라져 날아갔다. 하나는 바다로, 하나는 바람의 언덕으로, 하나는… 그 협곡으로.』" },
            { speaker: "일지", text: "『종이 다시 울릴 때까지, 아무도 깨어나지 못하리라.』" },
            { speakerId: "arin", text: "조사 완료다. 태엽 조각 셋 — 그게 우리 임무다." },
        ],
    },
    {
        id: "port_fisher",
        x: 203.2, y: -38.25, z: 5.6,
        kind: "statue",
        label: "굳은 어부",
        lines: [
            { speakerId: "lotti", text: "그물을 당기다 굳었어. 그물 속 물고기도… 공중에 멈춰 있어. 아깝다, 싱싱해 보이는데." },
        ],
    },
    {
        id: "port_note",
        x: 161.2, y: -37.25, z: -0.7,
        kind: "note",
        label: "등대지기의 쪽지",
        lines: [
            { speaker: "쪽지", text: "『협곡의 불빛이 밤마다 커진다. 태엽을 삼킨 무언가가 저기 있다.』" },
        ],
    },
];


// 체크포인트 깃발 (y는 의도한 층 — navmesh 스냅 기준. 없으면 플레이어 층 기준)
export const STORY_FLAGS: Array<{
    id: string;
    x: number;
    z: number;
    y?: number;
    label: string;
}> = [
    { id: "town", x: 11.2, z: -10.4, y: -33.25, label: "마을 광장" },
    { id: "port", x: 218.6, z: -14.7, y: -38.25, label: "항구" },
    { id: "hill", x: 0, z: -210, label: "바람 언덕" },
];

// 존 확장 깃발 — placementData 도로 개방도 최상위 지점 (도달 검증 완료)
for (const f of GEN_FLAGS) {
    STORY_FLAGS.push({
        id: `z_${f.zone}`,
        x: f.x,
        z: f.z,
        y: f.y,
        label: ZONE_DEFS.find((z) => z.id === f.zone)!.label,
    });
}
