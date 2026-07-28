// rpg/data/storyData.ts — "멈춘 시계탑" 스토리 데이터
// 대사/트리거/체크포인트를 전부 여기서 선언적으로 관리한다 — 시나리오 수정은 이 파일만.
//
// 줄거리: 성채 마을 '노라'의 시계탑이 멈춘 날 주민들이 사라졌다.
// 유일하게 깨어 있는 요리사의 부탁으로, 왕도 조사대(아린·테오·로티)는 흩어진
// 태엽 조각 3개를 찾아 항구 → 바람 언덕 → 어둠의 협곡으로 향한다.

import type { PartyId } from "../types/RpgTypes";
import { GEN_FLAGS, GORGE_BOSS_ARENA, ZONE_DEFS } from "./placementData";

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
    "태엽을 삼킨 마수": { icon: "⚙️" },
    사공: { icon: "⛵" },
    아낙: { icon: "🧺" },
    대장장이: { icon: "🔨" },
    어부: { icon: "🎣" },
    파수꾼: { icon: "🛡️" },
    "견습 대장장이": { icon: "⚒️" },
    // 웨이브2 — 외곽 5존 사이드퀘스트 NPC
    약초술사: { icon: "🧪" },
    사냥꾼: { icon: "🏹" },
    강태공: { icon: "🎣" },
    "퇴역 뱃사람": { icon: "⚓" },
    태엽기술자: { icon: "⚙️" },
    "투기장 관장": { icon: "🏟️" },
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
    /** 컷신 트리거 — 지정 시 dialogue/battle 대신 startCutscene(cutscene) 발동 (SP1) */
    cutscene?: string;
    nextStage?: string;
    objective?: string;
    /** 다음 목표 지점 — 빛기둥 비콘과 HUD 거리 표시 */
    target?: { x: number; z: number } | null;
    /** 대사 종료 후 전투 진입 — Task 4가 파이프라인 구현 */
    battle?: { id: string; templates: string[] };
    /** 발동 시 지급 — Task 4 구현 */
    reward?: { gold?: number; items?: Array<{ id: string; qty: number }> };
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
    "ch5_gorge",
    "epilogue",
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
        cutscene: "cs_opening",
        nextStage: "tutorial_merchant",
        objective: "광장의 불빛을 찾아가 말을 걸자",
        target: { x: 12.8, z: -14 },
    },
    {
        id: "meet_cook",
        stage: "tutorial_merchant",
        near: { x: 12.8, z: -14, radius: 3.4 }, // 요리사(상인) 위치
        cutscene: "cs_cook_meet",
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
        cutscene: "cs_first_battle",
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
        cutscene: "cs_port_arrival",
        nextStage: "ch4_hill",
        objective: "북쪽 바람 언덕의 제단으로 가자 🚩",
        target: { x: 0, z: -210 },
    },
    {
        id: "hill_altar",
        stage: "ch4_hill",
        near: { x: 0, z: -210, radius: 8 },
        dialogue: [
            { speakerId: "theo", text: "제단이에요. 두 번째 태엽 조각의 파동이… 바로 아래에서 느껴집니다." },
            { speakerId: "arin", text: "기척이 있다. 수호자다 — 무기 들어." },
        ],
        battle: { id: "guardians", templates: ["orc_chief", "orc", "orc"] },
    },
    {
        id: "hill_altar_done",
        stage: "ch4_hill",
        flagsAll: ["defeated_guardians_0", "defeated_guardians_1", "defeated_guardians_2"],
        dialogue: [
            { speakerId: "lotti", text: "두 번째 조각이다! 반짝반짝… 갓 구운 파이처럼 탐스러운걸." },
            { speakerId: "theo", text: "남은 건 하나 — 쪽지의 '협곡'이군요. 바다 건너 남동쪽 군도입니다." },
            { speakerId: "arin", text: "항구로 간다. 배를 내줄 사람을 찾지." },
        ],
        nextStage: "ch5_gorge",
        objective: "항구의 사공을 찾아가자 ⛵",
        target: { x: 224.5, z: -15.5 },
    },
    {
        id: "gorge_landing",
        stage: "ch5_gorge",
        near: { x: 139.5, z: 17.5, radius: 10 },
        dialogue: [
            { speakerId: "arin", text: "…공기가 다르다. 여기가 어둠의 협곡이군." },
            { speakerId: "theo", text: "시간의 정체가 가장 짙어요. 태엽 조각이 — 아니, '삼킨 자'가 깊은 곳에 있습니다." },
            { speakerId: "lotti", text: "발밑 조심해. 뭔가… 움직이고 있어." },
        ],
        objective: "협곡 깊은 곳의 기척을 쫓자",
        target: { x: GORGE_BOSS_ARENA.x, z: GORGE_BOSS_ARENA.z },
    },
    {
        id: "gorge_boss_intro",
        stage: "ch5_gorge",
        near: { x: GORGE_BOSS_ARENA.x, z: GORGE_BOSS_ARENA.z, radius: 10 },
        flagsAll: ["story_gorge_landing"],
        dialogue: [
            { speakerId: "theo", text: "저기! 태엽 조각을… 몸에 박아 넣은 마수예요. 시간을 삼키며 자란 겁니다." },
            { speaker: "태엽을 삼킨 마수", text: "…돌아가라. 시간은 이제, 나의 것이다." },
            { speakerId: "arin", text: "노라의 것을 돌려받겠다. 간다!" },
        ],
        battle: { id: "gorge_boss", templates: ["gear_devourer", "clockwork_soldier", "clockwork_soldier"] },
    },
    {
        id: "gorge_boss_done",
        stage: "ch5_gorge",
        flagsAll: ["defeated_gorge_boss_0", "defeated_gorge_boss_1", "defeated_gorge_boss_2"],
        dialogue: [
            { speakerId: "lotti", text: "해냈어…! 마지막 조각이야!" },
            { speakerId: "theo", text: "세 조각이 공명하고 있어요. 시계탑이 부르는 겁니다." },
            { speakerId: "arin", text: "돌아가자. 노라의 아침을 되찾으러." },
        ],
        objective: "노라로 돌아가 시계탑을 깨우자 🔔",
        target: { x: 24.5, z: -17 },
    },
    {
        id: "finale",
        stage: "ch5_gorge",
        near: { x: 24.5, z: -17, radius: 6 },
        flagsAll: ["story_gorge_boss_done"],
        dialogue: [
            { speakerId: "theo", text: "조각을 끼웁니다… 하나, 둘… 셋!" },
            { speaker: "요리사", text: "종이… 종이 울린다! 오오, 거리를 봐 — 모두 깨어나고 있어!" },
            { speakerId: "arin", text: "임무 완료다. …수고했다, 둘 다." },
            { speakerId: "lotti", text: "끝나고 나니 배고파! 사부님, 축하 잔치 해요!" },
            { speakerId: "theo", text: "노라의 시간이 다시 흐릅니다. 우리가, 해냈어요." },
        ],
        nextStage: "epilogue",
        objective: "되살아난 노라를 자유롭게 여행하자",
        target: null,
        reward: { gold: 3000, items: [ { id: "golden_herb", qty: 3 }, { id: "monster_core", qty: 5 } ] },
    },
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
    ch5_gorge: { sub: "태엽 조각 · 마지막", title: "종장 — 어둠의 협곡" },
    epilogue: {
        sub: "노라의 아침",
        title: "종막 — 시계탑이 깨어나다",
        detail: "멈췄던 시간이 다시 흐른다",
    },
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
        awakeAtStage: "epilogue",
        awakeLines: [
            { speaker: "아낙", text: "어머, 빨래가 다 말랐네! …당신들이 구해준 거죠? 고마워요!" },
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
        awakeAtStage: "epilogue",
        awakeLines: [
            { speaker: "대장장이", text: "망치가… 움직인다! 하하, 밀린 일감이 산더미군. 고맙네, 원정대!" },
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
        awakeAtStage: "epilogue",
        awakeLines: [
            { speaker: "어부", text: "그물이 이렇게 무거웠나! 이봐, 오늘 잡은 건 전부 자네들 몫일세!" },
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
