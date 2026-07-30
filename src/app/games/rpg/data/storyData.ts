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
    // SP1 T6 — frozenData 화자 라벨 전수(정경 묘사 "…" 포함) 아이콘 등록
    "…": { icon: "⏸️" },
    "빵집 주인": { icon: "🥖" },
    아이들: { icon: "🙈" },
    꽃장수: { icon: "🌸" },
    마부: { icon: "🐴" },
    연인들: { icon: "💑" },
    할머니: { icon: "🧶" },
    파수병: { icon: "👉" },
    소녀: { icon: "📔" },
    짐꾼: { icon: "📦" },
    "늙은 어부": { icon: "🍲" },
    선원: { icon: "🪢" },
    고양이: { icon: "🐱" },
    양치기: { icon: "🐑" },
    순례자: { icon: "🙏" },
    은둔자: { icon: "🍵" },
    광부: { icon: "⛏️" },
    도망자: { icon: "🏃" },
    "공방 주인": { icon: "🧸" },
    견습생: { icon: "🔧" },
    탑지기: { icon: "🕰️" },
    // SP2a T1 — 막간① cs_act2_omen 신규 화자(항구발 전갈을 낭독하는 왕도 전령)
    전령: { icon: "📯" },
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
    /** 발동 시 병합할 플래그 — reward와 동일하게 최초 발동에만 적용 (SP1 최종 리뷰 I-2) */
    setFlags?: Record<string, boolean>;
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
    // SP2a — 2막 「여덟 개의 멈춘 시간」 개막(항구·바람 언덕). 뒤에 append만
    // (구세이브 stage 인덱스 불변 — 에필로그 세이브가 자연스럽게 2막 진입).
    "act2_port",
    "act2_hill",
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
                speakerId: "theo",
                text: "남쪽에서 인기척이 느껴지네요. 정찰해 볼까요?",
            },
            {
                speakerId: "arin",
                text: "저쪽에 마물이 보인다. 놈들부터 정리한다.",
            },
            {
                speakerId: "lotti",
                text: "슬라임이라니, 물컹거리는 건 질색인데… 그래도 해야지, 뭐!",
            },
            {
                speakerId: "theo",
                text: "적 몸의 링이 조여들어 닿는 순간 — F로 쳐내고(패리), W로 피하세요(회피)! 빨간 링은 회피만 통합니다.",
            },
            {
                speakerId: "arin",
                text: "다치지 마라. 둘 다.",
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
                speakerId: "lotti",
                text: "휴, 조용해지니까 마음이 놓이네. 다들 다치진 않았지?",
            },
            {
                speakerId: "theo",
                text: "동쪽 골목을 지나면 물가가 나옵니다. 가는 길에 깃발이 보이면 꼭 쉬어 가죠 — 기록은 생명이니까요.",
            },
            {
                speakerId: "arin",
                text: "서둘러야 한다. 태엽 조각이 물살에 휩쓸리기 전에.",
            },
            {
                speakerId: "lotti",
                text: "항구라니, 거기 생선구이가 유명하다던데… 나중에 꼭 먹어보자!",
            },
            {
                speakerId: "theo",
                text: "바닷바람에 지도 잉크가 번지지 않게 조심하죠. 자, 갑시다.",
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
        // 등대지기의 일지(구 LORE_POINTS.port_note 자리) — 도로변 좌표(161.2,-0.7)가
        // cs_port_arrival 도착 지점(218.6,-14.7)보다 마을 쪽에 있어, stage를 ch3_port로 두면
        // 항구 도착 전에 먼저 지나치며 선발동해 cs_port_arrival의 "나머지도 마저 읽어봐야겠군"
        // 셋업보다 앞서는 순서 역전이 났다(SP1 최종 리뷰 I-1). stage를 ch4_hill로 옮겨
        // 항구→언덕 복귀 동선(reach_port 발동 후 hill_altar로 향하는 길)에서 발동하도록 정정.
        // 원문(『협곡의 불빛이 밤마다 커진다…』)은 cs_lighthouse의 say로 이관+확장(SP1 T5).
        id: "lighthouse_journal",
        stage: "ch4_hill",
        near: { x: 161.2, z: -0.7, radius: 6 },
        cutscene: "cs_lighthouse",
    },
    {
        id: "hill_altar",
        stage: "ch4_hill",
        near: { x: 0, z: -210, radius: 8 },
        // battle 스텝으로 컷신 내부에 이관(id·templates 그대로 → defeated_guardians_0 호환, SP1 T5)
        cutscene: "cs_altar_guardian",
        // 재도전 게이트(StoryTriggers의 battleUnwon) 판정 전용 — cutscene 우선 발동이라
        // 실제 전투는 열지 않는다. 없으면 패배 후 재도전 트리거가 영구 스킵된다(T5 리뷰 회귀).
        battle: { id: "guardians", templates: ["orc_chief", "orc", "orc"] },
    },
    {
        id: "hill_altar_done",
        stage: "ch4_hill",
        flagsAll: ["defeated_guardians_0", "defeated_guardians_1", "defeated_guardians_2"],
        dialogue: [
            { speakerId: "lotti", text: "두 번째 조각이다! 반짝반짝… 갓 구운 파이처럼 탐스러운걸." },
            { speakerId: "arin", text: "이걸로 둘. 하나 남았다." },
            { speakerId: "theo", text: "남은 건 하나 — 쪽지의 '협곡'이군요. 바다 건너 남동쪽 군도입니다." },
            { speakerId: "lotti", text: "협곡이라니… 배 타고 가는 거지? 배멀미만 안 하면 좋겠는데." },
            { speakerId: "arin", text: "항구로 간다. 배를 내줄 사람을 찾지." },
            { speakerId: "theo", text: "사공에게 서둘러 부탁해야겠네요. 이 밤이 더 깊어지기 전에 항구에 닿아야 합니다." },
        ],
        nextStage: "ch5_gorge",
        objective: "항구의 사공을 찾아가자 ⛵",
        target: { x: 224.5, z: -15.5 },
    },
    {
        id: "gorge_landing",
        stage: "ch5_gorge",
        near: { x: 139.5, z: 17.5, radius: 10 },
        cutscene: "cs_gorge_descent",
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
            { speakerId: "lotti", text: "저게… 마수? 커도 너무 크다… 그래도 물러설 순 없어!" },
            { speaker: "태엽을 삼킨 마수", text: "…돌아가라. 시간은 이제, 나의 것이다." },
            { speakerId: "theo", text: "링의 회전이 불규칙해요 — 패턴을 잘 살펴야 합니다. 다들 조심하세요." },
            { speakerId: "arin", text: "노라의 것을 돌려받겠다. 간다!" },
            { speakerId: "lotti", text: "가자! 노라를 위해서!" },
        ],
        battle: { id: "gorge_boss", templates: ["gear_devourer", "clockwork_soldier", "clockwork_soldier"] },
    },
    {
        id: "gorge_boss_done",
        stage: "ch5_gorge",
        flagsAll: ["defeated_gorge_boss_0", "defeated_gorge_boss_1", "defeated_gorge_boss_2"],
        cutscene: "cs_maw_finale",
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
            { speakerId: "arin", text: "…종소리다." },
            { speaker: "요리사", text: "종이… 종이 울린다! 오오, 거리를 봐 — 모두 깨어나고 있어!" },
            { speakerId: "lotti", text: "저기 봐! 빵집 아저씨가 움직여— 진짜야, 갓 구운 빵 냄새가 나!" },
            { speakerId: "theo", text: "곳곳에서 동시에 — 대장간 망치 소리, 아이들 웃음소리, 꽃향기까지. 시간이 정말로 다시 흐르고 있어요." },
            { speakerId: "arin", text: "…다행이다. 정말로." },
            { speakerId: "arin", text: "임무 완료다. …수고했다, 둘 다." },
            { speakerId: "lotti", text: "밤새 얼어 있던 마을이 아침 냄새로 가득해! 우리가 이걸 해낸 거야!" },
            { speakerId: "lotti", text: "끝나고 나니 배고파! 사부님, 축하 잔치 해요!" },
            { speaker: "요리사", text: "여부가 있나! 온 마을이 다 함께 먹을 만큼 차려주지 — 다들 오늘은 배불리 자게!" },
            { speakerId: "theo", text: "노라의 시간이 다시 흐릅니다. 우리가, 해냈어요." },
            { speakerId: "arin", text: "이제부터는… 노라의 아침이다. 마음껏 걸어봐라." },
        ],
        nextStage: "epilogue",
        objective: "되살아난 노라를 자유롭게 여행하자",
        target: null,
        reward: { gold: 3000, items: [ { id: "golden_herb", qty: 3 }, { id: "monster_core", qty: 5 } ] },
        // 항구의 시간도 돌아왔다 — SP2a에서 재발 (SP1 최종 리뷰 I-2)
        setFlags: { phen_port: false },
    },
    // ===== SP2a T1 — 2막 개막 막간① (징조 컷신) =====
    // 에필로그(1막 완료) 상태에서 재건 광장 인근 재진입 시 발동. 신규 스테이지라
    // 구세이브(에필로그 완료본)는 그대로 광장에 서 있다가 자연히 마주친다.
    {
        id: "act2_omen",
        stage: "epilogue",
        near: { x: 12.8, z: -14, radius: 8 }, // 재건 광장(요리사 위치 인근)
        cutscene: "cs_act2_omen",
        nextStage: "act2_port",
        objective: "항구로 — 파도가 다시 멈췄다",
        target: { x: 218.6, z: -14.7 },
    },
    // ===== SP2a T2 — 항구 챕터 「멈춘 파도」 재발 조사 아크(체인 4비트) =====
    // 전부 nextStage 미지정(act2_port 유지) — act2_hill 전이는 T4의 relic 트리거(보스
    // 격파 후) 몫. 좌표는 전부 __navFindWalkable 이원 검증 완료(drift ≤1.0m —
    // scratchpad/sp2a-t2-probe.js·sp2a-t2-probe3.js) + 배치 감사 위반 0
    // (scratchpad/sp2a-t2-audit.ts).
    {
        id: "port2_arrival",
        stage: "act2_port",
        // 부두 초입 — 1막 reach_port(218.6,-14.7) 일대는 treasure:t10·flag:port·
        // trigger:reach_port·보트맨·어군 등 기존 상호작용점이 밀집해 3.5m 클리어 지점이
        // 없다. TRAIL_PORT_ROAD 진입 지점(218.6,-16.1)에서 반경8 안(5.91m)에 들면서도
        // 기존 전 스팟과 3.5m+ 이격된 지점으로 소폭 이동(__navFindWalkable drift 0.50m,
        // 배치 감사 위반 0 — sp2a-t2-audit.ts).
        near: { x: 219, z: -22, radius: 8 },
        cutscene: "cs_port2_arrival",
        objective: "깨어난 주민들의 증언을 듣자",
        target: { x: 231.5, z: -19 },
    },
    {
        // 증언 완료 판정은 두 주민(f_porter·f_sailor)의 awake2 E 조사를 직접 게이팅하지
        // 않는다 — FrozenVillager는 임의 플래그를 세우는 계약이 없으므로, 두 주민 사이
        // 부두 중간 지점 근접으로 "증언 2곳 순회"를 대신한다(주민 E는 연출, 진행은 트리거).
        id: "port2_witness",
        stage: "act2_port",
        near: { x: 231.5, z: -19, radius: 8 }, // 부두 중간(f_porter 230,-30 / f_sailor 233,-8의 중점)
        // 순서 게이트 — 패스트트래블("항구" 깃발)이 arrival 반경(219,-22 r8) 밖 8.71m에
        // 착지해 위치 게이트만으론 arrival을 건너뛰고 여기부터 진행 가능했다(T2 리뷰 재현).
        flagsAll: ["story_port2_arrival"],
        dialogue: [
            { speakerId: "arin", text: "짐꾼도, 뱃사람도 같은 말을 했다. 파도가 멎었던 그 밤이 되풀이됐다고. 그리고 부두 끝에서 이상한 소용돌이를 봤다더군." },
            { speakerId: "theo", text: "두 증언이 겹친다는 건 우연이 아닐 겁니다. 부두 끝의 소용돌이부터 확인해 보죠." },
            { speakerId: "lotti", text: "그 밤이 또…? 국이 다시 끓어오르듯 파도가 되살아났다니, 이번엔 얼른 잠재우고 오자." },
        ],
        objective: "부두 끝의 소용돌이를 조사하자",
        target: { x: 245, z: -15 },
    },
    {
        id: "port2_vortex",
        stage: "act2_port",
        near: { x: 245, z: -15, radius: 8 }, // 부두 끝
        flagsAll: ["story_port2_witness"],
        dialogue: [
            { speakerId: "theo", text: "저게… 소용돌이입니다. 자연스러운 물살이 아니에요 — 파도가 한 지점으로만 계속 빨려 들어가고 있어요." },
            { speakerId: "arin", text: "바닥에 뭔가 있다는 뜻이다. …물 아래, 침수된 창고 쪽인가." },
            { speakerId: "lotti", text: "저 아래 뭐가 있든, 이번에도 우리가 건져내야겠지. 생선구이는 다음으로 미뤄야겠다." },
        ],
        objective: "부두 입구로 돌아가자",
        target: { x: 216, z: -12 },
        setFlags: { port2_vortex_found: true },
    },
    {
        // 아린 서사 1장 — 부두에서 왕도 전령과 조우(cs_act2_omen과 동일 인물, "전령" 라벨 재사용).
        // 봉인 서신 낭독 + 아린 갈등 개시("그분" 직접 명명 없이 교차).
        id: "port2_arin",
        stage: "act2_port",
        near: { x: 216, z: -12, radius: 8 }, // 부두 입구 인근(항구 앵커 대역 214~235,-38층 안)
        flagsAll: ["story_port2_vortex"],
        cutscene: "cs_arin_letter",
        objective: "소용돌이 아래, 침수된 창고를 살펴보자",
        target: { x: 245, z: -15 },
    },
    // ===== SP2a T4 — 항구 보스 「파도를 삼킨 자」 + 유물① =====
    // 던전(침수 창고) 최심부 — T3의 PORT_WAREHOUSE_BOSS_ENTRY(198,-42.25,-35) 기준, 인접
    // 상호작용물(door2 198,-39·switch2 200,-38·정예팩2 201,-42.25,-34)과 3.5m+ 이격을 위해
    // 트리거 중심을 (195,-37)로 소폭 이동(door2까지 3.61m·switch2 5.10m·elite2 6.71m — 전부
    // 3.5m+, elite2는 6.71m로 8m에는 못 미치나 좁은 방 구조상 가능한 최대 여유. __navFindWalkable
    // 드리프트 0.09m + 실텔레포트 착지 dy=0.00 이원 검증 완료 — scratchpad/sp2a-t4-scan5.js).
    // battle 필드 병기 — cutscene(cs_port2_relic) 우선 발동이라 실제 전투는 컷신의 battle
    // 스텝이 열지만, 여기 병기해야 패배 후 재도전 시 StoryTriggers의 battleUnwon 게이트가
    // 동작한다(없으면 재도전 트리거가 영구 스킵 — T5 이월 규약).
    {
        id: "port2_boss",
        stage: "act2_port",
        near: { x: 195, z: -37, radius: 3 },
        flagsAll: ["port2_vortex_found"],
        cutscene: "cs_port2_relic",
        battle: { id: "port2_boss", templates: ["wave_devourer"] },
    },
    // 유물 회수·phen_port2 소등·act2_hill 전이 — cs_port2_relic 자체의 set 스텝이 아니라 별도
    // 후속 트리거로 분리(1막 finale의 phen_port 소등 전례와 동일 설계). startCutscene은 재도전
    // 때마다 set 스텝을 선적용하므로, 만약 phen_port2:false를 cs_port2_relic 안에 두면 패배 후
    // 재접근만으로도(전투 승리 전에) 현상이 꺼져버린다 — defeated_port2_boss_0 플래그로
    // 게이팅되는 이 트리거에서만 반영해야 "패배 후 재도전 시 현상이 미리 꺼지지 않는다"가 성립.
    {
        id: "port2_relic",
        stage: "act2_port",
        flagsAll: ["defeated_port2_boss_0"],
        dialogue: [
            { speakerId: "lotti", text: "물살이… 멎었어! 소용돌이가 가라앉고 있어. 우리가 해낸 거야!" },
            { speakerId: "theo", text: "유물이 파도의 힘 그 자체를 붙들고 있었던 모양이에요. 회수합니다 — 파도의 유물, 첫 번째." },
            { speakerId: "arin", text: "이걸로 하나. …'그분'과 이어진 조각인가는, 왕도로 돌아가면 밝혀지겠지." },
            { speakerId: "lotti", text: "항구는 이제 괜찮을 거야. 다음은 바람 부는 언덕 쪽이라고 했지? 가자!" },
        ],
        nextStage: "act2_hill",
        objective: "바람 언덕으로 향하자",
        target: { x: 0, z: -210 },
        setFlags: { relic_wave: true, phen_port2: false },
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
        // 등대지기 일지 재열람 — cs_lighthouse(T5) 3편 원문의 요약본. 낭독 컷신과 별개로
        // 항구 도로변에 남겨진 사본을 언제든 다시 조사할 수 있게 한다(SP1 T6 §④).
        // lighthouse_journal 트리거(161.2,-0.7, near radius 6)에서 9.98m 이격 —
        // 단순 3.5m+ 최소 간격이 아니라 트리거의 자동발동 반경(6m) 밖에 두어 진입 시
        // cs_lighthouse가 겹쳐 발동하는 것을 방지(헤드리스 실측으로 최초 배치 5.87m는
        // 반경 6m 안쪽이라 재진입 시 컷신이 끼어드는 충돌을 확인해 재배치, 두 번째 후보
        // (170,6)는 treasure:t8과 3.39m로 미달해 재차 이동). 기존 스팟 전수 3.5m+
        // (audit-lore-e.ts, __navFindWalkable 드리프트 0.00m) 실측 완료.
        id: "lighthouse_recap",
        x: 168, y: -37.25, z: -8,
        kind: "note",
        label: "등대지기의 일지 (요약본)",
        lines: [
            { speaker: "일지", text: "『협곡의 불빛이 밤마다 커지고, 태엽 부품이 하나씩 사라지더니 — 이레째 밤, 마침내 '그분'이 협곡에서 걸어 나왔다.』" },
            // 시점 중립 리워딩 — 협곡 미조우 시점에도 열람 가능하도록 과거 조우를
            // 전제하지 않는다(SP1 최종 리뷰 M-4). '그분'은 cs_lighthouse 3편에서 이미 명명.
            { speakerId: "theo", text: "다시 읽어도 소름 끼치는 기록이에요. …협곡의 '그분'과, 분명 같은 존재일 겁니다." },
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
];
// port_note(등대지기의 쪽지, 161.2,-37.25,-0.7)는 SP1 T5에서 원문을 cs_lighthouse의
// say 3편으로 이관·확장했다 — 동일 지점의 신규 StoryTrigger(lighthouse_journal)가
// 근접 시 자동 발동하므로 별도 조사(E) 오브젝트로는 유지하지 않는다.


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
