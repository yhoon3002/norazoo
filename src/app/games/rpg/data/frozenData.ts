// rpg/data/frozenData.ts — 굳은 주민 조사 이벤트 데이터 (SP1 §①)
// 시계탑이 멈춘 밤 그 자리에 굳어버린 주민들. FrozenVillager 컴포넌트가 렌더.
// 에필로그(시계탑 복구) 전: paused+FROZEN_TINT 정지 인형 → E로 frozen 대사·1회 보상.
// 에필로그 후: 틴트 해제·idle 재생 → E로 awake 감사 대사 1줄(플래그·보상 없음).
// T2: 설계 문서(2026-07-28-rpg2-sp1-act1-design.md §①) 카탈로그 20명 전체로 f_test 교체.
// 좌표는 전부 헤드리스 __navFindWalkable 실측(드리프트 ≤1.2m) + ts-node 배치 감사
// (gameData·storyData·bondData·questData·dungeonData·placementData 전 스팟 대비
// 상호작용점 3.5m+·로머/적 캠프 8m+·주민 상호 3.5m+ 위반 0) 통과 좌표 — task-2-report.md 참조.
// 첫 줄은 화자 없는 정경 묘사(speaker: "…") — 브리프 지정 표기. 이어 파티 반응 1~2줄
// (화자 로테이션: 로티 감성/요리 비유 · 테오 분석/존댓말 · 아린 절제/군인체).
// 복선 4인(f_toymaker·f_apprentice·f_clockhand·f_runaway)은 "그분"/"장인"/"태엽" 어휘를
// 포함하되 태엽장인을 직접 명명하지 않는다(2막 정체 공개 전 힌트만).

import type { DialogueLine } from "./storyData";

export type FrozenVillagerDef = {
    id: string;
    pos: { x: number; y: number; z: number };
    model: string; // "/character/*.fbx" 기존 15종 중
    rotationY?: number;
    /** 굳은 상태 조사 대사 (2~3줄) */
    frozen: DialogueLine[];
    /** 에필로그 후 각성 대사 (1줄) */
    awake: DialogueLine[];
    reward?: { gold?: number; items?: Array<{ id: string; qty: number }> };
    /**
     * SP2a §④ awake2 규약 — 이 스테이지(stageAtLeast 기준) 도달 시 awake 대신
     * awake2를 표시한다(둘 다 지정돼야 적용 — E 반복 가능·플래그/보상 없음, awake와
     * 동일 계약). 2막 존별 각성 주민(f_porter·f_sailor 등)이 스테이지가 깊어질수록
     * 증언 대사를 갈아 끼우는 데 쓴다. T1은 타입만 추가 — 실제 데이터는 T2/T5.
     */
    awake2From?: string;
    awake2?: DialogueLine[];
};

/** 시간에 갇힌 청회색 — SP0 틴트 시스템(ModelAvatar tint) 재사용 */
export const FROZEN_TINT = "#8fa8b8";

