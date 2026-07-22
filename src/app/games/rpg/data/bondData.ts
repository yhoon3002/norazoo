// rpg/data/bondData.ts — 파티 유대 에피소드 3건 (회상 포인트, 1회성 E-대화 + 보상)
// 파티원 개인 서사: 아린(왕도 조사대 대장·기사) · 테오(태엽학자) · 로티(견습 요리사 출신 검사).
// 1회성 상태는 flags[`bond_${id}`]에 기록(세이브 무변경 — 기존 flags 네임스페이스 재사용).

import type { DialogueLine } from "./storyData";
import type { PartyId } from "../types/RpgTypes";

export type BondEpisode = {
    id: string; // flags[`bond_${id}`]
    charId: PartyId;
    x: number;
    y: number;
    z: number;
    label: string; // 지도/프롬프트 라벨
    availableFrom: string; // stageAtLeast
    lines: DialogueLine[]; // 6-8줄
    reward: { gold: number; items?: Array<{ id: string; qty: number }> };
};

export const BOND_EPISODES: BondEpisode[] = [
    {
        id: "arin",
        charId: "arin",
        x: 88.5, y: -33.25, z: -26.5, // 성문 옆 (검증 완료)
        label: "회상 — 아린",
        availableFrom: "ch4_hill",
        lines: [
            { speakerId: "arin", text: "이 성문… 예전에 이런 문 앞에서 파수를 선 적이 있다." },
            { speakerId: "theo", text: "왕도 기사단 시절 얘기군요. 흥미롭네요 — 아린 씨가 옛일을 꺼내는 건 드문 일인데." },
            { speakerId: "arin", text: "그날 밤, 성문이 뚫렸다. 나는 신참이었고, 검을 쥔 손이 떨렸지." },
            { speakerId: "lotti", text: "아린이 떨었다고? 상상이 안 가는데!" },
            { speakerId: "arin", text: "동료 하나를 지키지 못했다. …그 뒤로 다짐했다. 두 번은 없다고." },
            { speakerId: "theo", text: "그게 대장님의 그 절제된 검이군요. 감정이 아니라 책임으로 휘두르는." },
            { speakerId: "arin", text: "책임이자 속죄다. 이 문을 지날 때마다 되새긴다. …계속 가지." },
        ],
        reward: { gold: 200 },
    },
    {
        id: "theo",
        charId: "theo",
        x: -121.5, y: -13.75, z: -144.5, // 옛길 관측소 (검증 완료)
        label: "회상 — 테오",
        availableFrom: "ch4_hill",
        lines: [
            { speakerId: "theo", text: "여기예요. 스승님이 별의 궤적을 재던 옛 관측소… 아직 남아 있었네요." },
            { speakerId: "arin", text: "먼지가 두껍다. 오래 방치된 모양이군." },
            { speakerId: "theo", text: "이 노트들, 스승님의 필체예요. 『태엽은 시간을 재는 도구가 아니라, 시간을 붙드는 그릇이다』…" },
            { speakerId: "lotti", text: "빵도 그릇에 담아 구우면 모양이 잡히잖아. 그거랑 비슷한 거야?" },
            { speakerId: "theo", text: "…비유가 서투르지만, 얼추 맞아요. 이 기록이 태엽학의 첫 페이지였던 겁니다." },
            { speakerId: "theo", text: "스승님은 늘 말씀하셨죠. '흥미롭다'는 말로 세상을 끝까지 들여다보라고. 제 입버릇, 여기서 왔나 봅니다." },
            { speakerId: "arin", text: "네가 왜 그렇게 유물에 집착하는지 이제 알겠군." },
            { speakerId: "theo", text: "집착이라뇨 — 계승이라고 해두죠. 흥미롭네요, 스스로도." },
        ],
        reward: { gold: 150, items: [{ id: "mana_crystal", qty: 3 }] },
    },
    {
        id: "lotti",
        charId: "lotti",
        x: 14.5, y: -32.25, z: -33.5, // 광장 화덕 (검증 완료)
        label: "회상 — 로티",
        availableFrom: "ch3_port",
        lines: [
            { speakerId: "lotti", text: "이 화덕! 사부님이 처음 프라이팬 쥐는 법 가르쳐준 자리야." },
            { speakerId: "arin", text: "그런데 왜 검을 들었지? 요리만 해도 됐을 텐데." },
            { speakerId: "lotti", text: "사부님이 다치는 걸 본 적 있거든. 시장에서 강도한테… 그때 결심했어. 지킬 수 있는 손이 되자고." },
            { speakerId: "theo", text: "그래서 검도, 프라이팬도 놓지 않는 거군요. 흥미롭네요 — 둘 다 '지킨다'는 같은 뿌리네요." },
            { speakerId: "lotti", text: "맞아! 한쪽은 배를 채우고, 한쪽은 목숨을 지키고. 둘 다 있어야 진짜 든든하잖아." },
            { speakerId: "arin", text: "…납득했다. 네 검이 가벼워 보여도 진심인 이유를." },
            { speakerId: "lotti", text: "그럼 이따 이 화덕에서 축하 요리 하나 해줄게! 기대해!" },
        ],
        reward: {
            gold: 150,
            items: [
                { id: "golden_herb", qty: 1 },
                { id: "forest_mushroom", qty: 2 },
            ],
        },
    },
];
