// rpg/data/cutsceneData.ts — 컷신 시퀀스 선언 (연출 타임라인, 데이터 주도)
import type { Vec3 } from "../types/RpgTypes";
import type { DialogueLine } from "./storyData";
import type { StoryState } from "../presenter/slices/storySlice";

export type CutsceneStep =
    | { type: "say"; line: DialogueLine }
    /** 카메라 이동 — pos 생략 시 현 위치 고정, lookAt만 전환. ms 동안 보간 후 hold ms 유지 */
    | { type: "cam"; pos?: Vec3; lookAt: Vec3; ms: number; hold?: number }
    /** 3인칭 카메라로 복귀 보간 */
    | { type: "camReset"; ms: number }
    | { type: "wait"; ms: number }
    | { type: "fx"; popup: { text: string; color: string } }
    /** 상태 변경 — startCutscene에서 선적용됨(재생 순서와 무관) */
    | {
          type: "set";
          flags?: Record<string, boolean>;
          story?: Partial<StoryState>;
          giveGold?: number;
          giveItems?: Array<{ id: string; qty: number }>;
      }
    /** 이벤트 전투 — 진입 즉시 다음 인덱스로 저장되어 전투 복귀 후 이어서 재생 */
    | { type: "battle"; id: string; templates: string[] };