export const FROZEN_VILLAGERS: FrozenVillagerDef[] = [
    // ===== 마을 (8) =====
    {
        id: "f_baker",
        pos: { x: 2, y: -33.25, z: -30 },
        model: "/character/Chef_Hat.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "화덕 앞에 웅크린 채 굳어 있다. 반죽을 넣으려던 손이 허공에 멈췄고, 화덕 안쪽은 이미 싸늘하다." },
            { speakerId: "lotti", text: "이 반죽… 아직 부풀고 있었을 텐데. 아침 냄새가 나는 것 같아서 괜히 코끝이 찡해." },
            // 원래는 "발효는 멈추지 않았을 겁니다"로 단정했으나, f_florist(부패도 멈춘다는 단정)와
            // 정면으로 모순됐다 — 확답 대신 정지가 고르지 않다는 관찰 톤으로 완화(SP1 최종 리뷰 I-3).
            { speakerId: "theo", text: "…정지가 고르진 않은 모양이에요. 몸은 굳었는데 반죽은 그새 부풀어 있었으니까요 — 원리는 아직 잘 모르겠네요." },
        ],
        awake: [
            { speaker: "빵집 주인", text: "이런! 반죽이 다 부풀었잖아! …고맙소, 이 은혜는 갓 구운 빵으로 갚으리다!" },
        ],
        reward: { gold: 30 },
    },
    {
        id: "f_kids2",
        pos: { x: 33, y: -33.25, z: -13 },
        model: "/character/Cowboy_Hair.fbx",
        rotationY: Math.atan2(32, 11), // 도망친 친구를 쫓듯 고개를 돌린 방향(길 건너편)
        frozen: [
            { speaker: "…", text: "골목 어귀, 술래와 도망자가 나란히 굳어 있다. 술래는 아직도 눈을 가린 채 열을 세는 자세다." },
            { speakerId: "arin", text: "술래잡기 도중인가. …다치지 않았으니 다행이다." },
        ],
        awake: [
            { speaker: "아이들", text: "…열, 다 셌다! 어라, 얘 어디 갔지? 우리 계속 놀아도 돼요?" },
        ],
    },
    {
        id: "f_florist",
        pos: { x: 6, y: -33.25, z: 18 },
        model: "/character/Elf.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "꽃다발을 품에 안은 채 굳어 있다. 다른 것은 다 멈췄는데, 꽃잎만은 하나도 시들지 않았다." },
            { speakerId: "theo", text: "흥미롭네요 — 시간이 멈추면 부패도 멈춥니다. 저주인 동시에, 어떤 의미로는 축복이군요." },
            { speakerId: "lotti", text: "꽃은 안 시드는데 사람은 못 움직이다니… 어느 쪽이 더 슬픈 건지 모르겠어." },
        ],
        awake: [
            { speaker: "꽃장수", text: "어머, 꽃이 그대로네! …당신들 덕분에 이 아이도 다시 웃을 수 있겠어요." },
        ],
    },
    {
        id: "f_smith_helper",
        pos: { x: 38, y: -33.25, z: -25 },
        model: "/character/VikingHelmet.fbx",
        rotationY: Math.atan2(8.5, -1.5), // 대장간(46.5,-26.5) 쪽 — 말 찾으러 두리번거리던 방향
        frozen: [
            { speaker: "…", text: "편자를 주문하러 온 마부가 대장간 앞에 굳어 있다. 내려놓은 짐꾸러미 사이로 낡은 편자가 삐죽 나와 있다." },
            { speakerId: "lotti", text: "말도 기다리다 지쳤나 봐. 주인 찾으러 어디 갔을까." },
            { speakerId: "theo", text: "주문서를 쥔 손가락까지 그대로예요. 그 밤이 덮치기 직전까지, 그저 평범한 하루였다는 뜻이죠." },
        ],
        awake: [
            { speaker: "마부", text: "어라, 내 말이…! 고맙습니다, 덕분에 살 것 같아요. 이 밤에 정말로 이상했어요, 다들 그 자리에서 굳어서…" },
        ],
    },
    {
        id: "f_lovers",
        pos: { x: 65, y: -33.25, z: -2 },
        model: "/character/Knight_Golden_Female.fbx",
        rotationY: Math.atan2(-52.2, -12), // 광장(12.8,-14) 쪽 — 마을 소리에 돌아본 방향
        frozen: [
            { speaker: "…", text: "손을 맞잡으려던 두 사람이 반걸음 거리를 둔 채 굳어 있다. 마지막 한마디가 입술에 걸려 있다." },
            { speakerId: "lotti", text: "고백하려던 순간 굳어버린 거야…? 너무해, 이건 꼭 되돌려놔야 해!" },
            { speakerId: "theo", text: "말은 못 했어도 마음은 멈추지 않았을 겁니다. …이런 건 이론으로 설명이 안 되네요." },
        ],
        awake: [
            { speaker: "연인들", text: "…그러니까 내가 하려던 말은— 잠깐, 방금 몇 년이 지난 거죠?!" },
        ],
    },
    {
        id: "f_grandma",
        pos: { x: 8, y: -33.25, z: -38 },
        model: "/character/Witch.fbx",
        rotationY: Math.atan2(4.8, 24), // 광장(12.8,-14) 창밖 방향 — 뜨개질하며 지켜보던 쪽
        frozen: [
            { speaker: "…", text: "뜨개바늘을 쥔 손이 굳어 있다. 실타래만 바람이 불 때마다 조금씩 풀렸다 감겼다 한다." },
            { speakerId: "arin", text: "실이 바람에 흔들리는군. …완전한 정지는 아니라는 뜻이다." },
        ],
        awake: [
            { speaker: "할머니", text: "아이고, 손이 시리구나… 뭘 뜨고 있었더라? 자네들부터 좀 앉아서 쉬시게." },
        ],
        reward: { gold: 25 },
    },
    {
        id: "f_watchman",
        pos: { x: 10, y: -33.25, z: 18 },
        model: "/character/BlueSoldier_Female.fbx",
        rotationY: Math.atan2(14.5, -35), // 시계탑(24.5,-17) 방향 — 손가락으로 가리키던 쪽
        frozen: [
            { speaker: "…", text: "성문 앞에서 시계탑을 향해 손가락을 뻗은 채 굳어 있다. 눈에는 놀란 빛이 그대로 남아 있다." },
            { speakerId: "arin", text: "탑을 가리키고 있다. 마지막으로 본 게 저것이었나." },
            { speakerId: "theo", text: "순서가 중요해요 — 종이 울리기 전, 탑이 먼저 멈췄다는 뜻일 수 있습니다. 원인이 저 위에 있어요." },
        ],
        awake: [
            { speaker: "파수병", text: "탑이! 탑이 다시 돌아간다! …제가 얼마나 저러고 서 있었던 겁니까?" },
        ],
    },
    {
        id: "f_diary_girl",
        pos: { x: 20, y: -33.25, z: -45 },
        model: "/character/Viking_Female.fbx",
        rotationY: Math.atan2(-4.5, -28), // 시계탑(24.5,-17) 반대 — 겁에 질려 돌아앉은 방향
        frozen: [
            { speaker: "…", text: "무릎 위에 일기장을 펼친 채 굳어 있다. 마지막 문장이 잉크도 마르지 못하고 멈춰 있다." },
            { speakerId: "lotti", text: "『오늘 밤, 시계탑에서 이상한 소리가—』…여기서 끊겼어. 무서웠겠다." },
        ],
        awake: [
            { speaker: "소녀", text: "맞다, 일기 쓰다 말았지! …이 뒷부분은 나중에 제가 마저 쓸게요. 고마워요!" },
        ],
        reward: { items: [{ id: "herb", qty: 2 }] },
    },
    // ===== 항구 (4) =====
    {
        id: "f_porter",
        pos: { x: 230, y: -38.25, z: -30 },
        model: "/character/Goblin_Male.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "짐 상자를 짊어진 채 굳어 있다. 발밑 파도마저 거품인 채로 멈춰 있다." },
            { speakerId: "lotti", text: "파도 소리가 하나도 없어… 항구 전체가 그 밤 통째로 갇혀버린 것 같아." },
        ],
        awake: [
            { speaker: "짐꾼", text: "어이쿠, 무거워라! …근데 방금 파도 소리가 다시 들리지 않았소?" },
        ],
        // SP2a T2 — 항구 재발 증언(2막 act2_port부터). 1막 awake의 마지막 질문
        // ("파도 소리가 다시 들리지 않았소?")에 대한 답으로 자연스럽게 이어진다.
        awake2From: "act2_port",
        awake2: [
            { speaker: "짐꾼", text: "파도가 또… 그날 밤이 돌아온 것 같소. 아까 그렇게 출렁이더니, 순식간에 다시 얼어붙어 버렸다니까." },
            { speaker: "짐꾼", text: "부두 끝자락에 못 보던 소용돌이가 생겼소 — 물빛부터 심상치 않더군. 조심들 하시게." },
        ],
    },
    {
        id: "f_fisher_old",
        pos: { x: 200, y: -29.25, z: -18 },
        model: "/character/Elf.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "낚싯대를 쥔 채 굳어 있다. 줄 끝의 물고기 한 마리가 허공에 매달려 있다." },
            { speakerId: "arin", text: "물고기도 함께 멈췄다. …기이하지만, 놈도 피해자다." },
        ],
        awake: [
            { speaker: "늙은 어부", text: "물고기가 아직 매달려 있다니! 오늘 저녁은 매운탕이다, 다들 와서 드시게!" },
        ],
        reward: { gold: 20 },
    },
    {
        id: "f_sailor",
        pos: { x: 233, y: -39.25, z: -8 },
        model: "/character/VikingHelmet.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "뱃머리에서 밧줄을 당기던 자세로 굳어 있다. 돛은 바람을 반쯤 머금은 채 펄럭임을 멈췄다." },
            { speakerId: "arin", text: "출항 직전이었군. 이 배도 그 밤 이후로 한 발짝도 나아가지 못했겠지." },
            { speakerId: "theo", text: "돛의 모양을 보면 그 순간 바람 세기까지 알 수 있어요. …멈춘 시간도 기록이 되는군요." },
        ],
        awake: [
            { speaker: "선원", text: "밧줄이 당겨진다! 자, 이제야 출항이다 — 다들 고맙소, 정말!" },
        ],
        // SP2a T2 — 항구 재발 증언(2막 act2_port부터). 1막 awake에서 겨우 출항하려던
        // 참이었는데 그마저 재발로 다시 멎었다는 연결.
        awake2From: "act2_port",
        awake2: [
            { speaker: "선원", text: "돛을 올리자마자 이 꼴이오! 밧줄이 손에서 그대로 얼어붙었으니, 원." },
            { speaker: "선원", text: "바다 쪽 소용돌이 봤소? 배를 그리로 못 내겠더군 — 저건 그냥 물살이 아니오." },
            { speaker: "선원", text: "그대들이 한 번 해결해 줬으니, 이번에도 기대해 보겠소." },
        ],
    },
    {
        id: "f_lightkeeper_cat",
        pos: { x: 221, y: -38.25, z: -11 },
        model: "/character/Pug.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "등대 계단 아래, 작은 고양이가 웅크린 채 굳어 있다. 등대지기가 내려오길 기다리던 자세 그대로다." },
            { speakerId: "lotti", text: "이 아이도 굳어버렸구나… 주인 기다리다가. 배고프겠다, 조금만 기다려." },
        ],
        awake: [
            { speaker: "고양이", text: "…냐옹! (등대지기 아저씨는 어디 갔지? 배고파요!)" },
        ],
    },
    // ===== 바람 언덕 (3) =====
    {
        id: "f_shepherd",
        pos: { x: 22, y: -31.32, z: -235 },
        model: "/character/Cow.fbx",
        rotationY: Math.atan2(-22, 25), // 제단(0,-210) 방향 — 양떼를 몰고 오르던 쪽
        frozen: [
            { speaker: "…", text: "양떼와 함께 언덕 비탈에 굳어 있다. 지팡이는 쓰러졌고, 풀만 발목 높이까지 자라 있다." },
            // "사람만" 골라 멈췄다던 원래 단정은 f_lightkeeper_cat(고양이)·이 양떼처럼
            // 짐승도 굳는 실측과 어긋났다 — 대상을 '숨 쉬는 것들'로 넓혀 정합(SP1 최종 리뷰 I-3).
            { speakerId: "theo", text: "식물은 멈추지 않았어요. 시간이 완전히 정지한 게 아니라, '숨 쉬는 것들만' 골라 멈춘 겁니다." },
            { speakerId: "arin", text: "표적이 있었다는 뜻이군. …단순한 재해가 아니다." },
        ],
        awake: [
            { speaker: "양치기", text: "어라, 풀이 이렇게 자랐나! 얘들아, 다들 무사하구나 — 다행이다!" },
        ],
        // SP2a T5 — 언덕 재발 증언(2막 act2_hill부터). 1막 awake의 안도("다들 무사하구나")가
        // 재발로 다시 불안으로 뒤집힌다는 연결.
        awake2From: "act2_hill",
        awake2: [
            { speaker: "양치기", text: "…이상하지, 어제 기억이 나질 않아. 분명 눈을 뜨면 어제와 똑같은 아침이야." },
            { speaker: "양치기", text: "양들도 매번 같은 자리에서 풀을 뜯어. 하루가 아니라, 몇 번째인지도 모르겠구먼." },
        ],
    },
    {
        id: "f_pilgrim",
        pos: { x: 2, y: -21.25, z: -165 },
        model: "/character/Ninja_Female.fbx",
        rotationY: Math.atan2(-2, -45), // 제단(0,-210) 방향 — 기어오르던 쪽
        frozen: [
            { speaker: "…", text: "제단으로 이어진 비탈을 기어오르다 굳어 있다. 손톱 밑에 흙이 그대로 박혀 있다." },
            { speakerId: "arin", text: "여기까지 기어 올라왔다. 뭔가에 쫓기고 있었나." },
            { speakerId: "theo", text: "표정에 경외와 공포가 함께 있어요. 제단 위에 뭔가 있었다는 뜻이겠죠." },
        ],
        awake: [
            { speaker: "순례자", text: "제가 봤어요, 그 수호자를! …아직도 저 위에 있나요? 부디 조심하세요." },
        ],
    },
    {
        id: "f_hermit",
        pos: { x: -32, y: -22.25, z: -192 },
        model: "/character/Wizard.fbx",
        rotationY: Math.atan2(34, 27), // 순례자 오솔길(2,-165) 쪽 — 손님을 기다리던 방향
        frozen: [
            { speaker: "…", text: "찻주전자를 기울인 채 굳어 있다. 따르던 찻물 한 줄기가 공중에 그대로 얼어붙어 있다." },
            { speakerId: "lotti", text: "차가 아직 안 떨어졌어! 이거 무슨 마법 같은 거야?" },
        ],
        awake: [
            { speaker: "은둔자", text: "…아, 차가 식어버렸군. 뭐, 다시 끓이면 그만이지. 앉아서 한잔 하고 가려나?" },
        ],
        reward: { items: [{ id: "herb", qty: 2 }] },
        // SP2a T5 — 언덕 재발 증언(2막 act2_hill부터). 1막 awake에서 "다시 끓이면 그만"이라던
        // 여유가, 재발로는 끓지도 식지도 않는 이상 현상으로 뒤집힌다는 연결.
        awake2From: "act2_hill",
        awake2: [
            { speaker: "은둔자", text: "…이거 보게, 찻물이 매일 아침 같은 온도야. 식지도, 더 끓지도 않아. 이상한 일이지." },
            { speaker: "은둔자", text: "제단 너머 목장 쪽에서 뭔가 시작된 것 같은데… 나이 든 몸으로 가보긴 무리일세." },
        ],
    },
    // ===== 어둠의 협곡 (2) =====
    {
        id: "f_prospector",
        pos: { x: 145, y: -42.25, z: 25 },
        model: "/character/Cowboy_Hair.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "곡괭이를 치켜든 채 굳어 있다. 발치에 낯선 톱니 부스러기가 흩어져 있다." },
            { speakerId: "theo", text: "이건… 태엽 파편이에요. 광석이 아니라 톱니 조각이 여기 떨어져 있다니, 흥미롭네요." },
            { speakerId: "arin", text: "채굴하다 뭔가와 마주쳤다는 뜻이군. 안쪽을 경계하며 간다." },
        ],
        awake: [
            { speaker: "광부", text: "이 부스러기들, 결국 그놈 짓이었군! …당신들 덕에 명줄 하나 건졌소." },
        ],
        reward: { items: [{ id: "iron_ore", qty: 2 }] },
    },
    {
        id: "f_runaway",
        pos: { x: 230, y: -44, z: 80 },
        model: "/character/Zombie_Female.fbx",
        rotationY: Math.atan2(90.5, 62.5), // 협곡 입구(139.5,17.5) 반대 — 계속 달아나던 방향
        frozen: [
            { speaker: "…", text: "달아나던 자세 그대로 굳어 있다. 얼굴에는 지워지지 않은 공포가 남아 있다." },
            { speakerId: "lotti", text: "표정이… 너무 무서워하고 있어. 대체 뭘 본 거야?" },
            { speakerId: "theo", text: "동공이 열려 있어요. 극심한 공포 반응이죠 — 이 사람, '그분'이라 불리는 무언가를 정면으로 마주친 겁니다." },
        ],
        awake: [
            { speaker: "도망자", text: "그, 그분이… 아직도 이 협곡에 있나요? 제발, 저 안쪽으론 가지 마세요!" },
        ],
    },
    // ===== 공방 / 시계탑 (3) =====
    {
        id: "f_toymaker",
        pos: { x: 64, y: -33.25, z: -18 },
        model: "/character/Goblin_Male.fbx",
        rotationY: Math.atan2(-1, 7), // 문 두드리는 소리(f_apprentice 63,-11) 쪽으로 고개 돌린 방향
        frozen: [
            { speaker: "…", text: "태엽 장난감을 감던 손이 굳어 있다. 장난감 병정만 홀로 태엽 소리를 내며 돌고 있다." },
            { speakerId: "theo", text: "손은 멈췄는데 장난감은 계속 돌아가요. 이 정교함은 보통 장인의 솜씨가 아니에요 — 스승이 따로 있다는 뜻이겠죠." },
            { speakerId: "lotti", text: "이 공방 아저씨, 그분한테 태엽 만드는 법을 배웠다고 했었는데… 설마 그분이랑 관련 있는 걸까?" },
        ],
        awake: [
            { speaker: "공방 주인", text: "이 녀석, 아직도 돌고 있었나! …다행이야. 태엽은, 멈추면 안 되는 거거든." },
        ],
    },
    {
        id: "f_apprentice",
        pos: { x: 63, y: -33.25, z: -11 },
        model: "/character/Zombie_Male.fbx",
        rotationY: Math.atan2(1, -7), // 공방 문(f_toymaker 64,-18) 방향 — 두드리려던 쪽
        frozen: [
            { speaker: "…", text: "공방 문을 두드리려던 자세로 굳어 있다. \"스승님!\"이라 외치던 입 모양이 그대로 남아 있다." },
            { speakerId: "arin", text: "스승이 이상해졌다고 외치는 중이었군. …공방 안쪽부터 조사한다." },
            { speakerId: "theo", text: "장인이 변했다는 증언이에요. 그분이 다녀간 뒤였을 가능성이 있습니다 — 태엽 하나로는 설명 안 되는 변화죠." },
        ],
        awake: [
            { speaker: "견습생", text: "스승님이 이상해졌었어요, 그때! …지금은, 지금은 괜찮으신 걸까요?" },
        ],
    },
    {
        id: "f_clockhand",
        pos: { x: 18, y: -30.25, z: 0 },
        model: "/character/Knight_Golden_Female.fbx",
        rotationY: Math.PI,
        frozen: [
            { speaker: "…", text: "시계탑 옆 계단참, 태엽 구멍을 들여다보던 자세로 굳어 있다. 안쪽에서 낯선 톱니바퀴 소리가 희미하게 새어 나온다." },
            { speakerId: "theo", text: "이 구멍, 관리용치고는 너무 깊어요. 흡사 어느 장인이 지하 전체를 하나의 태엽 장치로 이어놓은 것 같습니다." },
            { speakerId: "arin", text: "관리인이 여기서 뭘 봤는지도 모르겠군. …이 아래, 언젠가 직접 확인해야겠다." },
        ],
        awake: [
            { speaker: "탑지기", text: "그 구멍 안에서 뭔가 봤는데… 아니, 지금은 됐네. 탑이 도는 게 먼저지." },
        ],
    },
];
