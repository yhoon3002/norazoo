// rpg/data/questData.ts — 사이드 퀘스트 (NPC/조건/대사/보상 전부 데이터 선언)
// 상태: flags[`quest_${id}`] = 수락, flags[`quest_${id}_done`] = 완료

import type { DialogueLine } from "./storyData";

export type SideQuest = {
    id: string;
    npc: {
        x: number;
        z: number;
        /** 의도 층 지면 y (없으면 플레이어 층 기준 스냅) */
        y?: number;
        label: string;
        model: string;
    };
    /** 이 스테이지부터 등장 (stageAtLeast) */
    availableFrom: string;
    accept: DialogueLine[];
    progress: DialogueLine[];
    complete: DialogueLine[];
    /** 납품 조건 — 완료 시 가방에서 차감 */
    needs?: Array<{ id: string; qty: number }>;
    /** 처치 조건 — defeated_${fieldId} 플래그 전부 true */
    kills?: string[];
    rewards: Array<{ id: string; qty: number }>;
    rewardGold: number;
};

export const SIDE_QUESTS: SideQuest[] = [
    {
        id: "guard_bounty",
        npc: { x: 91, z: -29.5, y: -33.25, label: "파수꾼", model: "/character/VikingHelmet.fbx" },
        availableFrom: "ch2_cleanup",
        accept: [
            { speaker: "파수꾼", text: "성문 밖 초소라 시계탑 종소리가 닿지 않아 화를 면했지. …그런데 남쪽 숲에 오크 둘이 진을 쳤어." },
            { speaker: "파수꾼", text: "놈들 때문에 순찰을 못 돌아. 정리해 주면 사례하지." },
            { speakerId: "arin", text: "위치는 파악했다. 맡겨라." },
        ],
        progress: [
            { speaker: "파수꾼", text: "남쪽 숲이야. 놈들이 먼저 움직이기 전에 부탁하네." },
        ],
        complete: [
            { speaker: "파수꾼", text: "확실하군! 이제 순찰을 돌 수 있겠어. 약속한 보수다." },
            { speakerId: "lotti", text: "든든한 아저씨네. 마을 사람들이 깨어나면 좋아하겠다!" },
        ],
        kills: ["bounty1_0", "bounty1_1"],
        rewards: [{ id: "health_potion", qty: 2 }],
        rewardGold: 150,
    },
    {
        id: "smith_core",
        npc: { x: 43.5, z: -26.5, y: -33.25, label: "견습 대장장이", model: "/character/Viking_Female.fbx" },
        availableFrom: "ch3_port",
        accept: [
            { speaker: "견습 대장장이", text: "스승님이 굳은 뒤로 화로를 못 지폈어요… 마물 결정 2개와 슬라임 젤 2개면 특제 풀무를 돌릴 수 있는데." },
            { speakerId: "theo", text: "마물 결정이라면 오크나 마법사 마물이 떨어뜨리죠. 풀무 연료라니, 흥미롭네요." },
        ],
        progress: [
            { speaker: "견습 대장장이", text: "마물 결정 2개, 슬라임 젤 2개예요. 들판의 마물들이 갖고 있을 거예요." },
        ],
        complete: [
            { speaker: "견습 대장장이", text: "이거예요! 화로가 다시 숨을 쉬네요. …스승님 서랍에 있던 반지, 당신에게 어울려요." },
        ],
        needs: [
            { id: "monster_core", qty: 2 },
            { id: "slime_gel", qty: 2 },
        ],
        rewards: [{ id: "power_ring", qty: 1 }],
        rewardGold: 80,
    },
    {
        id: "boy_kite",
        npc: { x: 26, z: -19, y: -33.25, label: "소년", model: "/character/Cowboy_Hair.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "소년", text: "깨어나 보니 내 연이 없어요! 분명 북쪽 들판 쪽으로 날아갔는데…" },
            { speakerId: "lotti", text: "북쪽 들판? 알았어, 우리가 찾아볼게. 울지 마!" },
        ],
        progress: [
            { speaker: "소년", text: "북쪽 들판 어딘가에 떨어졌을 거예요… 부탁해요." },
        ],
        complete: [
            { speaker: "소년", text: "내 연이다! 정말 고마워요! 이건 엄마가 챙겨 준 건데, 드릴게요." },
        ],
        needs: [{ id: "kite", qty: 1 }],
        rewards: [{ id: "health_potion", qty: 1 }],
        rewardGold: 60,
    },
    {
        id: "fisher_fish",
        npc: { x: 207, z: 3, y: -38.25, label: "어부", model: "/character/Elf.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "어부", text: "…어라, 몸이 움직여! 당신들 덕인가. 그물이 다 삭아버렸으니, 생선 3마리만 잡아다 주게." },
            { speaker: "어부", text: "부두 끝에 낚시하기 좋은 자리가 있어. 낚싯대는 꽂아 뒀네." },
        ],
        progress: [
            { speaker: "어부", text: "부두 끝 낚시터에서 생선 3마리 — 마커가 초록 존에 올 때 낚아채면 되네." },
        ],
        complete: [
            { speaker: "어부", text: "싱싱하군! 이제 다시 바다에 나갈 수 있겠어. 받게 — 뱃일하며 모은 걸세." },
        ],
        needs: [{ id: "fish_common", qty: 3 }],
        rewards: [{ id: "mana_crystal", qty: 2 }],
        rewardGold: 100,
    },
    // ===== 웨이브2 — 외곽 5존 사이드퀘스트 =====
    {
        id: "herb_witch",
        npc: { x: -212.5, z: 106.5, y: -18.25, label: "약초술사", model: "/character/Witch.fbx" },
        availableFrom: "ch3_port",
        accept: [
            { speaker: "약초술사", text: "이 숲 깊숙한 곳에서 약을 짓고 있었는데… 시계탑이 멈추며 화로 불씨도 죽어버렸어요." },
            { speaker: "약초술사", text: "숲버섯 5개와 나무수액 2병만 있으면 다시 불을 지필 수 있을 텐데." },
            { speakerId: "theo", text: "숲버섯이라면 이 근방 그늘에, 나무수액은 오래된 나무 밑동에 흔하죠. 어렵지 않겠네요." },
        ],
        progress: [
            { speaker: "약초술사", text: "숲버섯 5개, 나무수액 2병이에요. 서두르지 않아도 괜찮으니 천천히 모아다 주세요." },
        ],
        complete: [
            { speaker: "약초술사", text: "이제야 화로에 다시 불이 붙네요! 정성껏 기른 황금 약초예요, 받아 두세요." },
            { speakerId: "lotti", text: "약초 냄새가 좋다! 이걸로 회복약 만들면 진짜 잘 들을 것 같아." },
        ],
        needs: [
            { id: "forest_mushroom", qty: 5 },
            { id: "tree_sap", qty: 2 },
        ],
        rewards: [{ id: "golden_herb", qty: 2 }],
        rewardGold: 150,
    },
    {
        id: "lost_hunter",
        npc: { x: -139.5, z: -215.5, y: -31.25, label: "사냥꾼", model: "/character/Ninja_Female.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "사냥꾼", text: "이 숲에 마녀 둘이 진을 치고 짐승들을 홀려버렸어. 사냥감이 씨가 말랐다고." },
            { speaker: "사냥꾼", text: "서쪽 능선 아래 야영지에 있을 거야. 처리해주면 사례하지." },
            { speakerId: "arin", text: "위치는 파악했다. 정리하고 오지." },
        ],
        progress: [
            { speaker: "사냥꾼", text: "서쪽 능선 아래야. 마녀 둘 — 조심해서 가라고." },
        ],
        complete: [
            { speaker: "사냥꾼", text: "숲이 다시 조용해졌군! 덕분에 사냥할 만해졌어. 이거 받게." },
            { speakerId: "lotti", text: "이제 사냥꾼 아저씨도 마음 놓고 다니겠다!" },
        ],
        kills: ["qw_nw_0", "qw_nw_1"],
        rewards: [
            { id: "silver_ore", qty: 2 },
            { id: "mana_potion", qty: 2 },
        ],
        rewardGold: 180,
    },
    {
        id: "reed_hermit",
        npc: { x: 233.5, z: -261.5, y: -47.25, label: "강태공", model: "/character/Elf.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "강태공", text: "낚시나 하며 세월을 보내고 있었는데… 미끼로 쓸 연꽃 2송이랑 갈대 3줄기가 똑 떨어졌지 뭔가." },
            { speaker: "강태공", text: "이 물가 갈대밭을 뒤지면 나올 걸세. 가져다주면 섭섭지 않게 챙겨주지." },
            { speakerId: "theo", text: "연꽃과 갈대라… 미끼치고는 흥미로운 조합이네요. 뭔가 비법이 있나 봅니다." },
        ],
        progress: [
            { speaker: "강태공", text: "연꽃 2송이, 갈대 3줄기일세. 이 갈대밭 어딘가에 있을 거야." },
        ],
        complete: [
            { speaker: "강태공", text: "허허, 고맙네! 자, 오늘 낚은 월광어랑 비약일세. 받아두게." },
            { speakerId: "arin", text: "낚시로 세월을 보내는 것도 나쁘지 않겠군." },
        ],
        needs: [
            { id: "lotus", qty: 2 },
            { id: "reed", qty: 3 },
        ],
        rewards: [
            { id: "fish_rare", qty: 2 },
            { id: "guard_elixir", qty: 1 },
        ],
        rewardGold: 160,
    },
    {
        id: "drift_trader",
        npc: { x: -80.5, z: 82.5, y: -33.25, label: "퇴역 뱃사람", model: "/character/VikingHelmet.fbx" },
        availableFrom: "ch3_port",
        accept: [
            { speaker: "퇴역 뱃사람", text: "예전엔 이 바다를 누비던 뱃사람이었지… 이젠 다리도 성치 않아 해안이나 어슬렁거리네." },
            { speaker: "퇴역 뱃사람", text: "유목 3개랑 바닷소금 2줌만 구해다 주면, 옛날에 배운 대로 물약 하나 만들어 주지." },
            { speakerId: "lotti", text: "유목이랑 바닷소금? 해안가를 뒤지면 금방 찾겠다!" },
        ],
        progress: [
            { speaker: "퇴역 뱃사람", text: "유목 3개, 바닷소금 2줌이야. 해안을 따라 걸으면 눈에 띌 걸세." },
        ],
        complete: [
            { speaker: "퇴역 뱃사람", text: "고맙네, 젊은이들. 오래 묵혀둔 비법 물약일세. 몸 성히 다니게나." },
            { speakerId: "theo", text: "노련한 뱃사람의 손맛이네요. 성분이 예사롭지 않습니다." },
        ],
        needs: [
            { id: "driftwood", qty: 3 },
            { id: "sea_salt", qty: 2 },
        ],
        rewards: [
            { id: "war_elixir", qty: 1 },
            { id: "health_potion", qty: 2 },
        ],
        rewardGold: 140,
    },
    {
        id: "gear_goblin",
        npc: { x: 199.5, z: 153.5, y: -49.25, label: "태엽기술자", model: "/character/Goblin_Male.fbx" },
        availableFrom: "ch5_gorge",
        accept: [
            { speaker: "태엽기술자", text: "끄응… 시계탑 톱니바퀴를 구하러 협곡까지 왔다가 배를 놓쳐버렸지 뭐야." },
            { speaker: "태엽기술자", text: "설상가상으로 내가 손대던 태엽 병정 둘이 폭주해서 협곡을 헤매고 있어. 저것들부터 멈춰줘!" },
            { speakerId: "arin", text: "네가 만든 것 아닌가. …알겠다, 처리하고 오지." },
        ],
        progress: [
            { speaker: "태엽기술자", text: "협곡 안쪽이야. 태엽 병정 둘 — 폭주 상태니 방심하지 말라고." },
        ],
        complete: [
            { speaker: "태엽기술자", text: "오오, 해냈군! 이 은혜는 잊지 않겠어. 협곡에서 캐 온 결정이랑 마물 핵일세, 받아둬." },
            { speakerId: "lotti", text: "고블린인데 나쁜 애가 아니었네! 다행이다." },
        ],
        kills: ["qw_gorge_0", "qw_gorge_1"],
        rewards: [
            { id: "dark_crystal", qty: 3 },
            { id: "monster_core", qty: 3 },
        ],
        rewardGold: 250,
    },
];
