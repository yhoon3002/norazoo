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
    // SP2a T5 — cs_lotti_home 신규 화자(목장 오두막에서 발견한 사부의 낡은 조리 노트)
    "조리 노트": { icon: "📓" },
    // SP2a T6 — cs_hill2_boss 신규 화자(제단 지하의 보스, "태엽을 삼킨 마수" 계열 명명)
    "새벽을 삼킨 자": { icon: "🌅" },
    // SP2a 최종 리뷰(F3) — cs_port2_relic 화자 미등록 발견분(항구 보스, 위와 동일 계열)
    "파도를 삼킨 자": { icon: "🌊" },
    // SP2b T1 — cs_theo_camp 신규 화자(테오 스승의 옛 연구 캠프에서 발견한 낡은 노트)
    "낡은 노트": { icon: "📔" },
    // SP2b T3 — cs_forest_boss 신규 화자(뿌리 굴 최심부의 보스, "…을 삼킨 자" 계열 명명)
    "계절을 삼킨 자": { icon: "🍂" },
    // SP2b T4 — cs_woods_boss 신규 화자(숲길 정점 공터의 야외 보스, "…을 삼킨 자" 계열 명명)
    "길을 삼킨 자": { icon: "👣" },
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
    // SP2b — 2막 두 번째 묶음(서부·북부 3존: 대삼림·숲길·수변). 뒤에 append만
    // (act2_hill 이후 구세이브의 스테이지 인덱스 불변 — act2a_done 세이브는 대삼림
    // 접근로 트리거 대기 상태로 자연히 이어진다).
    "act2_forest",
    "act2_woods",
    "act2_water",
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
        // [최종 리뷰 반영 — F1/F2] flagsAll에 두 조건 추가:
        // ① story_port2_arin — witness/vortex/arin 체인엔 이미 flagsAll 순서 게이트가
        //    있는데 boss만 없어서, vortex 발동 지점(245,-15)과 던전 게이트(245,-19)가
        //    4m 거리인 탓에 arin 서신(act2_port 전용 컷신)을 건너뛰고 곧장 보스로 직행하면
        //    아린 서신이 act2_hill 전이로 영구 사장됐다 — 순서 게이트로 해소.
        // ② door_port_warehouse_2 — 트리거가 XZ만 보고 y를 안 봐서, 이 XZ 바로 위
        //    지상 워크웨이(y≈-39.49)에서도 오발화가 재현됐다(sp2a-final-crosslayer-fire3.js).
        //    문2 스위치는 y가드(DungeonDoor.tsx:88)가 있어 지상에서 조작 불가 — 문2 플래그
        //    게이트는 실질적으로 "던전 실경로를 다 통과해야 발화"를 강제하는 것과 동치라
        //    정상 플레이(문을 반드시 여는 경로)에는 영향이 없다.
        flagsAll: ["port2_vortex_found", "story_port2_arin", "door_port_warehouse_2"],
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
    // ===== SP2a T5 — 바람 언덕 챕터 「반복되는 하루」 재발 조사 아크(체인 4비트) =====
    // T2(항구)와 동일 패턴: 전부 nextStage 미지정(act2_hill 유지) — 던전/보스로의 전이는
    // T6(제단 지하) 몫. 좌표는 전부 __navFindWalkable 이원 검증 완료(drift 0.00m —
    // scratchpad/sp2a-t5-probe1.js·sp2a-t5-probe2.js) + 배치 감사 위반 0
    // (scratchpad/sp2a-t5-audit.ts).
    {
        // 언덕 초입 — GEN_POIS.hill의 "바람 언덕 초입"(0,-170, poiData.ts) 관성 명칭을 그대로
        // 잇는 지점. POI 자체와는 8m 이격(3.5m+ 충분), hill_altar(0,-210 r8, ch4_hill
        // 전용 스테이지라 물리 충돌 없음)와도 32m 이격.
        id: "hill2_arrival",
        stage: "act2_hill",
        near: { x: 0, z: -178, radius: 8 },
        cutscene: "cs_hill2_arrival",
        objective: "되풀이되는 하루의 증인들을 찾자",
        target: { x: -3.5, z: -213.8 },
    },
    {
        // f_shepherd(22,-235)·f_hermit(-32,-192) 실좌표의 중점(-5,-213.5) 부근 —
        // navFindWalkable 스냅 지점(-3.5,-213.8, drift 0.00m)을 그대로 채택.
        // 순서 게이트 — port2_witness와 동일 이유(T2 리뷰 반영: 패스트트래블로 arrival을
        // 건너뛰고 여기부터 진행 가능한 우회 방지). 언덕 존에도 패스트트래블 깃발("hill",
        // 0,-210)이 있어 동일 리스크가 있다.
        id: "hill2_witness",
        stage: "act2_hill",
        near: { x: -3.5, z: -213.8, radius: 8 },
        flagsAll: ["story_hill2_arrival"],
        dialogue: [
            { speakerId: "arin", text: "양치기도, 은둔자도 같은 말을 했다. 어제가 기억나지 않는다고. 그리고 둘 다 '늘 같은 온도의 찻물'을 이야기했다." },
            { speakerId: "theo", text: "기억이 겹친다는 것도 예사롭지 않지만, '항상 같은 온도'라는 표현이 특히 걸립니다. 하루가 통째로 다시 재생되고 있다는 뜻일 수 있어요." },
            { speakerId: "lotti", text: "매일 아침 같은 스튜를 끓이는 거랑은 달라… 이건 재료도, 불 조절도 하나 안 바뀌는 거잖아. 소름 끼치게 완벽해." },
        ],
        objective: "반복의 근원을 찾아가자",
        target: { x: 18, z: -242 },
    },
    {
        // 제단 뒤 목장 — f_shepherd(22,-235) 인근(8.6m 이격, "그 목장의 양치기"라는 인상은
        // 유지하되 3.5m+ 규약 준수). 반복의 진원이 발견되는 지점(T2의 vortex 대응).
        id: "hill2_source",
        stage: "act2_hill",
        near: { x: 18, z: -242, radius: 8 },
        flagsAll: ["story_hill2_witness"],
        dialogue: [
            { speakerId: "theo", text: "이 목장… 시간이 가장 깊게 고여 있어요. 제단 바로 뒤편이라는 게 우연은 아닐 겁니다." },
            { speakerId: "arin", text: "여기가 근원이다. …울타리 안쪽, 오두막에서 뭔가 새어 나온다." },
            { speakerId: "lotti", text: "저 오두막… 어쩐지 낯이 익어. 이상하다, 와 본 적도 없는데." },
        ],
        objective: "낯익은 오두막을 살피자",
        target: { x: 32, z: -248 },
        // T6 던전 게이트 인터페이스 — hill2_source 트리거에서 산출(브리프 지시).
        setFlags: { hill2_source_found: true },
    },
    {
        // 오두막 — 로티의 고향, 사부의 낡은 조리 노트(T2의 arin 대응: 서사 컷신 + 귀환 동선).
        id: "hill2_lotti",
        stage: "act2_hill",
        near: { x: 32, z: -248, radius: 8 },
        flagsAll: ["story_hill2_source"],
        cutscene: "cs_lotti_home",
        objective: "제단 지하로 이어진 길을 찾자",
        target: { x: 0, z: -210 },
    },
    // ===== SP2a T6 — 언덕 보스 「새벽을 삼킨 자」 + 유물② + SP2b 브리지 =====
    // 던전(제단 지하) 최심부 — HILL_UNDERCROFT_BOSS_ENTRY(69,-54.25,-189) 기준.
    // 문2(63.5,-190)·스위치2(60.71,-191.71)·정예2(55,-200)와 각각 5.59m·8.72m·
    // 17.80m 이격(전부 3.5m+, 정예팩 2곳 모두와 8m+ 확보 — T4의 6.71m 미달 전례를
    // 반영해 처음부터 여유를 뒀다. __navFindWalkable 드리프트 0.00m + 실텔레포트
    // 착지 dy=0.25m 이원 검증 완료 — scratchpad/sp2a-t6-final-precise.js).
    // battle 필드 병기 — cutscene(cs_hill2_boss) 우선 발동이라 실제 전투는 컷신의
    // battle 스텝이 열지만, 여기 병기해야 패배 후 재도전 시 StoryTriggers의
    // battleUnwon 게이트가 동작한다(없으면 재도전 트리거가 영구 스킵 — T5 이월 규약).
    {
        id: "hill2_boss",
        stage: "act2_hill",
        near: { x: 69, z: -189, radius: 3 },
        // [최종 리뷰 반영 — F1/F2] port2_boss와 동일한 비대칭 해소(위 주석 참조).
        // ① story_hill2_lotti — 로티의 오두막 서사(hill2_lotti)를 건너뛰고 곧장 보스로
        //    직행하면 act2_hill이 STAGE_ORDER 최종 스테이지라 되돌아올 스테이지 전이가
        //    없어 그 서사가 영구 사장된다.
        // ② door_hill_undercroft_2 — 제단 지하 상부 표층(y≈-27.8)에서의 XZ-only 오발화
        //    방지(sp2a-final-crosslayer-fire3.js). 문2 스위치도 y가드로 지상 조작 불가.
        flagsAll: ["hill2_source_found", "story_hill2_lotti", "door_hill_undercroft_2"],
        cutscene: "cs_hill2_boss",
        battle: { id: "hill2_boss", templates: ["dawn_devourer"] },
    },
    // 유물 회수·phen_hill 소등·여명 전환 — cs_hill2_relic 자체의 set 스텝(1막 finale·
    // T4 port2_relic 전례와 동일 설계: defeated_hill2_boss_0로 게이팅되는 별도
    // 트리거이므로 패배 후 재도전만으로는 선적용되지 않는다 — 승리해야만 발동).
    // 여명 연출(phen_hill 소등)이 실제로 보이려면 카메라가 던전 자체 조명
    // 오버라이드가 아니라 지상이어야 하므로, near로 게이트 지상측(8,-204) 인근을
    // 요구해 "던전을 나와야 발동"하게 했다 — 승리 직후 던전 내부에서 곧장 컷신이
    // 재생되면 던전 조명(짙은 흙빛)에 가려 소등 연출이 무의미해지는 것을 방지.
    {
        id: "hill2_relic",
        stage: "act2_hill",
        near: { x: 8, z: -204, radius: 8 },
        flagsAll: ["defeated_hill2_boss_0"],
        cutscene: "cs_hill2_relic",
        objective: "돌아갈 채비를 하자",
        target: null,
    },
    // ===== SP2b 브리지 — SP2a 마감 트리거 =====
    // act2_hill이 STAGE_ORDER 최종 스테이지라 nextStage가 없다 — 대신 이 트리거가
    // flags.act2a_done을 세워 SP2b 진입점을 산출한다(브리프 지시). cs_hill2_relic
    // 재생 직후 같은 자리(지상 게이트 인근)에서 곧장 이어지는 장면이라 근접
    // 반경을 다시 두지 않았다(같은 지점에서 컷신 종료 후 자연 발동).
    {
        id: "act2a_bridge",
        stage: "act2_hill",
        flagsAll: ["story_hill2_relic"],
        dialogue: [
            { speaker: "전령", text: "실례합니다 — 다시 뵙는군요. 이번엔 서부 숲 쪽에서 급보가 왔습니다." },
            { speaker: "전령", text: "『밤사이 나무들이 통째로 자리를 옮겼다.』 그곳 파수꾼이 보내온 전갈입니다. …믿기 어려운 얘기지만, 요 며칠 조짐들을 보면 그냥 흘려들을 수도 없었습니다." },
            { speakerId: "theo", text: "나무가 자리를 옮기다니 — 항구의 파도, 이 언덕의 아침에 이어 벌써 세 번째 재발이군요. 대륙 전역이라던 그 서신, 틀린 말이 아니었나 봅니다." },
            { speakerId: "arin", text: "…쉴 틈이 없군. 하지만 지금은 아니다. 이 언덕부터 마저 정리한다." },
            { speakerId: "lotti", text: "맞아, 우선 한숨 돌리자! 그래도… 서부 숲이라니, 이번엔 또 무슨 냄새가 날지 궁금하긴 하네." },
            { speakerId: "theo", text: "기록해 두겠습니다 — 다음 조사지는 서부의 숲입니다." },
        ],
        objective: "서부 숲의 이상 징후는 다음 몫이다 — 지금은 자유로이 언덕을 둘러보자",
        target: null,
        setFlags: { act2a_done: true },
    },
    // ===== SP2b T1 — 서부 대삼림 챕터 「계절이 뒤엉킨 숲」 조사 아크(체인 4비트) =====
    // T2/T5(항구·언덕)와 동일 패턴: 전부 nextStage 미지정(진입 트리거만 예외) — 순서 게이트
    // 전 구간 flagsAll 적용(SP2a 최종 리뷰 규약, 예외 없음).
    //
    // [T1 리뷰 수정 — 2026-08] 최초 구현분 4지점 전부가 컨트롤러 육안 확인(사후 확정 샷)에서
    // 상층/고립 지형에 앉아 있었음이 드러났다(arrival·rift는 지붕형·수풀형 소면적 상층,
    // camp는 완전 고립된 단일 층으로 8방 연속성 0/12·실텔레포트 착지 아래 지면이 아예 없음).
    // 원인: navFindWalkable의 preferY 밴드가 "상층에서 얻은 y" 자체를 기준으로 삼아
    // 드리프트 0을 통과시켜 버림(이원 검증이 상층↔상층 자기 일치만 확인). 재검증은
    // __navGroundAt을 preferY 없이 반복 호출해 컬럼의 전 층을 나열하고, 각 층의 8~12방
    // 연속성(navGroundAt 기준)에 더해 실제 자유낙하 텔레포트(고도 40~150 다중 세션) 착지
    // y까지 대조하는 방식으로 교체(scratchpad/sp2b-fix-*.js). herbalist는 스크린샷 결함
    // 보고에는 없었으나 동일 감사에서 저장값(-18.75)이 실제 지면(-12.25, 자유낙하 2세션
    // 일치)과 6.5m 어긋난 지하 포켓임이 드러나 함께 수정(XZ는 원안 유지, Y만 교정).
    {
        // 대삼림 접근로 — 원안(GEN_FLAGS 앵커, -217.85,110.15)은 성벽형 원형 계단 플라자
        // 지붕에 앉아 있었다(navGroundAt 컬럼 3층[-17.70(고립,연속성 1/12@1.5m)/-21.63/
        // -30.31] 중 최상층을 오검출). 마을→숲 도보 진입로 상, 플라자를 벗어난 실제
        // 지면(단일 층, 자유낙하 3세션 y=-31.25 일치)으로 9.9m 재배치. herb_witch(NPC,
        // -212.5,106.5)와 13.4m, GEN_FLAGS와 14.2m — 모두 3.5m+ 확보.
        id: "forest_arrival",
        stage: "act2_hill",
        near: { x: -222, z: 97, radius: 8 },
        flagsAll: ["act2a_done"],
        cutscene: "cs_forest_arrival",
        nextStage: "act2_forest",
        objective: "약초술사의 증언을 들어보자",
        target: { x: -211.28, z: 100.55 },
    },
    {
        // 증언 — herb_witch(-212.5,-18.25,106.5) 인근이되 6.07m 이격(기존 사이드퀘스트
        // NPC 상호작용 반경과 3.5m+ 확보). 굳은 주민이 없는 야외 존이라(항구/언덕의 frozen
        // villager 증언 대신) 생존 NPC 본인의 목소리로 증언을 대체한다(스펙 §②).
        // [T1 리뷰 수정] XZ는 원안 유지(도로 위, 스크린샷 결함 없음) — 다만 저장 y=-18.75가
        // navGroundAt 컬럼에 없는 값이었고, 근접 텔레포트로는 실제 지면보다 6.5m 낮은
        // 지하 포켓(-21.25)에 꽂히는 것으로 드러나 자유낙하 실측치 y=-12.25로 교정
        // (별도 세션 2회 일치, 인접 8방 연속성 양호 — 다이얼로그 전용 지점이라 화면
        // 결함은 없었지만 이원 검증 기준 미달이라 함께 바로잡음).
        id: "forest_herbalist",
        stage: "act2_forest",
        near: { x: -211.28, z: 100.55, radius: 8 },
        // 순서 게이트 — port2_witness/hill2_witness와 동일 이유(패스트트래블 우회 방지).
        flagsAll: ["story_forest_arrival"],
        dialogue: [
            { speaker: "약초술사", text: "또 와주셨네요! …그런데 요 며칠 이 근방이 심상치 않아요. 화로의 불이 어제는 여름처럼 뜨겁더니, 오늘은 한겨울마냥 손이 다 시려요." },
            { speaker: "약초술사", text: "숲도 마찬가지예요. 저 안쪽 나무는 단풍이 다 졌는데, 이쪽은 아직 여린 새잎이 돋아 있죠. 계절이 통째로 뒤죽박죽이 됐어요." },
            { speakerId: "theo", text: "한 자리에 사계가 뒤섞여 있다는 거군요 — 정말 예사롭지 않은 증언이에요. 낱낱이 기록해 두겠습니다." },
            { speakerId: "arin", text: "경계가 있을 거다. 여름과 겨울이 맞닿는 자리 — 거기서부터 살핀다." },
            { speakerId: "lotti", text: "이상한 숲이네… 약초술사님, 화로 불씨는 저희가 얼른 정리하고 다시 챙겨드릴게요!" },
        ],
        objective: "계절이 뒤섞이는 경계를 찾아가자",
        target: { x: -198, z: 32 },
    },
    {
        // 진원 — 계절 경계 실측 지점(T2의 vortex/T5의 source 대응).
        // [T1 리뷰 수정] 원안(-192.3,38.07)은 컬럼 최상층(-20.25, 3m 이상 연속성 0/12)인
        // 고립된 바위/수풀 더미였다 — 8.3m 옆 실제 지면(단일 연속 평탄대, 자유낙하 y=-25.25,
        // 반경 3m 전방향 dy=0 확인)으로 재배치.
        id: "forest_rift",
        stage: "act2_forest",
        near: { x: -198, z: 32, radius: 8 },
        flagsAll: ["story_forest_herbalist"],
        dialogue: [
            { speakerId: "lotti", text: "어? 진짜네… 발 하나 차이로 여긴 여름이고, 저긴 눈이 쌓여 있어! 신기하긴 한데… 좀 소름 돋는다." },
            { speakerId: "theo", text: "경계가 이렇게 뚜렷하다니 자연 현상일 리 없어요. 에테르 파동이 이 한 점에서 사방으로 갈라지고 있습니다 — 여기가 근원이에요." },
            { speakerId: "arin", text: "…발자국이 있다. 오래되지 않았어. 누군가 먼저 이곳에 있었다." },
            { speakerId: "theo", text: "이 발자국, 따라가 볼 가치가 있어요." },
        ],
        objective: "발자국을 따라 숲 안쪽으로 들어가자",
        target: { x: -176, z: -46 },
        // T2(던전 「뿌리 굴」) 게이트 인터페이스 — forest_rift 트리거에서 산출(브리프 지시).
        setFlags: { forest_rift_found: true },
    },
    {
        // 테오 단서 — 스승의 옛 연구 캠프(T2의 arin/T5의 lotti 대응: 서사 컷신).
        // [T1 리뷰 수정] 원안(-177.5,-28)은 navGroundAt이 단일 층(-9.31)만 검출하고 그
        // 층조차 8방 연속성 0/12(실질 완전 고립 — 스크린샷에서 party가 수풀 꼭대기에
        // 서서 목조 벽에 밀착·서로 겹치는 결함으로 확인). 인근 고가 목조 잔해대는 파편화가
        // 심해(대부분 후보 3m+에서 연속성 급락) 같은 GEN_POIS 티어의 남쪽 확장부 —
        // 12.1m 떨어진 진짜 평탄 목조 데크(8/12@1.5m, 자유낙하 3세션 y=-5.25 일치)로
        // 재배치. GEN_POIS 전망 포인트(-171.5,-35.5)와 11.4m, roamer3와 34.5m — 3.5m+/
        // 8m+ 모두 확보.
        id: "forest_theo",
        stage: "act2_forest",
        near: { x: -176, z: -46, radius: 8 },
        flagsAll: ["story_forest_rift"],
        cutscene: "cs_theo_camp",
        objective: "계절이 갈라지던 자리로 돌아가, 그 뿌리를 살펴보자",
        target: { x: -198, z: 32 },
    },
    // ===== SP2b T3 — 대삼림 보스 「계절을 삼킨 자」 + 유물③ =====
    // 던전(뿌리 굴) 최심부 — T2의 FOREST_ROOTCAVE_BOSS_ENTRY(-170.9,-44.25,-44.8) 그대로
    // 채택(port2_boss처럼 근접 상호작용물 회피를 위해 옮길 필요가 없었다 — T2가 이미 이
    // 정확한 지점을 기준으로 문2/스위치2를 배치해 뒀다, task-2-report.md §A.4/B 참조).
    // 실텔레포트 dy=0.00(2세션, T2 기확인) — 이 태스크에서도 sp2b-t3-seasonboss.js
    // coord_check로 재확인(회귀 없음).
    // battle 필드 병기 — cutscene(cs_forest_boss) 우선 발동이라 실제 전투는 컷신의 battle
    // 스텝이 열지만, 여기 병기해야 패배 후 재도전 시 StoryTriggers의 battleUnwon 게이트가
    // 동작한다(없으면 재도전 트리거가 영구 스킵 — T4/T6 이월 규약).
    {
        id: "forest_boss",
        stage: "act2_forest",
        near: { x: -170.9, z: -44.8, radius: 3 },
        // 순서 게이트(SP2a 최종 리뷰 규약 — 예외 없음) — port2_boss/hill2_boss와 동일한
        // 3중 게이트: ① forest_rift_found(조사 아크에서 산출된 던전 게이트 플래그,
        // requireFlag와 동일 조건이라 여기서도 병기해 조사 아크를 건너뛰고 던전에
        // 곧장 진입하는 경로까지 봉쇄) ② story_forest_theo — 테오의 스승 단서 컷신을
        // 건너뛰고 곧장 보스로 직행하면 그 서사가 영구 사장된다(port2/hill2와 동일 이유)
        // ③ door_forest_rootcave_2 — 문2 스위치는 y가드(DungeonDoor.tsx:88)가 있어
        // 지상에서 조작 불가하므로, 이 플래그 게이트는 실질적으로 "던전 실경로를 다
        // 통과해야 발화"를 강제하는 것과 동치(port2/hill2 최종 리뷰 F2 이월 규약).
        flagsAll: ["forest_rift_found", "story_forest_theo", "door_forest_rootcave_2"],
        cutscene: "cs_forest_boss",
        battle: { id: "forest_boss", templates: ["season_devourer"] },
    },
    // 유물 회수·phen_forest 소등 — cs_forest_relic 자체의 set 스텝(hill2_relic 전례와
    // 동일 설계: defeated_forest_boss_0로 게이팅되는 별도 트리거이므로 패배 후 재도전만
    // 으로는 선적용되지 않는다 — 승리해야만 발동). nextStage는 여기 두지 않는다 —
    // act2_forest는 STAGE_ORDER상 act2_woods 앞이라 act2a_bridge 같은 "무좌표 브리지"가
    // 필요 없지만(다음 존이 이미 존재), 사계 연출 자체(제철로 돌아옴)와 다음 존행 전언을
    // 한 컷신에 욱여넣지 않고 분리해 각각 명확한 완결감을 준다(브리프 지시).
    // near는 forest_rootcave 지상 게이트 좌표를 그대로 재사용(hill2_relic이 hill_undercroft
    // 지상 게이트 좌표(8,-204)를 그대로 재사용한 것과 동일 패턴) — T2가 이미 이원 검증
    // (__navFindWalkable + 자유낙하 2세션)을 마친 지점이라 신규 좌표 리스크가 없다.
    // GEN_POIS.west_forest 전망 포인트(-171.5,-6.25,-35.5)와 4.53m — 3.5m+ 확보
    // (sp2b-t3-seasonboss.js audit 섹션).
    // radius=3(hill2_relic의 8이 아니라 forest_boss와 동일한 좁은 반경) — StoryTrigger의
    // near는 XZ만 보고 y를 보지 않는데, 이 던전은 지상 게이트와 지하 보스방이 거의 같은
    // XZ 기둥에 있어(문2/스위치2/보스 진입점 전부 지상 게이트(-172,-40)에서 4.7~4.9m —
    // hill_undercroft는 지상↔지하가 62.8m 떨어져 있어 이 문제가 없었다) radius=8이면
    // cs_forest_boss가 끝나자마자(플레이어가 아직 지하 보스방에 서 있는 채로) 오발화할
    // 위험이 있다(실측: sp2b-t3-seasonboss.js 초안에서 발견). 3m로 좁히면 게이트 정확한
    // 착지점(드리프트 0m)은 여전히 잡히면서 지하 위험 반경(4.7m+) 전부를 배제한다.
    {
        id: "forest_relic",
        stage: "act2_forest",
        near: { x: -172, z: -40, radius: 3 },
        flagsAll: ["defeated_forest_boss_0"],
        cutscene: "cs_forest_relic",
        objective: "숲을 나서기 전, 하나로 돌아온 계절을 둘러보자",
        target: null,
    },
    // 다음 존행 전언 — forest_relic과 동일 지상 지점에서 발동(cs_forest_relic 재생 중엔
    // StoryTriggers.tsx:25 "컷신 재생 중엔 트리거 보류" 가드로 동시 발화가 원천 차단되므로,
    // 같은 near를 공유해도 안전하다 — cs_forest_relic이 set 스텝으로 relic_season을
    // 선적용해도, 그 순간 g.cutscene이 이미 true라 이 트리거는 컷신이 끝난 뒤에야
    // 평가된다). act2_forest가 STAGE_ORDER 최종 스테이지가 아니라(act2_woods가 이미
    // 뒤에 있음) act2a_bridge와 달리 nextStage를 곧장 여기서 지정한다. act2_woods 콘텐츠는
    // 아직 없어(다음 태스크 몫) target은 act2a_bridge 전례대로 null.
    // radius=3 — forest_relic과 동일 사유(위 주석 참조, 지하 보스방과의 XZ 근접 오발화 방지).
    {
        id: "forest_to_woods",
        stage: "act2_forest",
        near: { x: -172, z: -40, radius: 3 },
        flagsAll: ["relic_season"],
        dialogue: [
            { speaker: "전령", text: "실례합니다 — 다시 뵙는군요. 이번엔 북쪽 숲길 쪽에서 급보가 왔습니다." },
            { speaker: "전령", text: "『눈 위 발자국이 거꾸로 파인다.』 그쪽을 오가는 사냥꾼이 보내온 전갈입니다. …이 숲의 계절만큼이나, 믿기 어려운 얘기더군요." },
            { speakerId: "theo", text: "발자국이 거꾸로라니 — 대삼림의 계절, 바람 언덕의 아침에 이어 이번엔 시간의 방향 자체가 뒤집힌 걸까요. 기록해 두겠습니다." },
            { speakerId: "arin", text: "…쉴 틈이 없군. 그래도 이 숲부터, 매듭은 지었다." },
            { speakerId: "lotti", text: "그러게! 계절이 하나로 돌아온 것만 해도 어디야. 다음은 북쪽 숲길이라니… 이번엔 또 뭘 보게 될지." },
            { speakerId: "theo", text: "다음 조사지는 북부 숲길입니다." },
        ],
        nextStage: "act2_woods",
        objective: "북부 숲길의 이상 징후는 다음 몫이다 — 지금은 자유로이 대삼림을 둘러보자",
        target: null,
    },
    // ===== SP2b T4 — 북부 숲길 「시간이 거꾸로 흐르는 길」 추적 아크(체인 4비트) + 야외 보스
    // + 유물④ + 빌런 복선(경량 챕터 — 던전 없음, 스펙 §③) =====
    // T2/T5/T1과 동일 패턴: 전부 nextStage 미지정(woods_to_water 전이 예외) — 순서 게이트
    // 전 구간 flagsAll 적용(SP2a 최종 리뷰 규약, 예외 없음). 좌표 6지점(arrival·증언·trace1·
    // trace2·boss·정예) 전부 신규 실측 개척 — __navFindWalkable drift 0.00m(전 지점) + 12방
    // 연속성 12/12(전 지점) + 실텔레포트/자유낙하(고도80) 별도 세션 2회 착지 y 일치(이원 검증
    // 완료 — scratchpad/sp2b-t4-scan1.js 광역 그리드 선탐사 + sp2b-t4-verify1.js 1차 검증).
    // [재배치] trace1·trace2·boss·정예 1차 좌표(-128,-240 / -116,-268 / -108,-292 / -96,-292)는
    // 이원 검증(드리프트·층·연속성·자유낙하)은 전부 통과했지만, 카메라 확정 샷 육안 확인
    // (사후 필수 절차)에서 실제로는 포장도로·건물·밀밭이 인접한 개발 지형임이 드러났다
    // (scratchpad/sp2b-t4-diag3~diag6-*.png — 특히 boss 지점은 GEN_POIS 전망 포인트 옆이라
    // 오히려 그 인공 구조물에 바짝 붙어 있었다). "정점 공터"라는 스펙 문구와 배치되어
    // 서측으로 재탐사·재배치(trace1 -148,-256 / trace2 -148,-276 / boss -160,-300 / 정예
    // -172,-304 — scratchpad/sp2b-t4-verify2.js로 재검증, 상호작용물 13.6m+·로머/정예 51m+로
    // 여유 폭 대폭 확대). hunter_trig(-139.5,-211)는 불변 — questData.ts 기존 사냥꾼 NPC
    // 앵커 인접이라 애초에 "사냥꾼의 야영지" 인상이 자연스러워 이동 대상이 아니다.
    // 배치 감사(상호작용물 3.5m+·로머/정예 캠프 8m+·보스↔정예 8m+, 위반 0 — 동 스크립트).
    {
        // 숲길 진입 — 남측 경계(west_forest→north_woods 접경) 초입 도보 지면. GEN_FLAGS
        // 존 체크포인트(-144.5,-219.5)·roamer_c(리지, -128.5,-137.8, 별도 층 y=-13.75)와
        // 각각 47.9m·36.1m 이격(3.5m+/8m+ 충분). 자유낙하 2세션 y=-31.25 일치.
        id: "woods_arrival",
        stage: "act2_woods",
        near: { x: -140, z: -172, radius: 8 },
        cutscene: "cs_woods_arrival",
        objective: "사냥꾼의 증언을 들어보자",
        target: { x: -139.5, z: -211 },
    },
    {
        // 증언 — 사냥꾼 NPC(questData.ts lost_hunter, -139.5,-31.25,-215.5) 인근이되 4.50m
        // 이격(binding 규약 "증언 트리거는 3.5m+ 이격" 충족 — herb_witch/f_shepherd 등
        // 기존 사이드퀘스트 NPC 근접 패턴과 동일). 순서 게이트 — port2_witness/hill2_witness/
        // forest_herbalist와 동일 이유(패스트트래블로 arrival을 건너뛰고 여기부터 진행 가능한
        // 우회 방지).
        id: "woods_hunter",
        stage: "act2_woods",
        near: { x: -139.5, z: -211, radius: 8 },
        flagsAll: ["story_woods_arrival"],
        dialogue: [
            { speaker: "사냥꾼", text: "말도 안 되는 걸 봤어. 낡은 코트를 걸친 노인이, 길을 거슬러 걷고 있었어. 발자국이 노인 앞에서 생겨나더군." },
            { speaker: "사냥꾼", text: "처음엔 내가 잘못 봤나 했지. 근데 아니야 — 눈 위에 파였던 발자국이, 그 노인이 걸을 때마다 도로 메워지고 있었어." },
            { speakerId: "theo", text: "발자국이 메워진다는 건… 그 사람 주변에서만 시간이 거꾸로 흐른다는 뜻일지도 몰라요. 예사롭지 않은 증언이에요, 낱낱이 기록해 두겠습니다." },
            { speakerId: "arin", text: "노인이라. …방향을 안다면, 쫓을 수 있다." },
            { speakerId: "lotti", text: "발자국을 거꾸로 쫓으라니 뭔가 이상한 술래잡기 같아… 그래도 서두르자, 사냥꾼 아저씨도 걱정되니까!" },
        ],
        objective: "거꾸로 난 발자국을 따라가 보자",
        target: { x: -148, z: -256 },
    },
    {
        // 흔적 1구간 — 회수꾼 소환 잔재(진원 방향으로의 첫 단서, T1의 rift·T5의 source 대응).
        id: "woods_trace1",
        stage: "act2_woods",
        near: { x: -148, z: -256, radius: 8 },
        flagsAll: ["story_woods_hunter"],
        dialogue: [
            { speakerId: "theo", text: "여기, 땅에 그을린 자국이… 소환진이에요. 그것도 아주 정교한 — 뭔가를 '되찾아오기' 위한 술식 같습니다." },
            { speakerId: "arin", text: "회수용 소환이라. …노인이 무언가를 찾고 있다는 뜻인가." },
            { speakerId: "lotti", text: "되찾는다는 거… 좋은 건지 나쁜 건지 감이 안 잡히네. 일단 더 따라가 보자!" },
            { speakerId: "theo", text: "이 흔적, 발자국과 이어져요. 조금만 더 가면 뭔가 더 나올 것 같습니다." },
        ],
        objective: "흔적을 더 따라가 보자",
        target: { x: -148, z: -276 },
    },
    {
        // 흔적 2구간 — 떨어진 태엽 부품(공방 각인, "그분" 스레드 교차 — 직접 명명 금지).
        // T2(던전)의 rift_found 대응 게이트 플래그(woods_trace_found)를 여기서 산출(브리프 지시).
        id: "woods_trace2",
        stage: "act2_woods",
        near: { x: -148, z: -276, radius: 8 },
        flagsAll: ["story_woods_trace1"],
        dialogue: [
            { speakerId: "lotti", text: "어? 여기 뭔가 떨어져 있어— 톱니바퀴 조각이야!" },
            { speakerId: "theo", text: "…잠깐만요. 이 톱니 옆에 새겨진 문양 — 낯익은 공방의 각인이에요. 분명 어딘가에서 본 적 있습니다." },
            { speakerId: "arin", text: "공방의 각인이 여기까지. …노인과 무관하지 않겠군." },
            { speakerId: "theo", text: "이 부품, 떨어진 지 얼마 안 된 것 같아요. 노인이 지나간 지 오래되지 않았다는 뜻이겠죠. 기록해 두겠습니다." },
            { speakerId: "arin", text: "기척이 느껴진다. …이 앞이다." },
        ],
        objective: "정점 공터의 기척을 살피자",
        target: { x: -160, z: -300 },
        setFlags: { woods_trace_found: true },
    },
    // ===== 숲길 보스 「길을 삼킨 자」 =====
    // 정점 공터 — 재배치 후 위치(-160,-32.25,-300), GEN_POIS 전망 포인트와도 47.1m 이격
    // (재배치 사유는 위 체인 헤더 주석 참조 — 육안 확인 결과 원안이 도로/POI 인접
    // 개발 지형이었다). 야외 보스라 던전이 없어 문 병기가 불가 — 대신 체인 전 구간의
    // story_* 플래그를 전부 flagsAll에 병기해(순서 게이트만으로 스킵 경로 봉쇄, 플랜
    // Global Constraints 지시) door 병기를 대체한다. battle 필드 병기 — cutscene
    // (cs_woods_boss) 우선 발동이라 실제 전투는 컷신의 battle 스텝이 열지만, 여기
    // 병기해야 패배 후 재도전 시 StoryTriggers의 battleUnwon 게이트가 동작한다
    // (없으면 재도전 트리거가 영구 스킵 — T4/T6 이월 규약).
    {
        id: "woods_boss",
        stage: "act2_woods",
        near: { x: -160, z: -300, radius: 3 },
        flagsAll: [
            "story_woods_arrival",
            "story_woods_hunter",
            "story_woods_trace1",
            "story_woods_trace2",
            "woods_trace_found",
        ],
        cutscene: "cs_woods_boss",
        battle: { id: "woods_boss", templates: ["path_devourer"] },
    },
    // 유물 회수·phen_woods 소등 — cs_woods_relic 자체의 set 스텝(hill2_relic·forest_relic
    // 전례와 동일 설계: defeated_woods_boss_0로 게이팅되는 별도 트리거이므로 패배 후
    // 재도전만으로는 선적용되지 않는다 — 승리해야만 발동). near는 보스 트리거와 동일
    // 지점을 재사용 — 야외 단일 층이라(forest_rootcave 같은 지상/지하 XZ 중첩 위험이
    // 없음, sp2b-t4-verify2.js 층 스캔에서 단일 층만 확인) hill2_relic처럼 radius=8로
    // 넉넉히 잡아도 안전하다.
    {
        id: "woods_relic",
        stage: "act2_woods",
        near: { x: -160, z: -300, radius: 8 },
        flagsAll: ["defeated_woods_boss_0"],
        cutscene: "cs_woods_relic",
        objective: "숲길을 나서기 전, 되찾은 길을 둘러보자",
        target: null,
    },
    // 다음 존행 전언 — woods_relic과 동일 지상 지점에서 발동(forest_relic/forest_to_woods와
    // 동일 안전 근거: "컷신 재생 중엔 트리거 보류" 가드로 동시 발화가 원천 차단된다).
    // act2_woods가 STAGE_ORDER 최종 스테이지가 아니므로(act2_water가 이미 뒤에 있음)
    // act2a_bridge와 달리 nextStage를 곧장 여기서 지정한다. act2_water 콘텐츠는 아직
    // 없어(다음 태스크 몫) target은 forest_to_woods 전례대로 null.
    {
        id: "woods_to_water",
        stage: "act2_woods",
        near: { x: -160, z: -300, radius: 8 },
        flagsAll: ["relic_path"],
        dialogue: [
            { speaker: "전령", text: "실례합니다 — 다시 뵙는군요. 이번엔 북동 수변 쪽에서 급보가 왔습니다." },
            { speaker: "전령", text: "『수로의 물이 하늘로 오른다.』 그곳 강태공이 보내온 전갈입니다. …발자국에 이어 이번엔 물줄기라니, 이 대륙 어디까지 뒤집힐는지 모르겠습니다." },
            { speakerId: "theo", text: "물이 거슬러 오른다니 — 대삼림의 계절, 숲길의 시간에 이어 이번엔 물의 흐름 자체가 뒤집힌 걸까요. 기록해 두겠습니다." },
            { speakerId: "arin", text: "…쉴 틈이 없군. 그래도 이 숲길부터, 매듭은 지었다." },
            { speakerId: "lotti", text: "그러게! 길이 제대로 돌아온 것만 해도 다행이야. 근데 그… 아까 그 뒷모습, 다들 진짜 못 봤어?" },
            { speakerId: "theo", text: "…글쎄요. 착각이었을지도 모르지만, 저는 분명— 아뇨, 지금은 넘어가죠. 다음 조사지는 북동 수변입니다." },
        ],
        nextStage: "act2_water",
        objective: "북동 수변의 이상 징후는 다음 몫이다 — 지금은 자유로이 숲길을 둘러보자",
        target: null,
    },
    // ===== SP2b T5 — 북동 수변 챕터 「물이 하늘로 흐르는 수로」 조사 아크(체인 4비트) +
    // 테오 서사 2장(스펙 §④) =====
    // 진입 게이트는 T1(대삼림)이 아니라 T4(숲길)의 stage 전환 패턴을 따른다 — 위
    // woods_to_water가 이미 nextStage: "act2_water"를 지정해 둬(woods_arrival이 forest_to_woods
    // 이후 곧장 stage: "act2_woods"에서 발동한 것과 동일 구조) water_arrival은 별도 flagsAll
    // 없이 stage 일치만으로 발동한다.
    //
    // 좌표 4지점 전부 신규 실측 개척(scratchpad/sp2b-t5-scan1.js 광역 그리드 4m 선탐사 →
    // sp2b-t5-scout1.js·-scout2.js 육안 정찰(팔로우캠) → sp2b-t5-verify1.js 이원 검증 —
    // __navFindWalkable drift 0.00m(전 지점) + __navGroundAt preferY 없이 컬럼 전 층 나열 +
    // 직접텔레포트/자유낙하(고도80, 별도 세션 2회) y 일치, 전부 재현). ne_water는 수변 존이라
    // 표고가 다층(수로 수면 y≈-39.36 · 강태공 하부 선착장 y≈-47.25 · 수문 관리소 내부
    // y≈-12.25) — 전 지점 y 명시(binding 규약).
    //   - water_fisher(229,-257): 컬럼 2층[-39.49(수로 수면)/-46.56→직접텔레포트·자유낙하
    //     둘 다 -47.25로 수렴 = 강태공 NPC 정박 y와 정확히 일치] 중 하부 선착장 선택,
    //     12/12방 연속(완전 평탄) — 강태공(NPC, 233.5,-47.25,-261.5)과 6.36m 이격(3.5m+ 규약).
    //   - water_gate(108,-236): 단일 층 -39.36~-39.42, 12/12방 연속 — 그물 격자 수문
    //     장치 시각 확인(scratchpad/sp2b-t5-scout-gate_west1.png).
    //   - water_theo(176,-276): 컬럼 3층[-12.32(실내 바닥)/-35.32(하부 — T6 던전 후보지로
    //     열어 둠, forest_rift_found↔forest_theo 근접 배치 전례와 동일 논리)/-39.49(수로)].
    //     12방 중 4/12만 연속이나 이는 T1 forest_theo의 "고립 소면적 상층" 결함과는 다르다 —
    //     막힌 8방향은 실내 벽체가 navmesh 광선을 차단한 것이 정상(육안 확정 —
    //     scratchpad/sp2b-t5-scout-gate_break.png, 석조 복도·문간 2개). 직접텔레포트
    //     dy=0.07·자유낙하 y=-12.25 이중 일치로 "상층 자기일치 오검출"이 아님을 재확인.
    //   배치 감사(상호작용물 3.5m+·로머 캠프 8m+, 위반 0 — sp2b-t5-verify1.js 로그).
    //   체인 지점 간 거리: arrival→fisher 89.09m · fisher→gate 122.81m · gate→theo 78.89m
    //   (fisher→gate가 T1/T4 전례 최장(~81m)보다 길다 — 증언에서 "수문 쪽으로 갈수록
    //   심해진다"는 방향성 단서를 주고, 존 반대편 수문 장치까지 실제로 걸어가 찾게 하는
    //   의도된 탐색 구간. 8m+/3.5m+ 배치 규약 위반은 없다).
    {
        // 진입 — 서측 수로(갈대밭 너머 수로, GEN_POIS 전망 포인트(124.5,-42.25,-261.5)와
        // 15.51m 이격). woods_to_water 전언에서 이미 "강태공"이라는 이름이 나왔으므로,
        // 도착 컷신에서 곧장 그 이름으로 목적지를 짚는다(1막 전언 정보를 기억하는 디테일).
        id: "water_arrival",
        stage: "act2_water",
        near: { x: 140, z: -261, radius: 8 }, // y=-39.36(수로 수면, near는 XZ만 판정 — comment 참조)
        cutscene: "cs_water_arrival",
        objective: "강태공의 증언을 들어보자",
        target: { x: 229, z: -257 },
    },
    {
        // 증언 — 강태공(NPC, questData.ts reed_hermit, 233.5,-47.25,-261.5) 인근이되 6.36m
        // 이격(binding 규약 "증언 트리거는 3.5m+ 이격" 충족 — herb_witch/lost_hunter 등
        // 기존 사이드퀘스트 NPC 근접 패턴과 동일). 순서 게이트 — forest_herbalist/woods_hunter와
        // 동일 이유(패스트트래블로 arrival을 건너뛰고 여기부터 진행 가능한 우회 방지).
        id: "water_fisher",
        stage: "act2_water",
        near: { x: 229, z: -257, radius: 8 }, // y=-47.25(강태공 하부 선착장, near는 XZ만 판정)
        flagsAll: ["story_water_arrival"],
        dialogue: [
            { speaker: "강태공", text: "찌가 물을 거슬러 떠오르질 않나… 낚시가 안 돼" },
            { speaker: "강태공", text: "동트기 전부터 그랬다네. 수문 쪽으로 갈수록 더 심해지는 것 같더군 — 그쪽은 나도 잘 안 가지만." },
            { speakerId: "theo", text: "흐름 자체가 역전됐다는 거군요. 예사롭지 않은 증언이에요. 낱낱이 기록해 두겠습니다." },
            { speakerId: "arin", text: "수문 쪽이라. …근원이 거기 있겠군." },
            { speakerId: "lotti", text: "낚시가 안 되면 어르신 끼니는 어쩌나… 우리가 얼른 원인을 찾아야겠다!" },
        ],
        objective: "수문 이상 지점을 찾아가자",
        target: { x: 108, z: -236 },
    },
    {
        // 진원 — 수문 이상 지점(T5의 rift/trace2 대응). T2(대삼림 뿌리 굴)의 forest_rift_found
        // 전례처럼, 이 트리거의 좌표가 곧 T6 던전의 물리적 게이트 좌표가 되는 것은 아니다 —
        // T1에서도 forest_rift(-198,32)와 실제 forest_rootcave 게이트(-172,-40)는 별개
        // 지점이었고, 던전은 결국 forest_theo(캠프) 인근에 배치됐다. 여기서도 동일 논리로
        // water_gate_found만 산출하고, 실제 던전 배치는 T6이 water_theo(관리소, 하부에
        // -35.32 별도 층 확인됨) 인근을 검토하도록 열어 둔다.
        id: "water_gate",
        stage: "act2_water",
        near: { x: 108, z: -236, radius: 8 }, // y=-39.36(수문 지면, near는 XZ만 판정)
        flagsAll: ["story_water_fisher"],
        dialogue: [
            { speakerId: "lotti", text: "저기 봐— 수문이야! 근데 물살이 완전히 거꾸로 빨려 들어가고 있어!" },
            { speakerId: "theo", text: "이 수문, 원래는 수위를 조절하는 장치일 텐데… 지금은 반대로 물을 빨아올리고 있어요. 이 근방 이상 전체의 근원이 여기일 가능성이 높습니다." },
            { speakerId: "arin", text: "…사람 손이 닿은 흔적이다. 오래되지 않았어." },
            { speakerId: "theo", text: "관리소 기록을 확인해 볼 가치가 있겠어요. 이 근방에 수문 관리소가 있을 겁니다." },
        ],
        objective: "수문 관리소를 살펴보자",
        target: { x: 176, z: -276 },
        // T6(미니 던전 「수문 하부」) 게이트 인터페이스 — water_gate 트리거에서 산출(브리프 지시).
        setFlags: { water_gate_found: true },
    },
    {
        // 테오 서사 2장 — 수문 관리소에 남은 스승의 연구 노트(T1의 forest_theo 대응: 서사
        // 컷신). frozenData.ts의 "공방 주인 계열 스승" 스레드와는 잇지 않는다(T1 cs_theo_camp
        // 주석과 동일 — 별개 인물).
        id: "water_theo",
        stage: "act2_water",
        near: { x: 176, z: -276, radius: 8 }, // y=-12.25(수문 관리소 내부, near는 XZ만 판정)
        flagsAll: ["story_water_gate"],
        cutscene: "cs_theo_master",
        // [셀프 리뷰 반영] forest_theo(T1) 전례 — "water_gate_found"를 산출한 자리(수문,
        // 108/-236)로 되돌아가는 목적지를 남겨 다음 몫(T6 던전)의 방향을 열어 둔다.
        // 이게 없으면 water_gate의 objective/target("수문 관리소를 살펴보자"→176,-276)이
        // HUD에 그대로 남아 이미 도착한 지점을 다시 가리키는 상태가 된다(StoryTriggers.tsx
        // setStory 패치는 필드가 있을 때만 갱신).
        objective: "수문이 뒤틀리던 자리로 돌아가, 그 아래를 살펴보자",
        target: { x: 108, z: -236 },
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
