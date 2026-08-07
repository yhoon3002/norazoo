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
        // 공방 장인 언급은 FieldMerchant 화덕 씨앗 퀘스트(quest_cook) 쪽 1곳에만 유지 —
        // 여기 있던 동일 문장은 중복이라 삭제 (SP1 최종 리뷰 M-3).
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
    // ===== SP2a T1 — 2막 개막 막간① (징조 컷신) =====
    // 카메라는 헤드리스 rAF 캡처로 실측 확정(scratchpad/sp2a-t1-cam-probe.js,
    // sp2a-cs_act2_omen.png). 광장 두 샷(요리사 앞 대로)은 cs_cook_meet의 두 번째 cam
    // 좌표를 재사용(같은 앵커·재건 광장 배경 — 1막 보상의 시각적 재확인), 시계탑 실루엣은
    // cs_opening 엔딩 리빌 구도를 재사용(같은 탑, "헛도는 조짐"이라는 다른 의미로).
    cs_act2_omen: [
        { type: "cam", pos: { x: 16, y: -31, z: -17 }, lookAt: { x: 12.8, y: -31.8, z: -14 }, ms: 1600, hold: 1200 },
        { type: "fx", popup: { text: "🔔 시계탑이 한 박자, 헛돈다", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "theo", text: "…방금, 종소리 박자가 하나 어긋났어요. 재보정 오차치고는 너무 큽니다." } },
        { type: "say", line: { speakerId: "arin", text: "다시 멈추는 조짐인가. …경계한다." } },
        { type: "say", line: { speakerId: "lotti", text: "잔치 끝난 지 얼마나 됐다고… 부디 착각이었으면 좋겠는데." } },
        { type: "cam", pos: { x: 30, y: -20, z: -30 }, lookAt: { x: 18, y: -8, z: 0 }, ms: 2000, hold: 1400 },
        { type: "say", line: { speakerId: "arin", text: "탑은 아직 돌고 있다. …그런데도 이 불안은 가시지 않는다." } },
        { type: "cam", pos: { x: 16, y: -31, z: -17 }, lookAt: { x: 12.8, y: -31.8, z: -14 }, ms: 1400, hold: 900 },
        { type: "say", line: { speaker: "전령", text: "실례합니다 — 왕도 조사대를 찾고 있었습니다! 항구 쪽에서 급보가 왔습니다." } },
        { type: "say", line: { speaker: "전령", text: "『파도가 다시 멈췄소.』 등대지기가 보내온 전갈입니다. …혹 아직 이 근방에 계신다면, 다시 한번 힘을 빌리고 싶다 했습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "또…? 겨우 되찾은 아침인데. 그래도 파도가 멈췄다면, 누군가 또 그 자리에 굳어 있단 소리잖아." } },
        { type: "say", line: { speakerId: "theo", text: "재발이라니 — 반갑지 않은 소식이네요. 태엽 조각 셋을 전부 되찾았는데도 이상이 되풀이된다는 뜻이니까요." } },
        { type: "say", line: { speakerId: "arin", text: "이유는 항구에 가서 찾는다. …지금은 서두르는 게 먼저다." } },
        { type: "say", line: { speakerId: "theo", text: "동감이에요. 다만 기록은 남겨두죠 — 이 재발, 노라 하나만의 사정이 아닐 수도 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "무섭게 말하지 마… 그치만 짐꾼 아저씨랑 뱃사람들, 또 굳어버렸을지도 모르잖아. 가만있을 순 없어." } },
        { type: "say", line: { speakerId: "arin", text: "간다. 항구부터 — 이번에도 우리가 되돌린다." } },
        { type: "say", line: { speakerId: "lotti", text: "좋아! 이번엔 진짜로 그 생선구이 먹으러 가는 거야. 가자!" } },
        { type: "fx", popup: { text: "⚙️ 2막 — 여덟 개의 멈춘 시간", color: "#a78bfa" } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2a T2 — 항구 챕터 「멈춘 파도」 재발(조사 아크 컷신 2종) =====
    // 카메라는 헤드리스 rAF 캡처로 실측 확정(scratchpad/sp2a-t2-cam-probe.js →
    // sp2a-cs_port2_arrival.png·sp2a-cs_arin_letter.png). 항구 앵커 박스(214~235,-38층) 준수.
    // cs_port2_arrival 1번 샷은 1막 cs_port_arrival의 첫 샷 좌표를 그대로 재사용(같은 부두,
    // "재발"이라는 다른 의미로 — cs_act2_omen의 재사용 관례 계승). 2번 샷은 신규 실측(수로를
    // 따라 내려다보는 수평에 가까운 조망 — 부두 수면 방향, 부감 아님).
    cs_port2_arrival: [
        { type: "set", flags: { phen_port2: true } },
        { type: "cam", pos: { x: 222, y: -33, z: -13 }, lookAt: { x: 235, y: -36, z: -9 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "또 이 침묵이야… 아니, 이번엔 그때보다 더 무거워. 냄새조차 하나도 없어." } },
        { type: "cam", pos: { x: 233, y: -25, z: -8 }, lookAt: { x: 233, y: -38, z: 25 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "🐦 얼어붙은 파도 위, 갈매기 한 마리가 멈춰 있다", color: "#7dd3fc" } },
        { type: "say", line: { speakerId: "theo", text: "포그 밀도가 1막 때보다 짙어요. 저 갈매기도 날갯짓 중에 그대로 멈췄고요 — 단순 재발이 아니라, 정지 강도 자체가 짙어진 겁니다." } },
        { type: "say", line: { speakerId: "theo", text: "지난번엔 항구부터 시간이 풀렸었죠. 이번엔 반대로 항구부터 다시 잠깁니다. …원인이 이 근방에 있다는 뜻이겠죠." } },
        { type: "say", line: { speakerId: "arin", text: "다 되돌렸다고 생각했다. …그런데 이번엔 더 깊이 얼어붙었다. 짐꾼과 뱃사람부터 확인한다." } },
        { type: "say", line: { speakerId: "lotti", text: "돌아온 거야, 그 밤이…? 그래도 이번엔 뭐가 다른지부터 알아보고 가자. 무작정 무서워만 하기엔 억울하잖아." } },
        { type: "camReset", ms: 1200 },
    ],
    // 아린 서사 1장 — 부두에서 왕도 전령과 조우(cs_act2_omen과 동일 인물, 화자 "전령" 라벨
    // 재사용 — 브리프의 "왕도 전령" 표기는 통일 대상, T1 리뷰 이월 지시 반영). 봉인 서신
    // 낭독 + 아린의 절제된 갈등 개시. "그분"은 이미 1막에서 명명된 용어를 재언급할 뿐,
    // 정체를 새로 지목하지 않는다 — 태엽장인(공방 주인)도 이름으로 특정하지 않는다.
    cs_arin_letter: [
        { type: "cam", pos: { x: 220, y: -35, z: -8 }, lookAt: { x: 216, y: -37, z: -12 }, ms: 1600, hold: 900 },
        { type: "say", line: { speaker: "전령", text: "실례합니다 — 왕도 조사대를 다시 뵙는군요. 항구까지 오시느라 고생하셨을 텐데, 하나만 더 부탁드리러 왔습니다." } },
        { type: "cam", pos: { x: 214, y: -36, z: -14 }, lookAt: { x: 226, y: -37, z: -14 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "전령", text: "봉인 서신입니다. 기사단 문장이 찍혀 있더군요 — 저는 내용을 알지 못합니다. 조사대분들께 직접 전하라는 명이었습니다." } },
        { type: "fx", popup: { text: "📜 봉인 서신 — 기사단 문장", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "arin", text: "…내가 개봉하지." } },
        { type: "say", line: { speakerId: "arin", text: "『대륙 전역에서 유사한 시간 이상이 다수 보고됨. 노라는 처음이 아니었다.』 …기사단이, 이걸 알고 있었다는 건가." } },
        { type: "say", line: { speakerId: "theo", text: "처음이 아니었다니 — 저희가 항구를 되돌리기 전부터, 이미 다른 곳에서도 벌어지고 있었단 뜻이겠군요. 보고를 받고도 왜 침묵했을까요." } },
        { type: "say", line: { speakerId: "arin", text: "…알면서도, 보내지 않았다. 그럴 이유가 있었겠지. 지금은 묻지 않는다." } },
        { type: "say", line: { speakerId: "lotti", text: "아린…? 괜찮아? 그런 표정, 나한테는 그냥 숨기지 않아도 돼." } },
        { type: "say", line: { speakerId: "arin", text: "괜찮다. …다만 등대지기의 일지에 있던 '그분'이, 이 일과 무관하지 않다는 확신만 굳어질 뿐이다." } },
        { type: "say", line: { speakerId: "theo", text: "공방 쪽 흔적도 겹칩니다. …전부 기록해 두죠. 지금은 소용돌이 아래부터 확인해야겠어요." } },
        { type: "say", line: { speakerId: "lotti", text: "가자. …근데 이번 잔치는, 다 끝나고 제대로 하는 거다? 사부님 몫까지 남겨둬야지." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2a T4 — 항구 보스 「파도를 삼킨 자」 진입·격파 컷신 =====
    // 침수 창고 최심부(트리거 near 195,-37 인근) — 조명 오버라이드(__lightOverride, T3
    // port_warehouse: ambient 0.12·lamp 0.5·fog #0a1c22 near3 far18) 상태에서 카메라 확정
    // (헤드리스 rAF drawImage 캡처 — scratchpad/sp2a-t4-cam-probe.js →
    // sp2a-cs_port2_relic-1.png/-2.png/-3.png). 전부 walkable 층(y≈-42.25) 기준 수평 시선
    // (부감 없음). battle 스텝(보스전) 포함 — 승리해야 잔여 연출(유물 회수 내레이션)이
    // 재생된다(checkedResume 게이트). phen_port2 소등·relic_wave·act2_hill 전이는 여기 두지
    // 않고 별도 트리거(port2_relic, storyData.ts)로 분리했다 — set 스텝은 startCutscene마다
    // 선적용되므로, 여기 두면 패배 후 재접근(재도전)만으로 승리 전에 현상이 꺼져버린다.
    cs_port2_relic: [
        { type: "cam", pos: { x: 191, y: -40.8, z: -37 }, lookAt: { x: 197, y: -41.2, z: -35.5 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…기척이 짙어요. 이 안, 소용돌이의 근원이 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "물비린내가 아니야. 이건… 뭔가 살아있는 것의 숨소리 같은데." } },
        { type: "cam", pos: { x: 189, y: -40.5, z: -35 }, lookAt: { x: 198, y: -41.3, z: -35 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "파도를 삼킨 자", text: "…돌려주지 않는다. 이 물살은, 이미 내 것이다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 파도다. 돌려받겠다 — 무기 들어." } },
        { type: "fx", popup: { text: "🌊 파도를 삼킨 자가 모습을 드러낸다", color: "#22d3ee" } },
        { type: "battle", id: "port2_boss", templates: ["wave_devourer"] },
        { type: "say", line: { speakerId: "lotti", text: "…해냈다! 소용돌이가 잦아들고 있어!" } },
        { type: "say", line: { speakerId: "theo", text: "이 유물이 파도 자체를 붙들고 있었어요. …회수하죠. 파도의 유물, 첫 번째입니다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 시간을 또 하나 되찾았다. …다음은 바람 언덕이다." } },
        { type: "fx", popup: { text: "🌊✨ 파도의 유물 획득 (1/?)", color: "#a78bfa" } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2a T5 — 바람 언덕 챕터 「반복되는 하루」(체인 컷신 2종) =====
    // 카메라는 헤드리스 rAF 캡처로 실측 확정(scratchpad/sp2a-t5-cam-probe.js·-probe3.js →
    // sp2a-cs_hill2_arrival.png·sp2a-cs_lotti_home.png). 언덕 앵커 박스(hill2_arrival~lotti
    // 4트리거 walkable 실측) 준수, 전부 수평 시선(부감 없음).
    cs_hill2_arrival: [
        // phen_hill 활성 — 호박빛 여명 고정 첫 가동(선점등 규약, 순수 점등이라 선적용 무해)
        { type: "set", flags: { phen_hill: true } },
        { type: "cam", pos: { x: 8, y: -18, z: -184 }, lookAt: { x: 0, y: -20.5, z: -178 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "…같은 뱃고동 소리인 줄 알았어. 아니, 이건— 같은 양 울음이야. 방금 그 울음, 분명 아까도 들었어." } },
        { type: "cam", pos: { x: -6, y: -17, z: -172 }, lookAt: { x: 0, y: -20.5, z: -178 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "🌅 호박빛 여명이 미동조차 없다", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "theo", text: "여명이 조금도 움직이지 않아요. 해가 뜨는 게 아니라, 뜬 채로 멈춰 있는 겁니다 — 항구 때와는 결이 달라요." } },
        { type: "say", line: { speakerId: "arin", text: "같은 아침이 되풀이되고 있다. …주민들은 눈치채지 못한 채로." } },
        { type: "say", line: { speakerId: "lotti", text: "매일 같은 국을 끓이는 셈이야. 간도, 불 조절도 하나 안 바뀌는… 그런 국. 생각만 해도 소름 끼쳐." } },
        { type: "say", line: { speakerId: "theo", text: "주민들 반응부터 확인해 보죠. 다들 오늘이 처음이라고 믿고 있을 겁니다." } },
        { type: "say", line: { speakerId: "arin", text: "간다. 증인을 찾는다." } },
        { type: "camReset", ms: 1200 },
    ],
    // 제단 뒤 목장의 오두막 — 로티의 고향, 사부의 낡은 조리 노트 발견(T2의 cs_arin_letter
    // 대응: 서사 컷신 + 귀환 동선). "장인과 함께 먹던 스튜" 1줄로 공방 장인(f_toymaker) 복선과
    // 교차하되, 태엽장인("그분")을 직접 지목하지 않는다 — 1막 로어(공방 주인이 "그분"에게
    // 태엽 기술을 배웠다는 f_toymaker 증언, cs_lighthouse의 "그분" 명명)와 모순 없이, 로티의
    // 사부와 공방 주인이 아는 사이였다는 인간적 디테일만 additive로 얹는다.
    cs_lotti_home: [
        { type: "cam", pos: { x: 22, y: -29, z: -246 }, lookAt: { x: 32, y: -31, z: -248 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "…이 문, 손잡이 모양이… 사부님 댁이랑 똑같아. 설마—" } },
        { type: "cam", pos: { x: 26, y: -29, z: -253 }, lookAt: { x: 32, y: -30, z: -246 }, ms: 1800, hold: 1200 },
        { type: "say", line: { speakerId: "arin", text: "…이곳이, 요리사의 고향인가." } },
        { type: "fx", popup: { text: "📓 낡은 조리 노트를 발견했다", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "lotti", text: "『소금은 손끝으로, 온도는 마음으로.』 …사부님 글씨체야. 진짜, 진짜 사부님 거야." } },
        { type: "say", line: { speaker: "조리 노트", text: "『이 스튜는 그 공방의 장인과 함께 먹던 맛이다. 톱니 소리 울리던 그곳에서, 처음 이 조리법을 배웠다.』" } },
        { type: "say", line: { speakerId: "theo", text: "'공방의 장인'이라니 — 그냥 넘기기엔 걸리는 대목이네요. …기록해 두겠습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "사부님이 여기 살았었구나… 근데 왜 한 번도 얘기 안 해주셨을까. 조리법 자랑은 그렇게 하시더니." } },
        { type: "say", line: { speakerId: "theo", text: "…물어보고 싶은 게 많으시겠죠. 지금은, 우선 이 반복부터 끊어야겠지만요." } },
        { type: "say", line: { speakerId: "arin", text: "돌아가면, 사부에게 직접 묻는다. …지금은 이 아래부터다." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2a T6 — 언덕 보스 「새벽을 삼킨 자」 진입·격파 컷신 =====
    // 제단 지하 최심부(HILL_UNDERCROFT_BOSS_ENTRY 69,-54.25,-189 인근) — 조명
    // 오버라이드(__lightOverride, hill_undercroft: ambient 0.13·lamp 0.48·
    // fog #241a10 near3 far19) 상태에서 카메라 확정(헤드리스 rAF drawImage
    // 캡처 — scratchpad/sp2a-t6-cam-probe.js → sp2a-cs_hill2_boss-1/2.png).
    // 전부 walkable 층(y≈-54.25) 기준 수평 시선(부감 없음). battle 스텝(보스전)
    // 포함 — 승리해야 잔여 연출(전투 여운)이 재생된다(checkedResume 게이트).
    // 유물 회수·phen_hill 소등·여명 전환은 여기 두지 않고 별도 컷신(cs_hill2_relic,
    // 지상 게이트 인근에서 발동)으로 분리했다 — 던전 내부 조명 오버라이드 아래서는
    // "여명이 넘어간다"는 연출 자체가 보이지 않기 때문(§ storyData.ts hill2_relic
    // 트리거 주석 참조).
    cs_hill2_boss: [
        { type: "cam", pos: { x: 62, y: -52, z: -195 }, lookAt: { x: 69, y: -53.5, z: -189 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…기척이 짙어요. 이 안, 여명이 통째로 갇혀 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "따뜻해… 근데 이상해. 아침 냄새인데, 하나도 반갑지가 않아." } },
        { type: "cam", pos: { x: 66, y: -52, z: -190 }, lookAt: { x: 61, y: -54, z: -193 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "새벽을 삼킨 자", text: "…돌려주지 않는다. 이 아침은, 이미 내 것이다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 아침이다. 돌려받겠다 — 무기 들어." } },
        { type: "fx", popup: { text: "🌅 새벽을 삼킨 자가 모습을 드러낸다", color: "#f5a623" } },
        { type: "battle", id: "hill2_boss", templates: ["dawn_devourer"] },
        { type: "say", line: { speakerId: "lotti", text: "…해냈다! 공기가 달라졌어… 이거 진짜 아침 냄새 아니야?" } },
        { type: "say", line: { speakerId: "theo", text: "여명 자체가 여기 갇혀 있었던 모양이에요. …밖으로 나가서 확인해 보죠." } },
        { type: "say", line: { speakerId: "arin", text: "돌아간다. 여기 근원이, 노라의 아침을 붙들고 있었다." } },
        { type: "fx", popup: { text: "…희미하게, 저 위에서 빛이 새어 든다", color: "#f5a623" } },
        { type: "camReset", ms: 1200 },
    ],
    // 여명 전환 — 언덕 존의 「반복되는 하루」가 끝나고 진짜 아침으로 넘어가는 연출.
    // phen_hill 소등 자체가 이 연출의 본체(fog/디렉셔널/파티클이 실측대로 원복)라
    // set 스텝을 맨 앞에 두어 컷신 재생 내내 소등 상태가 유지되게 했다 — 재도전
    // 걱정은 없다(defeated_hill2_boss_0로 게이팅되는 별도 트리거라 승리 전에는
    // 애초에 재생되지 않는다 — 1막 finale·T4 port2_relic과 동일 안전 설계).
    // 카메라는 지상 게이트(8,-24.25,-204) 인근 walkable 앵커 기준 수평 시선
    // (헤드리스 rAF 캡처 — scratchpad/sp2a-t6-cam-probe.js →
    // sp2a-cs_hill2_relic-1/2.png).
    cs_hill2_relic: [
        { type: "set", flags: { phen_hill: false, relic_dawn: true } },
        { type: "cam", pos: { x: 13, y: -21, z: -207 }, lookAt: { x: 4, y: -24, z: -211 }, ms: 1800, hold: 1000 },
        { type: "fx", popup: { text: "🌅 여명이, 마침내 아침으로 넘어간다", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "arin", text: "…시간이 풀렸다. 이 언덕부터." } },
        { type: "say", line: { speakerId: "theo", text: "반복되던 하루가 끝났어요. 이제 내일이, 진짜 내일로 이어집니다." } },
        { type: "cam", pos: { x: 5, y: -19, z: -199 }, lookAt: { x: -3, y: -22, z: -213 }, ms: 1800, hold: 1400 },
        { type: "say", line: { speakerId: "lotti", text: "…이 냄새! 진짜 아침밥 냄새야. 사부님 스튜 생각나네." } },
        { type: "fx", popup: { text: "🌅✨ 여명의 유물 획득 (2/?)", color: "#a78bfa" } },
        { type: "say", line: { speakerId: "theo", text: "'그분'의 흔적이 이 유물에도 짙게 남아 있어요. …차곡차곡 기록해 두죠." } },
        { type: "say", line: { speakerId: "arin", text: "…둘. 노라의 아침을, 두 번째로 되찾았다." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T1 — 서부 대삼림 개막·테오 서사 1장(컷신 2종) =====
    // 카메라는 헤드리스 rAF drawImage 캡처로 실측 확정(scratchpad/sp2b-t1-forest.js →
    // sp2b-cs_forest_arrival-1/2.png·sp2b-cs_theo_camp-1/2.png). 전부 조사 아크 4지점
    // walkable 앵커(scratchpad/sp2b-t1-probe2.js) 인근 기준 수평 시선(부감 없음).
    // [T1 리뷰 수정 — 2026-08] 앵커가 상층/고립 지형으로 확인되어 storyData.ts의 지면
    // 재배치에 맞춰 카메라도 전부 재앵커(scratchpad/sp2b-fix-*.js 육안 재확인 완료).
    cs_forest_arrival: [
        // phen_forest 활성 — 사계 혼재 첫 가동(선점등 규약, 순수 점등이라 선적용 무해)
        { type: "set", flags: { phen_forest: true } },
        { type: "cam", pos: { x: -227, y: -29.5, z: 92 }, lookAt: { x: -222, y: -29.7, z: 97 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "우와… 이 나무는 여름 잎인데, 바로 옆은 단풍이 다 들었어! 심지어 저쪽엔 눈까지 쌓여 있잖아?" } },
        { type: "cam", pos: { x: -226, y: -29, z: 102 }, lookAt: { x: -217, y: -29.7, z: 99 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "🍂🌸 한 걸음마다 계절이 바뀐다", color: "#9fb86a" } },
        { type: "say", line: { speakerId: "theo", text: "한 걸음마다 계절이 바뀌어요. 봄, 여름, 가을, 겨울이 이 숲 안에서 전부 동시에 존재하고 있습니다 — 자연스러운 현상이 아니에요." } },
        { type: "say", line: { speakerId: "arin", text: "…또 시작인가. 항구의 파도, 언덕의 아침, 이번엔 숲의 계절이다." } },
        { type: "say", line: { speakerId: "lotti", text: "이번엔 또 뭐가 이상해진 걸까… 그래도 예쁘긴 진짜 예쁘다. 무서운데 예쁜 건 처음이야." } },
        { type: "say", line: { speakerId: "theo", text: "이 근방에 약초를 캐는 분이 계셨죠. 증언부터 들어보죠 — 숲의 변화를 가장 먼저 알아챘을 겁니다." } },
        { type: "say", line: { speakerId: "arin", text: "간다." } },
        { type: "camReset", ms: 1200 },
    ],
    // 테오 단서 — 스승의 옛 연구 캠프(T2의 cs_arin_letter/T5의 cs_lotti_home 대응: 서사 컷신).
    // 에테르 계측 기구 잔해 + 낡은 노트로 테오의 학자 시절과 스승 실종을 처음 개시한다.
    // frozenData.ts의 "스승이 따로 있다는 뜻이겠죠"(공방 주인 계열 추정)와는 별개의 인물 —
    // 테오 본인의 개인 서사이며, 두 "스승" 스레드를 이 시점에 명시적으로 잇지 않는다(추후
    // 회수 여지만 additive로 남긴다). "그분"·빌런은 직접 명명하지 않는다.
    cs_theo_camp: [
        { type: "cam", pos: { x: -182, y: -3.5, z: -42 }, lookAt: { x: -176, y: -4.2, z: -46 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…이 자리, 어쩐지 낯이 익어요. 아니, 낯익을 리가 없는데—" } },
        // [T1 재캡처 수정] 원안(동측 -171,-50)은 데크 융기 열이 시선을 가렸다(확정 샷 실증
        // — 데크는 서쪽으로 낮아지는 계단형 지붕이라 동측 저각은 근경 융기부가 프레임을 지배,
        // y 상향(+1.1m)으로도 해소 불가). 1번 캠과 같은 서측(내리막) 사면의 남서 대각으로
        // 재앵커 — 파티 전신·데크·동편 수림이 한 프레임에 들어온다.
        { type: "cam", pos: { x: -181, y: -3.0, z: -49 }, lookAt: { x: -176.4, y: -4.5, z: -45.8 }, ms: 1800, hold: 1200 },
        { type: "fx", popup: { text: "🔭 부서진 에테르 계측 기구", color: "#f5c96b" } },
        { type: "say", line: { speakerId: "lotti", text: "이게 다 뭐야? 낯선 기계들이 잔뜩이네… 테오, 너 이런 거 알아?" } },
        { type: "say", line: { speakerId: "theo", text: "에테르 계측 기구예요. 이 조합, 이 배치… 제 스승님 방식 그대로입니다." } },
        { type: "say", line: { speaker: "낡은 노트", text: "『시간의 결이 뒤엉킨 곳마다 에테르가 고인다.』" } },
        { type: "say", line: { speakerId: "theo", text: "…스승님 글씨체예요. 몇 해 전, 아무 말 없이 사라지신 스승님의 노트가 — 왜 하필 이런 곳에." } },
        { type: "say", line: { speakerId: "arin", text: "…스승이라. 네가 그 이름을 먼저 꺼내는 건 드문 일이다." } },
        { type: "say", line: { speakerId: "theo", text: "왕도 학당 시절의 스승님이셨어요. 에테르 연구로는 누구도 따를 자가 없으셨죠 — 그러다 어느 날, 아무 흔적도 없이 사라지셨습니다. 그 뒤로 줄곧, 저 혼자 이유를 찾고 있었어요." } },
        { type: "say", line: { speakerId: "lotti", text: "그렇게 갑자기 사라지셨다니… 혼자 계속 찾아다니느라 힘들었겠다." } },
        { type: "say", line: { speakerId: "arin", text: "…이제는 혼자가 아니다." } },
        { type: "say", line: { speakerId: "theo", text: "…고맙습니다, 두 분 다. 이 노트가 스승님이 여기 계셨다는 첫 단서예요. '시간의 결이 뒤엉킨 곳' — 계절이 뒤섞인 이 숲과 무관하지 않겠죠." } },
        { type: "fx", popup: { text: "📔 스승의 연구 노트를 발견했다", color: "#a78bfa" } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T3 — 대삼림 보스 「계절을 삼킨 자」 진입·격파 + 유물③ 회수 컷신 =====
    // 뿌리 굴 최심부(FOREST_ROOTCAVE_BOSS_ENTRY -170.9,-44.25,-44.8 인근) — 조명
    // 오버라이드(__lightOverride, forest_rootcave: ambient 0.13·lamp 0.5·
    // fog #102819 near3 far19) 상태에서 카메라 확정(헤드리스 rAF drawImage
    // 캡처 — scratchpad/sp2b-t3-cambattle.js → sp2b-cs_forest_boss-1/2.png).
    // 전부 walkable 층(y≈-44.34) 기준 수평 시선(부감 없음, 그리드 실측 —
    // scratchpad/sp2b-t3-bossroom.js). battle 스텝(보스전) 포함 — 승리해야 잔여
    // 연출이 재생된다(checkedResume 게이트). 유물 회수·phen_forest 소등은 여기 두지
    // 않고 별도 컷신(cs_forest_relic, 지상 게이트 인근에서 발동)으로 분리했다 —
    // 던전 내부 조명 오버라이드 아래서는 "사계가 제철로 돌아온다"는 연출 자체가
    // 보이지 않기 때문(§ storyData.ts forest_relic 트리거 주석 참조, hill2_relic
    // 전례 동일 이유).
    cs_forest_boss: [
        { type: "cam", pos: { x: -176, y: -42, z: -45.5 }, lookAt: { x: -171, y: -43.5, z: -44.8 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…기척이 짙어요. 이 안, 사계가 통째로 갇혀 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "이상해… 여름 냄새랑 겨울 냄새가 동시에 나. 코가 어떻게 반응해야 할지 모르겠어." } },
        { type: "cam", pos: { x: -175.5, y: -42, z: -44 }, lookAt: { x: -170.9, y: -43.5, z: -44.8 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "계절을 삼킨 자", text: "…돌려주지 않는다. 이 계절은, 이미 내 것이다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 계절이다. 돌려받겠다 — 무기 들어." } },
        { type: "fx", popup: { text: "🍂 계절을 삼킨 자가 모습을 드러낸다", color: "#9acd32" } },
        { type: "battle", id: "forest_boss", templates: ["season_devourer"] },
        { type: "say", line: { speakerId: "lotti", text: "…해냈다! 공기가 한 갈래로 정리되는 것 같아!" } },
        { type: "say", line: { speakerId: "theo", text: "계절 자체가 여기 갇혀 있었던 모양이에요. …밖으로 나가서 확인해 보죠." } },
        { type: "say", line: { speakerId: "arin", text: "돌아간다. 여기 근원이, 노라의 계절을 붙들고 있었다." } },
        { type: "fx", popup: { text: "…희미하게, 저 위에서 바람이 새어 든다", color: "#9acd32" } },
        { type: "camReset", ms: 1200 },
    ],
    // 사계 원복 — 대삼림의 「계절이 뒤엉킨 숲」이 끝나고 제철 하나로 돌아오는 연출.
    // phen_forest 소등 자체가 이 연출의 본체(fog/디렉셔널/파티클이 실측대로 원복)라
    // set 스텝을 맨 앞에 두어 컷신 재생 내내 소등 상태가 유지되게 했다 — 재도전
    // 걱정은 없다(defeated_forest_boss_0로 게이팅되는 별도 트리거라 승리 전에는
    // 애초에 재생되지 않는다 — hill2_relic·T4 port2_relic과 동일 안전 설계).
    // 카메라 — [최종 리뷰 재리뷰 반영] 트리거가 (-172,-49)로 이동하면서 옛 게이트
    // (-172,-40) 조준 캠 2개가 파티 축외(~40°+)가 되어 재조준. 앵커는 게이트/캠프
    // 데크 인근 walkable 대역 유지, 신규 파티 지점 기준 수평 시선(재캡처
    // scratchpad/sp2b-final5-relic-recap.js → sp2b-cs_forest_relic-1/2.png 육안 확인).
    cs_forest_relic: [
        { type: "set", flags: { phen_forest: false, relic_season: true } },
        // cam1은 파티가 아니라 "제철로 돌아온 숲" 전경이 주제(popup 동반 비스타 컷) —
        // 동측 복원 사면을 정면에 두고 계단 구조물은 좌측 가장자리로 밀었다. 파티 프레이밍은 cam2가 담당.
        { type: "cam", pos: { x: -177, y: -3, z: -44 }, lookAt: { x: -168, y: -6.5, z: -46 }, ms: 1800, hold: 1000 },
        { type: "fx", popup: { text: "🍂 사계가, 마침내 제철로 돌아온다", color: "#9fb86a" } },
        { type: "say", line: { speakerId: "arin", text: "…시간이 풀렸다. 이 숲부터." } },
        { type: "say", line: { speakerId: "theo", text: "뒤엉켰던 계절이 끝났어요. 이제 이 숲도, 제 몫의 계절 하나로 이어집니다." } },
        { type: "cam", pos: { x: -172, y: -2.6, z: -41.5 }, lookAt: { x: -172.3, y: -5.8, z: -49 }, ms: 1800, hold: 1400 },
        { type: "say", line: { speakerId: "lotti", text: "…이 냄새! 이제야 계절 하나가 또렷해. 그래도 아까 그 뒤섞인 풍경, 사실 예쁘긴 했는데." } },
        { type: "fx", popup: { text: "🍂✨ 계절의 유물 획득 (3/?)", color: "#a78bfa" } },
        { type: "say", line: { speakerId: "theo", text: "'그분'의 흔적이 이 유물에도 짙게 남아 있어요. …차곡차곡 기록해 두죠." } },
        { type: "say", line: { speakerId: "arin", text: "…셋. 노라의 계절을, 세 번째로 되찾았다." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T4 — 북부 숲길 「시간이 거꾸로 흐르는 길」 개막(컷신 3종) =====
    // 던전 없는 경량 챕터 — 전 구간 조명 오버라이드 없이(야외) phen_woods 상태에서 카메라
    // 확정(헤드리스 rAF drawImage 캡처 — scratchpad/sp2b-t4-cambattle.js →
    // sp2b-cs_woods_arrival-1/2.png·sp2b-cs_woods_boss-1/2.png·sp2b-cs_woods_relic-1/2/3.png).
    // 전부 체인 6지점 실측 앵커(scratchpad/sp2b-t4-verify1.js) 인근 기준 수평 시선(부감 없음).
    cs_woods_arrival: [
        // phen_woods 활성 — 역류 눈발 첫 가동(선점등 규약, 순수 점등이라 선적용 무해)
        { type: "set", flags: { phen_woods: true } },
        { type: "cam", pos: { x: -144, y: -30.8, z: -176 }, lookAt: { x: -140, y: -31.1, z: -172 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "…추워. 근데 눈이 왜 이렇게 조용히 쌓여 있지? 바람 한 점 없는데." } },
        { type: "cam", pos: { x: -136, y: -30.6, z: -168 }, lookAt: { x: -140, y: -31.0, z: -172 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "❄️👣 발자국이, 파인 게 아니라 메워진다", color: "#7a8fa6" } },
        { type: "say", line: { speakerId: "theo", text: "…발자국이에요. 그런데 방향이 이상해요 — 눈 위에 파여야 할 자국이, 오히려 메워지고 있습니다. 마치 누군가 뒷걸음질로 시간을 되감듯이." } },
        { type: "say", line: { speakerId: "arin", text: "…또인가. 대삼림의 계절에 이어, 이번엔 이 길의 시간이다." } },
        { type: "say", line: { speakerId: "lotti", text: "발자국이 저절로 없어진다니, 꼭 누가 지우개로 지우는 것 같아. 오싹한데… 그래도 가보자!" } },
        { type: "say", line: { speakerId: "theo", text: "이 근방에 사냥꾼 한 분이 계셨죠. 가장 먼저 이 길의 이상을 알아챘을 겁니다 — 증언부터 들어보죠." } },
        { type: "say", line: { speakerId: "arin", text: "간다." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T4 — 숲길 보스 「길을 삼킨 자」 진입·격파 컷신 =====
    // 정점 공터(woods_boss 트리거 근점 -160,-32.25,-300 인근 — 재배치 후 확정치, storyData.ts
    // 체인 헤더 주석 참조) — 야외라 조명 오버라이드 없음(phen_woods 활성 상태 그대로).
    // battle 스텝(보스전) 포함 — 승리해야 잔여 연출(전투 여운)이 재생된다(checkedResume
    // 게이트). giveGold 없음(harness-notes 규약 — battle 컷신 giveGold 금지).
    cs_woods_boss: [
        { type: "cam", pos: { x: -155, y: -31.8, z: -293 }, lookAt: { x: -160, y: -32.25, z: -300 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…기척이 짙어요. 이 앞, 길의 시간이 통째로 거슬러 흐르고 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "발밑이 이상해… 걸을수록 오히려 뒤로 밀리는 기분이야." } },
        { type: "cam", pos: { x: -166, y: -31.6, z: -304 }, lookAt: { x: -160, y: -32.25, z: -300 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "길을 삼킨 자", text: "…돌려주지 않는다. 이 길은, 이미 내 것이다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 길이다. 돌려받겠다 — 무기 들어." } },
        { type: "fx", popup: { text: "🌫 길을 삼킨 자가 모습을 드러낸다", color: "#7a8fa6" } },
        { type: "battle", id: "woods_boss", templates: ["path_devourer"] },
        { type: "say", line: { speakerId: "lotti", text: "…해냈다! 발걸음이 다시 앞으로 나아가는 게 느껴져!" } },
        { type: "say", line: { speakerId: "theo", text: "이 길의 시간 자체가 여기 갇혀 있었던 모양이에요. …밖으로 나가서 확인해 보죠." } },
        { type: "say", line: { speakerId: "arin", text: "돌아간다. 여기 근원이, 노라의 길을 붙들고 있었다." } },
        { type: "fx", popup: { text: "…희미하게, 저 앞쪽 눈발이 걷힌다", color: "#7a8fa6" } },
        { type: "camReset", ms: 1200 },
    ],
    // 길 원복 — 숲길의 「시간이 거꾸로 흐르는 길」이 끝나고 시간이 제 방향으로 흐르는 연출 +
    // 빌런 첫 실루엣(스펙 §③ — 직접 명명 금지, "대사 없이" 조건은 실루엣 프레임 자체에 캐릭터
    // 대사를 얹지 않는 것으로 충족: fx 팝업은 정경 묘사일 뿐 DialogueLine이 아니다. cs_gorge_descent
    // 의 "…저 멀리, 거대한 그림자가 꿈틀거린다" 전례와 동일 기법). phen_woods 소등 자체가
    // 이 연출의 본체라 set 스텝을 맨 앞에 두어 컷신 재생 내내 소등 상태가 유지되게 했다 —
    // 재도전 걱정은 없다(defeated_woods_boss_0로 게이팅되는 별도 트리거라 승리 전에는 애초에
    // 재생되지 않는다 — hill2_relic·forest_relic과 동일 안전 설계). 마지막 cam 스텝은 짧은
    // ms(500)로 "한 프레임" 스침을 표현 — 길 끝(정예 방향 너머, -176,-312) 향한 구도, 노인의
    // 정체는 직접 명명하지 않는다(정체 공개는 SP2c 협곡 몫).
    cs_woods_relic: [
        { type: "set", flags: { phen_woods: false, relic_path: true } },
        { type: "cam", pos: { x: -155, y: -31.5, z: -293 }, lookAt: { x: -160, y: -32.25, z: -300 }, ms: 1800, hold: 1000 },
        { type: "fx", popup: { text: "🌫 되감기던 길이, 마침내 앞으로 흐른다", color: "#7a8fa6" } },
        { type: "say", line: { speakerId: "arin", text: "…시간이 풀렸다. 이 길부터." } },
        { type: "say", line: { speakerId: "theo", text: "거꾸로 걷던 발자국이 끝났어요. 이제 이 길도, 앞으로 걷는 하나의 방향으로 이어집니다." } },
        { type: "cam", pos: { x: -166, y: -31.3, z: -305 }, lookAt: { x: -156, y: -32, z: -292 }, ms: 1800, hold: 1400 },
        { type: "say", line: { speakerId: "lotti", text: "…이 냄새! 눈 냄새가 이제야 맡아져. 아까까진 아예 아무 냄새도 안 났었나 봐." } },
        { type: "fx", popup: { text: "🌫✨ 길의 유물 획득 (4/?)", color: "#a78bfa" } },
        { type: "say", line: { speakerId: "theo", text: "'그분'의 흔적이 이 유물에도 짙게 남아 있어요. …차곡차곡 기록해 두죠." } },
        { type: "say", line: { speakerId: "arin", text: "…넷. 노라의 길을, 네 번째로 되찾았다." } },
        // 빌런 실루엣 1프레임 — 짧은 cam 스텝(플래시) + 정경 묘사 fx(대사 없음) + 테오의 반응.
        // 카메라를 파티 위치(-160,-300)에서 살짝 옆으로 물려(-156,-296) 길 저편(-176,-312)을
        // 향하게 해 파티원 모델에 시야가 가리지 않게 한다(원안은 카메라가 파티 한가운데
        // 있어 프레임 절반이 캐릭터 뒤통수에 가려졌다 — 확정 샷 육안 확인으로 발견·수정).
        { type: "cam", pos: { x: -156, y: -31.6, z: -296 }, lookAt: { x: -176, y: -32.5, z: -312 }, ms: 500, hold: 350 },
        { type: "fx", popup: { text: "…길 끝, 낡은 코트를 두른 뒷모습이 한순간 스친다", color: "#4a5a6b" } },
        { type: "say", line: { speakerId: "theo", text: "…방금, 누가 있었죠?" } },
        { type: "say", line: { speakerId: "arin", text: "…아무도 없다. …헛것을 봤겠지. 가자." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T5 — 북동 수변 개막·테오 서사 2장(컷신 2종) =====
    // 카메라는 헤드리스 rAF drawImage 캡처로 실측 확정(scratchpad/sp2b-t5-cambattle.js →
    // sp2b-cs_water_arrival-1/2.png·sp2b-cs_theo_master-1/2.png). 전부 체인 4지점 실측 앵커
    // (scratchpad/sp2b-t5-verify1.js) 인근 기준 수평 시선(부감 없음). woods_to_water 전언에서
    // 이미 "강태공"이라는 이름이 나왔으므로, 이 컷신에서 그 이름을 곧장 받아 쓴다.
    cs_water_arrival: [
        // phen_water 활성 — 상승 수류 첫 가동(선점등 규약, 순수 점등이라 선적용 무해)
        { type: "set", flags: { phen_water: true } },
        // [카메라 재조정] 원안은 수로를 가로질러 보는 구도라 인접 건물 벽/기둥이 프레임을
        // 지배했다(확정 샷 실증 — scratchpad/sp2b-cs_water_arrival-1/2.png 1차본). 이 수로는
        // 동서로 뻗은 좁은 물길이라(scratchpad/sp2b-t5-grid1.json z~-261.5 라인, x 144~264
        // 구간 y 일정) 수로를 "따라" 보는 구도로 교체 — 동쪽으로 뻗은 물길 자체가 배경이 된다.
        { type: "cam", pos: { x: 128, y: -38.9, z: -262 }, lookAt: { x: 170, y: -39.3, z: -260 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "어? 물줄기가… 아래가 아니라 위로 흘러? 실개천이 하늘로 오르는 것처럼 보여!" } },
        { type: "cam", pos: { x: 146, y: -38.7, z: -257.5 }, lookAt: { x: 138, y: -39.3, z: -263 }, ms: 1800, hold: 1400 },
        { type: "fx", popup: { text: "💧⬆ 수로의 물이, 실개천처럼 하늘로 오른다", color: "#5a7f8f" } },
        { type: "say", line: { speakerId: "theo", text: "…흐름이 반대예요. 이 수로 전체가 중력을 거슬러 위로 흐르고 있습니다 — 자연스러운 현상이 아니에요." } },
        { type: "say", line: { speakerId: "arin", text: "또인가. 숲길의 시간에 이어, 이번엔 이 물줄기다." } },
        { type: "say", line: { speakerId: "lotti", text: "물이 하늘로 오른다니… 신기하긴 한데, 그 강태공 어르신은 낚시도 못 하시겠다. 얼른 찾아뵙자!" } },
        { type: "say", line: { speakerId: "theo", text: "전갈을 보내온 강태공이란 분, 이 근방 어딘가에 계실 거예요. 증언부터 들어보죠." } },
        { type: "say", line: { speakerId: "arin", text: "간다." } },
        { type: "camReset", ms: 1200 },
    ],
    // 테오 단서 2장 — 수문 관리소에 남은 스승의 두 번째 연구 노트(T1의 cs_theo_camp 대응:
    // 서사 컷신). 빌런 스레드와의 교차점("탑을 세운 이") — 직접 명명하지 않는다(스펙 지시).
    // 스승의 행방은 여기서도 해결하지 않는다 — SP2c 이후 과제로 열어 둔다.
    // [최종 리뷰 Minor 수정] 테오의 두 대사가 "지난번 노트보다 앞선 기록"(순서: 이 노트가
    // 더 이전)과 "이 기록이 마지막에 가까울지도"(순서: 이 노트가 더 나중/끝자락)로 서로
    // 엇갈리는 소프트 모순이 있었다 — 앞쪽 대사에서 순서 판단 자체를 보류("아직 가늠이
    // 안 됩니다")하는 쪽으로 정리해, 뒤쪽 대사의 "마지막에 가까울지도"라는 추정(거절 후
    // 종적을 감췄다는 내용 자체에서 나온 별개의 추론)과 부딪히지 않게 했다.
    cs_theo_master: [
        // [카메라 재조정 2차] 1차본(177,-277.8)은 실측 워커블 맵상 벽 클리핑은 없었으나
        // player(176,-276)와의 거리 2.3m가 지나치게 가까워 로티 한 명이 프레임을 가득 채워
        // 아린·테오가 통째로 가려졌다(확정 샷 실증 — 컴패니언 좌표 진단 결과 테오
        // (175.07,-275.07)·로티(174.24,-274.24)가 플레이어 기준 대각선 후방에 늘어서 있음을
        // 확인, scratchpad/sp2b-t5-diag-party.js). 북측 문간 알코브(워커블 확인 지점,
        // 176.5/-280·178.5/-280)까지 물러나 파티 전원과의 거리를 4.9~5.1m로 늘렸다.
        { type: "cam", pos: { x: 176.5, y: -11.6, z: -279.5 }, lookAt: { x: 175.3, y: -12.3, z: -275 }, ms: 1800, hold: 900 },
        { type: "say", line: { speakerId: "lotti", text: "여기, 다 낡았네… 그래도 누가 지내던 흔적은 남아 있는 것 같아." } },
        { type: "cam", pos: { x: 178.5, y: -11.6, z: -279.3 }, lookAt: { x: 175.5, y: -12.3, z: -275.2 }, ms: 1800, hold: 1200 },
        { type: "fx", popup: { text: "📔 관리소에 남겨진 낡은 노트", color: "#f5c96b" } },
        { type: "say", line: { speaker: "낡은 노트", text: "『탑을 세운 이가 찾아왔다. 시간을 되감는 법을 물었다. 나는 거절했고, 그는 슬퍼 보였다.』" } },
        { type: "say", line: { speakerId: "theo", text: "…스승님 필체예요. 다시 뵙는군요, 이런 곳에서. 날짜는 없어서, 지난번 노트와 어느 쪽이 먼저인지는 아직 가늠이 안 됩니다." } },
        { type: "say", line: { speakerId: "arin", text: "'탑을 세운 이'라니. …짚이는 자가 없지 않다." } },
        { type: "say", line: { speakerId: "theo", text: "시간을 되감는 법을 물었고, 스승님은 거절하셨다… 그 뒤로 종적을 감추셨다면 — 이 기록이 마지막에 가까울지도 모르겠어요." } },
        { type: "say", line: { speakerId: "lotti", text: "…그때 무서우셨겠다. 근데 끝까지 알려주지 않으셨다니, 역시 대단하신 분이야." } },
        { type: "say", line: { speakerId: "arin", text: "행방은, 아직 모른다. …하지만 이 노트가 갈 길을 알려줄지도." } },
        { type: "say", line: { speakerId: "theo", text: "기록해 두겠습니다. 스승님의 흔적, 여기서 끝이 아닐 거예요." } },
        { type: "camReset", ms: 1200 },
    ],
    // ===== SP2b T6 — 수변 보스 「흐름을 삼킨 자」 진입·격파 + 유물⑤ 회수 컷신 =====
    // 수문 하부 최심부(WATER_UNDERFLOW_BOSS_ENTRY 108,-44.25,-242 인근) — 조명
    // 오버라이드(__lightOverride, water_underflow: ambient 0.13·lamp 0.5·
    // fog #0f2a33 near3 far19) 상태에서 카메라 확정(헤드리스 rAF drawImage
    // 캡처 — scratchpad/sp2b-t6-cambattle.js → sp2b-cs_water_boss-1/2.png). 전부
    // walkable 층(y≈-44.25) 기준 수평 시선(부감 없음, dungeonData.ts
    // WATER_UNDERFLOW_BOSS_ENTRY 실측 참조). battle 스텝(보스전) 포함 — 승리해야
    // 잔여 연출이 재생된다(checkedResume 게이트). giveGold 없음(harness-notes 규약 —
    // battle 컷신 giveGold 금지). 유물 회수·phen_water 소등은 여기 두지 않고 별도
    // 컷신(cs_water_relic, 지상 게이트 인근에서 발동)으로 분리했다 — 던전 내부 조명
    // 오버라이드 아래서는 "물줄기가 제 길로 돌아온다"는 연출 자체가 보이지 않기
    // 때문(§ storyData.ts water_relic 트리거 주석 참조, forest_relic/hill2_relic
    // 전례 동일 이유).
    cs_water_boss: [
        { type: "cam", pos: { x: 114, y: -42, z: -243 }, lookAt: { x: 108, y: -43.5, z: -242 }, ms: 1600, hold: 900 },
        { type: "say", line: { speakerId: "theo", text: "…기척이 짙어요. 이 안, 역류하는 흐름이 통째로 뭉쳐 있습니다." } },
        { type: "say", line: { speakerId: "lotti", text: "물비린내가 이상해… 아래도 위도 아니고, 사방에서 밀려오는 느낌이야." } },
        { type: "cam", pos: { x: 112, y: -42, z: -238 }, lookAt: { x: 108, y: -43.5, z: -242 }, ms: 1600, hold: 1200 },
        { type: "say", line: { speaker: "흐름을 삼킨 자", text: "…돌려주지 않는다. 이 흐름은, 이미 내 것이다." } },
        { type: "say", line: { speakerId: "arin", text: "노라의 흐름이다. 돌려받겠다 — 무기 들어." } },
        { type: "fx", popup: { text: "🌊 흐름을 삼킨 자가 모습을 드러낸다", color: "#5a7f8f" } },
        { type: "battle", id: "water_boss", templates: ["flow_devourer"] },
        { type: "say", line: { speakerId: "lotti", text: "…해냈다! 물살이 원래 방향으로 돌아가는 게 느껴져!" } },
        { type: "say", line: { speakerId: "theo", text: "이 흐름 자체가 여기 갇혀 있었던 모양이에요. …밖으로 나가서 확인해 보죠." } },
        { type: "say", line: { speakerId: "arin", text: "돌아간다. 여기 근원이, 노라의 흐름을 붙들고 있었다." } },
        { type: "fx", popup: { text: "…희미하게, 저 위에서 물소리가 가라앉는다", color: "#5a7f8f" } },
        { type: "camReset", ms: 1200 },
    ],
    // 물길 원복 — 수변의 「물이 하늘로 흐르는 수로」가 끝나고 물이 제 길로 돌아오는 연출.
    // phen_water 소등 자체가 이 연출의 본체(fog/디렉셔널/파티클이 실측대로 원복)라
    // set 스텝을 맨 앞에 두어 컷신 재생 내내 소등 상태가 유지되게 했다 — 재도전
    // 걱정은 없다(defeated_water_boss_0로 게이팅되는 별도 트리거라 승리 전에는
    // 애초에 재생되지 않는다 — forest_relic·hill2_relic과 동일 안전 설계). 카메라는
    // 지상 게이트(108,-39.36,-236) 인근 walkable 앵커 기준 수평 시선 — 배터리
    // (sp2b-t6-cambattle.js) rAF 확정 샷으로 사후 육안 확인.
    cs_water_relic: [
        { type: "set", flags: { phen_water: false, relic_flow: true } },
        { type: "cam", pos: { x: 113, y: -37.4, z: -239 }, lookAt: { x: 108, y: -39.4, z: -236 }, ms: 1800, hold: 1000 },
        { type: "fx", popup: { text: "💧⬇ 거슬러 오르던 물줄기가, 마침내 제 길로 흐른다", color: "#5a7f8f" } },
        { type: "say", line: { speakerId: "arin", text: "…시간이 풀렸다. 이 수변부터." } },
        { type: "say", line: { speakerId: "theo", text: "하늘로 치솟던 물줄기가 끝났어요. 이제 이 수로도, 아래로 흐르는 하나의 방향으로 이어집니다." } },
        { type: "cam", pos: { x: 103, y: -37.4, z: -233 }, lookAt: { x: 109, y: -39.4, z: -237 }, ms: 1800, hold: 1400 },
        { type: "say", line: { speakerId: "lotti", text: "…이 소리! 물 흐르는 소리가 이제야 제대로 들려. 아까까진 아예 소리가 이상했었나 봐." } },
        { type: "fx", popup: { text: "💧✨ 흐름의 유물 획득 (5/?)", color: "#a78bfa" } },
        { type: "say", line: { speakerId: "theo", text: "'그분'의 흔적이 이 유물에도 짙게 남아 있어요. …차곡차곡 기록해 두죠." } },
        { type: "say", line: { speakerId: "arin", text: "…다섯. 노라의 흐름을, 다섯 번째로 되찾았다." } },
        { type: "camReset", ms: 1200 },
    ],
};
