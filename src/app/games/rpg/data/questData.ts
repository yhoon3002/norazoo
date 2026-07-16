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
];
