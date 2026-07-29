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
        { type: "say", line: { speakerId: "theo", text: "재밌는 점은, 멈춘 게 사람만이 아니라는 거예요. 널린 빨래도, 깃발도 — 눈여겨볼 만하네요. …아니, 다시 정정할게요. 소름 끼치네요." } },
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
        { type: "say", line: { speakerId: "theo", text: "슬라임 안에 이런 정교한 부품이라니 — 자연 발생이 아니에요. 누군가, 혹은 무언가가 만들어 넣은 겁니다. 예사롭지 않은 발견이네요." } },
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
        { type: "say", line: { speakerId: "theo", text: "국소적 현상 재개 — 시간이 이 항구에 한해서만 되감기는 느낌이에요. 왜 여기부터일까요… 곱씹어볼 대목이네요, 정말로." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP1 1막 후반부 컷신 4종 (등대 일지·제단 수호자·협곡 진입·마수 피날레) =====
    // 카메라 좌표는 헤드리스 rAF 캡처로 실측 확정(scratchpad/t5-cam-probe*.js, task5-cs_*.png).
    // 원문 대사는 삭제 없이 컷신 say로 이관 + 확장(storyData.ts 구 LORE_POINTS.port_note·
    // hill_altar·gorge_landing·gorge_boss_done 원문 참조). 협곡·아레나 일대는 실측상 국지
    // 수면고가 예상보다 높은 침수 지형이라(근접 저고도 샷은 카메라가 물 속에 잠김) 수면 상공에서의
    // 원경 구도로 확정 — task-5-report.md 카메라 절 참조.
    cs_lighthouse: [
        // 일지 클로즈업 2샷 — 등대 계단 아래 일지(구 LORE_POINTS.port_note 자리)
        { type: "cam", pos: { x: 158, y: -35, z: -3 }, lookAt: { x: 161.2, y: -36.5, z: -0.7 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "arin", text: "등대 계단 아래, 낡은 일지가 놓여 있다. …오래되진 않은 것 같군." } },
        { type: "cam", pos: { x: 165, y: -34, z: -5 }, lookAt: { x: 161.2, y: -36.5, z: -0.7 }, ms: 1600, hold: 1400 },
        { type: "say", line: { speakerId: "theo", text: "등대지기가 남긴 기록이에요. 페이지가 여러 장 겹쳐 있네요 — 하나씩 읽어보죠." } },
        { type: "say", line: { speaker: "쪽지", text: "『협곡의 불빛이 밤마다 커진다. 태엽을 삼킨 무언가가 저기 있다.』" } },
        { type: "say", line: { speakerId: "lotti", text: "불빛이 커진다는 건… 뭔가 점점 배가 부르고 있다는 소리 같아. 좋은 징조는 아니네." } },
        { type: "say", line: { speaker: "쪽지", text: "『다섯째 밤. 협곡에서 톱니가 갈리는 소리가 들린다. 우리 마을 태엽공이 만든 부품들이, 밤마다 하나씩 사라진다. 누군가 — 아니, 무언가가 그것들을 삼키고 있다.』" } },
        { type: "say", line: { speakerId: "theo", text: "'우리 마을 태엽공'이라니 — 공방의 그분과 무관하지 않겠어요. 부품이 사라진 시점도 시계탑이 멎은 밤과 겹칩니다. 예사롭지 않은 대목이에요." } },
        { type: "say", line: { speaker: "쪽지", text: "『이레째 밤. 시계탑의 종이 스스로 멎던 그 시각, 협곡 쪽에서 무언가 걸어 나오는 걸 보았다. 마을 사람들은 그것을 그저 '그분'이라 불렀다. …다시는 등대를 떠나지 않으리라.』" } },
        { type: "say", line: { speakerId: "arin", text: "'그분'. …이 밤, 마을 곳곳에서 같은 말을 들었다. 협곡에서 답을 찾는다." } },
        { type: "fx", popup: { text: "📜 등대지기의 일지 (3편) 완독", color: "#f5c96b" } },
        { type: "camReset", ms: 1000 },
    ],
    cs_altar_guardian: [
        // 제단 카메라 상승 2샷(y: -24 → -16) — 바람 언덕 정상 제단
        { type: "cam", pos: { x: 6, y: -24, z: -205 }, lookAt: { x: 0, y: -25, z: -210 }, ms: 1600, hold: 800 },
        { type: "say", line: { speakerId: "theo", text: "제단이에요. 두 번째 태엽 조각의 파동이… 바로 아래에서 느껴집니다." } },
        { type: "cam", pos: { x: 10, y: -16, z: -218 }, lookAt: { x: 0, y: -24, z: -210 }, ms: 2200, hold: 1200 },
        { type: "say", line: { speakerId: "lotti", text: "밤바람이 차네… 근데 이 언덕, 뭔가 식어버린 스튜 냄새가 나. 오래 방치된 것처럼." } },
        { type: "say", line: { speakerId: "theo", text: "제단 표면의 문양이 은은히 빛나고 있어요. 파수 결계로 보이는데, 아직 작동 중이라는 뜻이겠죠." } },
        { type: "say", line: { speakerId: "arin", text: "기척이 있다. 수호자다 — 무기 들어." } },
        { type: "say", line: { speakerId: "lotti", text: "…좋아, 각오는 됐어! 조각은 우리가 먼저 맛본다!" } },
        { type: "fx", popup: { text: "⚔️ 언덕의 수호자들이 나타난다", color: "#f87171" } },
        // battle 스텝 — 기존 hill_altar 트리거의 battle 필드 이관(id·templates 그대로 →
        // defeated_guardians_0/1/2 플래그 호환). 뒤에 camReset 없이 say/fx로 마감(규약).
        { type: "battle", id: "guardians", templates: ["orc_chief", "orc", "orc"] },
        { type: "say", line: { speakerId: "lotti", text: "받았어! 이게… 두 번째 조각이구나. 따뜻해, 마치 갓 구운 것처럼." } },
        { type: "fx", popup: { text: "⚙️ 태엽 조각 (2/3) 획득", color: "#facc15" } },
    ],
    cs_gorge_descent: [
        // 어둠 속 카메라 2샷 — 협곡 상륙지(gorge_landing), 원경은 아레나 방향(협곡 안쪽)을 조망
        { type: "cam", pos: { x: 139.5, y: -35, z: 8 }, lookAt: { x: 180, y: -42, z: 60 }, ms: 2000, hold: 1200 },
        { type: "say", line: { speakerId: "arin", text: "…공기가 다르다. 여기가 어둠의 협곡이군." } },
        { type: "cam", pos: { x: 145, y: -30, z: 12 }, lookAt: { x: 139.5, y: -38, z: 17.5 }, ms: 1800, hold: 1200 },
        { type: "say", line: { speakerId: "theo", text: "시간의 정체가 가장 짙어요. 태엽 조각이 — 아니, '삼킨 자'가 깊은 곳에 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "발밑 조심해. 뭔가… 움직이고 있어." } },
        { type: "say", line: { speakerId: "theo", text: "저 안쪽, 그림자의 윤곽이 예사롭지 않아요. 몸집이 저희가 상대했던 것들과는 급이 다릅니다." } },
        { type: "fx", popup: { text: "…저 멀리, 거대한 그림자가 꿈틀거린다", color: "#a78bfa" } },
        { type: "say", line: { speakerId: "arin", text: "밤이 깊을수록 저것의 기운도 짙어진다. 서둘러야 한다." } },
        { type: "say", line: { speakerId: "lotti", text: "…솔직히 무서워. 그치만 사부님 요리, 다 같이 다시 먹으러 가야지." } },
        { type: "camReset", ms: 1200 },
    ],
    cs_maw_finale: [
        // 아레나 원경 리빌 2샷 — GORGE_BOSS_ARENA(침수 폐허, 수면 상공에서 조망)
        { type: "cam", pos: { x: 300, y: -18, z: 75 }, lookAt: { x: 268.5, y: -35, z: 42.5 }, ms: 2000, hold: 1000 },
        { type: "say", line: { speaker: "태엽을 삼킨 마수", text: "…그분의 시간은, 되돌아온다" } },
        { type: "cam", pos: { x: 290, y: -12, z: 65 }, lookAt: { x: 268.5, y: -33, z: 42.5 }, ms: 1800, hold: 1200 },
        { type: "say", line: { speakerId: "lotti", text: "해냈어…! 마지막 조각이야!" } },
        { type: "say", line: { speakerId: "theo", text: "세 조각이 공명하고 있어요. 시계탑이 부르는 겁니다." } },
        { type: "say", line: { speakerId: "theo", text: "방금 그 말, '그분'이라니 — 무시할 수 없는 단서예요. 조각을 모은 뒤엔 반드시 되짚어봐야겠습니다." } },
        { type: "say", line: { speakerId: "arin", text: "돌아가자. 노라의 아침을 되찾으러." } },
        { type: "say", line: { speakerId: "arin", text: "…경계는 늦추지 않는다. 이 밤이 끝나도, '그분'이라는 이름은 잊지 않겠다." } },
        { type: "fx", popup: { text: "✨ 태엽 조각 (3/3) 획득 — 공명", color: "#a78bfa" } },
        { type: "camReset", ms: 1200 },
    ],
    sp0_test_battle: [
        { type: "say", line: { speakerId: "theo", text: "(SP0 테스트) 기척입니다 — 전투!" } },
        { type: "battle", id: "sp0_evt", templates: ["slime"] },
        { type: "say", line: { speakerId: "lotti", text: "(SP0 테스트) 전투 후에도 이어진다!" } },
        { type: "set", flags: { sp0_battle_cutscene_done: true } },
    ],
};