export const CUTSCENES: Record<string, CutsceneStep[]> = {
    // SP0 검증용 — SP1에서 실제 컷신으로 교체·확장
    sp0_test: [
        { type: "set", flags: { sp0_cutscene_seen: true }, giveGold: 1 },
        { type: "cam", pos: { x: 16, y: -28, z: -18 }, lookAt: { x: 12.8, y: -32, z: -14 }, ms: 1200, hold: 400 },
        { type: "say", line: { speakerId: "arin", text: "(SP0 테스트) 광장이 보인다." } },
        { type: "fx", popup: { text: "✨ 연출 테스트", color: "#7dd3fc" } },
        { type: "wait", ms: 300 },
        { type: "camReset", ms: 800 },
    ],
    // ===== SP1 1막 전반부 컷신 4종 (오프닝·요리사 재회·첫 전투·항구 진입) =====
    // 카메라 좌표는 헤드리스 rAF 캡처로 실측 확정(scratchpad/sp1-t3-*.js). 원문 대사는 삭제 없이
    // 컷신 say로 이관 + 확장(storyData.ts 구 90~210행 참조).
    cs_opening: [
        // 거리 팬 2샷 — 스폰 인근 골목(광장 방향으로 회전)
        { type: "cam", pos: { x: 18, y: -31, z: -33 }, lookAt: { x: 12.8, y: -31.3, z: -28.8 }, ms: 1600, hold: 900 },
        { type: "cam", pos: { x: 16, y: -31, z: -17 }, lookAt: { x: 12.8, y: -31.8, z: -14 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "arin", text: "여기가 노라다. 시계탑이 멈춘 밤, 마을 전체와 연락이 끊겼다 — 왕도의 의뢰는 원인 조사와 생존자 구조. 이상." } },
        { type: "say", line: { speakerId: "theo", text: "공기 중 에테르가 정체되어 있어요. 시간이… 고여 있달까요. 거리의 주민들이 전부 그 자리에 굳어 있습니다. 흥미롭네요 — 아니, 큰일이네요." } },
        { type: "say", line: { speakerId: "lotti", text: "저기 광장에 불빛이 있어! 누가 깨어 있나 봐. 굳은 사람들도 조사해 보자(E). 뭔가 단서가 나올지도!" } },
        { type: "say", line: { speakerId: "arin", text: "대열은 내가 선두, 로티는 후위, 테오는 중앙에서 기록을 맡는다. …섣불리 움직이지 마라. 이 마을이 아직 무엇에 붙잡혀 있는지 모른다." } },
        { type: "say", line: { speakerId: "theo", text: "재밌는 점은, 멈춘 게 사람만이 아니라는 거예요. 널린 빨래도, 깃발도 — 흥미롭네요. …아니, 다시 정정할게요. 소름 끼치네요." } },
        { type: "say", line: { speakerId: "lotti", text: "그런데 냄새가 하나도 안 나. 사람 사는 마을이면 밥 짓는 냄새라도 나야 하는데… 꼭 뜸 들이다 만 밥 같아. 뭔가 멈춰 있어, 이 마을 전체가." } },
        { type: "cam", pos: { x: 30, y: -20, z: -30 }, lookAt: { x: 18, y: -8, z: 0 }, ms: 2600, hold: 2000 },
        { type: "say", line: { speakerId: "arin", text: "탑이 멈췄다. 그리고 마을도. …원인부터 찾는다." } },
        { type: "camReset", ms: 1200 },
    ],
    cs_cook_meet: [
        // 화덕 원경 → 줌 — 광장 화덕/요리사(MERCHANT_POS)
        { type: "cam", pos: { x: 18, y: -30.5, z: -19 }, lookAt: { x: 12.8, y: -31.8, z: -14 }, ms: 1600, hold: 900 },
        { type: "cam", pos: { x: 16, y: -31, z: -17 }, lookAt: { x: 12.8, y: -31.8, z: -14 }, ms: 1800, hold: 1400 },
        { type: "say", line: { speaker: "요리사", text: "손님이라니! 시계탑이 멈춘 뒤로 처음이군. 난 이 마을의 요리사요." } },
        { type: "say", line: { speakerId: "lotti", text: "사부님! 저예요, 로티! 왕도에서 검 배우러 떠났던… 설마 절 잊으신 건 아니죠?!" } },
        { type: "say", line: { speaker: "요리사", text: "오오, 로티! 많이 컸구나. …그날 밤, 시계탑의 태엽 조각 셋이 흩어지면서 다들 잠들듯 사라졌단다." } },
        { type: "say", line: { speaker: "요리사", text: "조각을 모아 시계탑을 다시 돌려주게. 우선 저기 빛나는 상자의 물자부터 챙기고." } },
        { type: "say", line: { speaker: "요리사", text: "내가 본 걸로는— 하나는 반짝이며 바다 쪽으로, 하나는 바람 부는 언덕으로, 마지막 하나는 저 어두운 협곡 쪽으로 날아갔지. 셋 다 챙겨야 탑이 다시 돈다네." } },
        { type: "say", line: { speaker: "요리사", text: "참, 옛날 공방 장인이 저 시계탑을 만들었지. …요즘 그 사람 소식을 통 못 들었는데, 무사한지 모르겠군." } },
        { type: "say", line: { speakerId: "lotti", text: "사부님 화덕 불씨는 여전하네요! 이 냄새 하나로도 배가 든든해지는 기분이에요. …얼른 조각 찾아서, 다 같이 사부님 요리 다시 먹어요!" } },
        { type: "camReset", ms: 1000 },
    ],
    cs_first_battle: [
        // 슬라임 잔해 원경 → 부스러기 줌 — 튜토리얼 전투 지점
        { type: "cam", pos: { x: 16, y: -31.2, z: -32 }, lookAt: { x: 12.8, y: -32.5, z: -28.8 }, ms: 1400, hold: 700 },
        { type: "cam", pos: { x: 15, y: -31.5, z: -31 }, lookAt: { x: 12.8, y: -32.8, z: -28.8 }, ms: 1400, hold: 1000 },
        { type: "fx", popup: { text: "⚙️ 태엽 부스러기 발견", color: "#facc15" } },
        { type: "say", line: { speakerId: "lotti", text: "어라, 슬라임이 녹으면서 이상한 게 나왔어. 이거… 톱니바퀴 조각 같은데?" } },
        { type: "say", line: { speakerId: "theo", text: "슬라임 안에 이런 정교한 부품이라니 — 자연 발생이 아니에요. 누군가, 혹은 무언가가 만들어 넣은 겁니다. 흥미롭네요." } },
        { type: "say", line: { speakerId: "arin", text: "슬라임 따위가 태엽을 삼킬 리 없다. …이 마을에서 벌어진 일과 무관하지 않겠군." } },
        { type: "say", line: { speaker: "요리사", text: "제법이군! 북쪽 광장엔 오크 무리가 진을 치고 있소." } },
        { type: "say", line: { speaker: "요리사", text: "놈들을 정리하면 항구로 가는 길이 열릴 거요. 광장에 깃발을 세워뒀으니 쉬어가시게." } },
        { type: "camReset", ms: 900 },
    ],
    cs_port_arrival: [
        // phen_port 활성 — 멈춘 파도 첫 가동
        { type: "set", flags: { phen_port: true } },
        // 부두 팬 2샷 — 항구 원경 → 물가 조망
        { type: "cam", pos: { x: 222, y: -33, z: -13 }, lookAt: { x: 235, y: -36, z: -9 }, ms: 1800, hold: 900 },
        { type: "cam", pos: { x: 214, y: -36, z: -14 }, lookAt: { x: 226, y: -37, z: -14 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "🌊 멈춘 파도가 움직이기 시작한다", color: "#7dd3fc" } },
        { type: "say", line: { speakerId: "lotti", text: "여기가 항구구나… 배들이 시간에 갇힌 채 멈춰 있어. 생선 비린내조차 안 나." } },
        { type: "say", line: { speakerId: "arin", text: "등대 앞에 뭔가 반짝인다. 태엽 조각이다. …그리고 이건, 등대지기의 일지인가." } },
        { type: "say", line: { speakerId: "theo", text: "『협곡의 불빛이 밤마다 커진다. 무언가가 태엽을 삼키고 있다…』 — 흥미롭네요. 그리고 몹시 불길합니다." } },
        { type: "say", line: { speakerId: "lotti", text: "잠깐, 방금 물결이 움직이지 않았어? …파도 소리가 다시 들려! 꼭 국이 막 끓기 시작한 것처럼." } },
        { type: "say", line: { speakerId: "arin", text: "시간이 풀리고 있다. 이 항구부터. …등대지기의 일지, 나머지도 마저 읽어봐야겠군." } },
        { type: "say", line: { speakerId: "theo", text: "국소적 현상 재개 — 시간이 이 항구에 한해서만 되감기는 느낌이에요. 왜 여기부터일까요… 흥미롭네요, 정말로." } },
        { type: "camReset", ms: 1200 },
    ],
    sp0_test_battle: [
        { type: "say", line: { speakerId: "theo", text: "(SP0 테스트) 기척입니다 — 전투!" } },
        { type: "battle", id: "sp0_evt", templates: ["slime"] },
        { type: "say", line: { speakerId: "lotti", text: "(SP0 테스트) 전투 후에도 이어진다!" } },
        { type: "set", flags: { sp0_battle_cutscene_done: true } },
    ],
};
