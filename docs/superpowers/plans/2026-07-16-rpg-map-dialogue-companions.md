# RPG 캐릭터 재정의 + 대사 화자 구분 + 파티 동행 + 지도 시스템 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파티 캐릭터를 오리지널(아린/테오/로티)로 재창조하고, 대사 화자를 초상화·색상·필드 마커로 구분하며, 파티 3인 필드 동행과 미니맵+전체지도(M키, 빠른이동 연동)를 추가한다.

**Architecture:** 캐릭터 메타(`PARTY_META`)를 gameData에 단일 소스로 두고 모든 UI가 참조. 대사는 `speakerId`(파티원) / `speaker`(NPC) 이원화. 동행은 리더 궤적 브레드크럼 팔로우. 지도는 환경 메시를 탑다운 오쏘 카메라로 1회 베이크한 dataURL 이미지를 DOM 오버레이(미니맵/전체지도)에서 공유.

**Tech Stack:** Next.js + React Three Fiber + drei + zustand (기존 스택 그대로, 신규 의존성 없음)

**Spec:** `docs/superpowers/specs/2026-07-16-rpg-map-dialogue-companions-design.md`

## Global Constraints

- 이 저장소는 테스트 러너가 없다. 각 태스크의 검증은 ① `npx tsc --noEmit` 에러 수가 기준선을 넘지 않는지 ② `npm run dev` 실행 후 브라우저 수동 확인(콘솔 전역 `__game`, `__fieldScene` 활용)으로 한다.
- 기준선: 작업 시작 전 `npx tsc --noEmit 2>&1 | grep -c "error TS"` 결과를 기록하고, 각 태스크 후 같은 명령의 결과가 **기준선 이하**여야 한다 (기존 에러 ~42개는 원래 있던 것).
- 코드 스타일: 4칸 들여쓰기, 한국어 주석, 파일 첫 줄에 `// rpg/<경로> — <설명>` 헤더, 클라이언트 컴포넌트는 `"use client"`. UI 문구는 한국어.
- 신규 npm 패키지 설치 금지.
- 커밋 메시지는 기존 컨벤션(`[feat] ...`, `[fix] ...`) + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 트레일러.
- 캐릭터 확정값 — id/이름/색/초상화 (모든 태스크 공통):
  - `arin` / 아린 / `#6EA8FE` / 🗡️ (구 gustave, 모델 `/character/Knight_Golden_Female.fbx`)
  - `theo` / 테오 / `#B58CF6` / 🔮 (구 maelle, 모델 `/character/Wizard.fbx`)
  - `lotti` / 로티 / `#7BD88F` / 🍳 (구 sciel, 모델 `/character/Chef_Hat.fbx`)

---

### Task 1: PARTY_META 단일 소스 + 캐릭터 리네이밍

**Files:**
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (PartyId 타입 추가, DialogueLine은 Task 3에서)
- Modify: `src/app/games/rpg/data/gameData.ts` (PARTY_META 추가, DEFAULT_PARTY id/name 교체)
- Modify: `src/app/games/rpg/field/FieldPlayer.tsx:645-654` (하드코딩 색상 → PARTY_META)
- Modify: `src/app/games/rpg/presenter/useGameStore.ts:60` (mapId "expedition_33" → "nora")

**Interfaces:**
- Consumes: 없음 (기반 태스크)
- Produces:
  - `type PartyId = "arin" | "theo" | "lotti"` (RpgTypes.ts에서 export)
  - `type PartyMeta = { displayName: string; color: string; portrait: string; role: string }`
  - `const PARTY_META: Record<PartyId, PartyMeta>` (gameData.ts에서 export)
  - `DEFAULT_PARTY[n].id`가 `"arin" | "theo" | "lotti"`, `.name`이 `"아린" | "테오" | "로티"`

- [ ] **Step 1: 기준선 기록**

```bash
cd /Users/lim_younghoon/Desktop/개인플젝/norazoo && npx tsc --noEmit 2>&1 | grep -c "error TS"
```

출력된 숫자(기준선)를 기록해 둔다. 이후 모든 태스크에서 이 수 이하 유지.

- [ ] **Step 2: RpgTypes.ts에 PartyId 추가**

`export type Character = {` 선언 바로 위에 추가:

```ts
/** 파티 캐릭터 고정 id — 대사 speakerId/메타 조회 키 */
export type PartyId = "arin" | "theo" | "lotti";
```

- [ ] **Step 3: gameData.ts에 PARTY_META 추가 + DEFAULT_PARTY 교체**

gameData.ts 상단 import에 `PartyId` 추가 (기존 RpgTypes import 구문에 병합):

```ts
import type { Character, Enemy, Skill, PartyId } from "../types/RpgTypes";
```

(실제 기존 import 목록을 확인해 `PartyId`만 추가한다.)

`DEFAULT_PARTY` 선언 바로 위에 추가:

```ts
// ===== 파티 캐릭터 메타 — 표시명/고유색/초상화 단일 소스 (대사 UI·필드 마커·HUD 공용) =====
export type PartyMeta = {
    displayName: string;
    /** 대사 박스 테두리·이름·화자 마커에 쓰는 고유색 */
    color: string;
    portrait: string;
    role: string;
};

export const PARTY_META: Record<PartyId, PartyMeta> = {
    arin: {
        displayName: "아린",
        color: "#6EA8FE",
        portrait: "🗡️",
        role: "왕도 조사대 대장",
    },
    theo: {
        displayName: "테오",
        color: "#B58CF6",
        portrait: "🔮",
        role: "태엽학자 겸 마법사",
    },
    lotti: {
        displayName: "로티",
        color: "#7BD88F",
        portrait: "🍳",
        role: "견습 요리사 출신 검사",
    },
};
```

`DEFAULT_PARTY`의 세 항목에서 다음 필드만 교체 (스탯/스킬/장비/modelUrl/ether는 그대로):

```ts
// 1번째 캐릭터 (구 gustave)
        id: "arin",
        name: "아린",
        // ... 기존 필드 유지, portrait: "🗡️" 유지

// 2번째 캐릭터 (구 maelle)
        id: "theo",
        name: "테오",
        // ... portrait: "🔮" 유지

// 3번째 캐릭터 (구 sciel)
        id: "lotti",
        name: "로티",
        portrait: "🍳",   // ⚔️ → 🍳 교체 (Chef_Hat 모델과 통일)
```

- [ ] **Step 4: FieldPlayer.tsx 색상 하드코딩 제거**

import 추가:

```ts
import { FIELD_ENEMIES, FIELD_TREASURES, PARTY_META } from "../data/gameData";
import type { PartyId } from "../types/RpgTypes";
```

(기존 `import { FIELD_ENEMIES, FIELD_TREASURES } from "../data/gameData";` 줄을 교체)

645~654행의 색상 블록:

```ts
    const activeChar = party[activeCharIndex];
    const color = activeChar
        ? activeChar.name === "Gustave"
            ? "#4A90E2"
            : activeChar.name === "Maëlle"
            ? "#E24A7A"
            : activeChar.name === "Sciel"
            ? "#50C878"
            : "#9B59B6"
        : "#333333";
```

를 다음으로 교체:

```ts
    const activeChar = party[activeCharIndex];
    const color = activeChar
        ? PARTY_META[activeChar.id as PartyId]?.color ?? "#9B59B6"
        : "#333333";
```

- [ ] **Step 5: useGameStore.ts mapId 교체**

```ts
    world: { mapId: "nora", time: 0 },
```

- [ ] **Step 6: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

`npm run dev` → 게임 진입 → 브라우저 콘솔:

```js
__game.getState().player.party.map(c => [c.id, c.name, c.portrait])
// Expected: [["arin","아린","🗡️"],["theo","테오","🔮"],["lotti","로티","🍳"]]
```

전투 진입 시 BattleUI 하단에 "아린" 등 새 이름 표시, 메뉴(I)의 캐릭터 목록도 새 이름 확인.

주의: localStorage에 옛 세이브(슬롯 0 자동저장)가 있으면 로드 시 옛 이름이 살아난다 — Task 2에서 해결하므로 이 태스크에서는 시크릿 창 또는 `localStorage.clear()` 후 확인.

- [ ] **Step 7: Commit**

```bash
git add src/app/games/rpg/types/RpgTypes.ts src/app/games/rpg/data/gameData.ts src/app/games/rpg/field/FieldPlayer.tsx src/app/games/rpg/presenter/useGameStore.ts
git commit -m "[feat] RPG 파티 캐릭터 오리지널 리네이밍 (아린/테오/로티) + PARTY_META 단일 소스

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 세이브 마이그레이션 (구 id → 신 id)

**Files:**
- Modify: `src/app/games/rpg/utils/persist.ts`

**Interfaces:**
- Consumes: `DEFAULT_PARTY` (Task 1의 새 id/name/portrait)
- Produces: `migrateSave(d: SaveData): SaveData` — `load()`/`importFromFile()` 내부에서 자동 적용되므로 호출측 변경 없음

- [ ] **Step 1: persist.ts에 마이그레이션 추가**

파일 상단 import 아래에 추가:

```ts
import { DEFAULT_PARTY } from "../data/gameData";

// 구버전 세이브 캐릭터 id → 신 id (2026-07 오리지널 리네이밍)
const ID_MIGRATION: Record<string, string> = {
    gustave: "arin",
    maelle: "theo",
    sciel: "lotti",
};

/** 구버전 세이브의 파티 정체성(id/이름/초상화/모델)을 새 메타로 갱신 — 스탯·성장·장비는 보존 */
export function migrateSave(d: SaveData): SaveData {
    const party = d.player.party.map((c) => {
        const newId = ID_MIGRATION[c.id] ?? c.id;
        const base = DEFAULT_PARTY.find((b) => b.id === newId);
        if (!base) return c;
        return {
            ...c,
            id: newId,
            name: base.name,
            portrait: base.portrait,
            modelUrl: base.modelUrl,
        };
    });
    return { ...d, player: { ...d.player, party } };
}
```

`load()`의 return을 교체:

```ts
export function load(slot: number): SaveData | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    return migrateSave(JSON.parse(raw) as SaveData);
}
```

`importFromFile()`의 return을 교체:

```ts
export async function importFromFile(file: File): Promise<SaveData> {
    const text = await file.text();
    return migrateSave(JSON.parse(text) as SaveData);
}
```

- [ ] **Step 2: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

브라우저 콘솔에서 구버전 세이브를 위조해 로드 경로 검증:

```js
// 1) 현재 상태를 저장한 뒤 구 id로 되돌려 덮어쓰기
const snap = __game.getState().snapshot();
snap.player.party[0].id = "gustave"; snap.player.party[0].name = "Gustave";
localStorage.setItem("rpg-r3f:slot:1", JSON.stringify(snap));
localStorage.setItem("rpg-r3f:slot:1:ts", JSON.stringify(Date.now()));
```

TAB → 슬롯 1 로드 → 콘솔:

```js
__game.getState().player.party[0]
// Expected: id === "arin", name === "아린", 레벨/경험치는 저장 당시 값 유지
```

- [ ] **Step 3: Commit**

```bash
git add src/app/games/rpg/utils/persist.ts
git commit -m "[feat] 구버전 세이브 캐릭터 id 마이그레이션 (gustave/maelle/sciel → arin/theo/lotti)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 대사 리라이팅 + speakerId + NPC 화자 테이블

**Files:**
- Modify: `src/app/games/rpg/data/storyData.ts` (DialogueLine 타입, 전체 대사, NPC_SPEAKERS, CHAPTER_TITLES)
- Modify: `src/app/games/rpg/field/FieldMerchant.tsx` (요리사 퀘스트 대사 2곳)

**Interfaces:**
- Consumes: `PartyId` (RpgTypes)
- Produces:
  - `type DialogueLine = { text: string; speaker?: string; speakerId?: PartyId }` — 파티원 대사는 `speakerId`만, NPC/사물 대사는 `speaker`(표시명)만 설정
  - `const NPC_SPEAKERS: Record<string, { icon: string }>` (storyData.ts에서 export)

캐릭터 보이스 가이드 (모든 신규 대사 작성 시 적용):
- **아린**: 짧고 단호한 반말. 군인식 보고 톤. 감정 절제. 어미 "~다", "~지", "~군".
- **테오**: 정중한 존댓말 + 수다. 태엽/시간 현상에 지적 흥분. 어미 "~요", "~습니다", 감탄 "흥미롭네요".
- **로티**: 밝은 반말. 막내 에너지, 음식 비유. 요리사 NPC를 "사부님"이라 부름.

- [ ] **Step 1: DialogueLine 타입 교체 + NPC_SPEAKERS 추가**

storyData.ts 8행의 타입을 교체:

```ts
import type { PartyId } from "../types/RpgTypes";

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
};
```

- [ ] **Step 2: STORY_TRIGGERS 대사 전체 교체**

각 트리거의 `dialogue` 배열을 아래 내용으로 통째로 교체한다 (`id`/`near`/`flagsAll`/`nextStage`/`objective`/`target`은 그대로):

`prologue`:

```ts
        dialogue: [
            {
                speakerId: "arin",
                text: "여기가 노라다. 시계탑이 멈춘 밤, 마을 전체와 연락이 끊겼다 — 왕도의 의뢰는 원인 조사와 생존자 구조. 이상.",
            },
            {
                speakerId: "theo",
                text: "공기 중 에테르가 정체되어 있어요. 시간이… 고여 있달까요. 거리의 주민들이 전부 그 자리에 굳어 있습니다. 흥미롭네요 — 아니, 큰일이네요.",
            },
            {
                speakerId: "lotti",
                text: "저기 광장에 불빛이 있어! 누가 깨어 있나 봐. 굳은 사람들도 조사해 보자(E). 뭔가 단서가 나올지도!",
            },
        ],
```

`meet_cook`:

```ts
        dialogue: [
            {
                speaker: "요리사",
                text: "손님이라니! 시계탑이 멈춘 뒤로 처음이군. 난 이 마을의 요리사요.",
            },
            {
                speakerId: "lotti",
                text: "사부님! 저예요, 로티! 왕도에서 검 배우러 떠났던… 설마 절 잊으신 건 아니죠?!",
            },
            {
                speaker: "요리사",
                text: "오오, 로티! 많이 컸구나. …그날 밤, 시계탑의 태엽 조각 셋이 흩어지면서 다들 잠들듯 사라졌단다.",
            },
            {
                speaker: "요리사",
                text: "조각을 모아 시계탑을 다시 돌려주게. 우선 저기 빛나는 상자의 물자부터 챙기고.",
            },
        ],
```

`got_treasure`:

```ts
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
```

`first_blood`:

```ts
        dialogue: [
            {
                speaker: "요리사",
                text: "제법이군! 북쪽 광장엔 오크 무리가 진을 치고 있소.",
            },
            {
                speaker: "요리사",
                text: "놈들을 정리하면 항구로 가는 길이 열릴 거요. 광장에 깃발을 세워뒀으니 쉬어가시게.",
            },
        ],
```

`cleanup_done`:

```ts
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
```

`reach_port`:

```ts
        dialogue: [
            {
                speakerId: "lotti",
                text: "여기가 항구구나… 배들이 시간에 갇힌 채 멈춰 있어. 생선 비린내조차 안 나.",
            },
            {
                speakerId: "arin",
                text: "등대 앞에 뭔가 반짝인다. 태엽 조각이다. …그리고 이건, 등대지기의 일지인가.",
            },
            {
                speakerId: "theo",
                text: "『협곡의 불빛이 밤마다 커진다. 무언가가 태엽을 삼키고 있다…』 — 흥미롭네요. 그리고 몹시 불길합니다.",
            },
        ],
```

- [ ] **Step 3: LORE_POINTS 대사 교체**

각 포인트의 `lines`/`awakeLines`를 교체 (좌표/kind/label/awakeAtStage/awakeReward는 그대로):

`gate_wife`:

```ts
        lines: [
            { speakerId: "lotti", text: "빨래 바구니를 든 채로 굳었어… 옷이 아직 축축해. 멈춘 지 얼마 안 됐단 뜻이야." },
            { speakerId: "arin", text: "몸은 따뜻하다. 죽은 게 아니야 — 잠든 거다. 되돌릴 수 있어." },
        ],
```

`smith`:

```ts
        lines: [
            { speakerId: "theo", text: "망치를 치켜든 채 굳었네요. 모루 위의 검은 반만 접혀 있고요. 정지 단면이 이렇게 깨끗하다니." },
            { speakerId: "arin", text: "시계탑 종이 울리던 그 순간, 마을 전체가 한꺼번에 멈춘 거다." },
        ],
```

`plaza_boy`:

```ts
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
```

`tower_note`:

```ts
        lines: [
            { speaker: "일지", text: "『태엽이 셋으로 갈라져 날아갔다. 하나는 바다로, 하나는 바람의 언덕으로, 하나는… 그 협곡으로.』" },
            { speaker: "일지", text: "『종이 다시 울릴 때까지, 아무도 깨어나지 못하리라.』" },
            { speakerId: "arin", text: "조사 완료다. 태엽 조각 셋 — 그게 우리 임무다." },
        ],
```

`port_fisher`:

```ts
        lines: [
            { speakerId: "lotti", text: "그물을 당기다 굳었어. 그물 속 물고기도… 공중에 멈춰 있어. 아깝다, 싱싱해 보이는데." },
        ],
```

`port_note`: 변경 없음 (`speaker: "쪽지"` 유지).

- [ ] **Step 4: 파일 헤더 주석 + CHAPTER_TITLES 갱신**

storyData.ts 1~6행 주석의 줄거리 설명에서 "탐사대" 유지하되 원정대 표현 정리:

```ts
// rpg/data/storyData.ts — "멈춘 시계탑" 스토리 데이터
// 대사/트리거/체크포인트를 전부 여기서 선언적으로 관리한다 — 시나리오 수정은 이 파일만.
//
// 줄거리: 성채 마을 '노라'의 시계탑이 멈춘 날 주민들이 사라졌다.
// 유일하게 깨어 있는 요리사의 부탁으로, 왕도 조사대(아린·테오·로티)는 흩어진
// 태엽 조각 3개를 찾아 항구 → 바람 언덕 → 어둠의 협곡으로 향한다.
```

CHAPTER_TITLES의 prologue sub 교체:

```ts
    prologue: {
        sub: "왕도 조사대 임무 — 노라 시계탑 조사",
        title: "1장 — 멈춘 마을",
        detail: "시계탑이 멈춘 밤, 마을 전체가 잠들었다",
    },
```

- [ ] **Step 5: FieldMerchant.tsx 퀘스트 대사 교체**

퀘스트 수락 대사 (90~99행 부근):

```ts
                    s.startDialogue([
                        {
                            speaker: "요리사",
                            text: "부탁이 하나 있소. 화덕이 식은 지 오래라… 약초 3개와 슬라임 젤 2개만 구해다 주면 보답하지.",
                        },
                        {
                            speakerId: "lotti",
                            text: "사부님 화덕이 식다니, 큰일이네! 약초는 길가에 반짝이는 걸 채집(E)하면 돼. 젤은 슬라임이 떨구거나 풀숲에서 나와.",
                        },
                    ]);
```

퀘스트 완료 대사 (129~138행 부근):

```ts
                        s.startDialogue([
                            {
                                speaker: "요리사",
                                text: "오오, 재료가 다 모였군! 화덕에 다시 불을 지필 수 있겠어. 자 — 보수요.",
                            },
                            {
                                speakerId: "arin",
                                text: "(회복 물약 2, 마나 물약 1, 120골드를 받았다)",
                            },
                        ]);
```

- [ ] **Step 6: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하. 특히 DialogueUI가 아직 `line.speaker`를 필수로 참조하므로(다음 태스크에서 교체) `speaker?`로 인한 신규 TS 에러가 나면 DialogueUI 36행을 임시로 `{line.speaker ?? ""}`로 바꿔 기준선을 지킨다 (Task 4에서 전면 교체됨).

`localStorage.clear()` 후 새 게임 → 프롤로그 대사가 새 문구("여기가 노라다…")로 나오는지, 요리사 대화에 로티의 "사부님!" 라인이 나오는지 확인.

- [ ] **Step 7: Commit**

```bash
git add src/app/games/rpg/data/storyData.ts src/app/games/rpg/field/FieldMerchant.tsx src/app/games/rpg/ui/DialogueUI.tsx
git commit -m "[feat] 스토리 대사 전면 리라이팅 — 아린/테오/로티 보이스 + speakerId 도입

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: DialogueUI 초상화 + 캐릭터 고유색

**Files:**
- Modify: `src/app/games/rpg/ui/DialogueUI.tsx` (전면 교체)

**Interfaces:**
- Consumes: `PARTY_META` (gameData), `NPC_SPEAKERS` (storyData), `DialogueLine.speakerId`
- Produces: 없음 (말단 UI)

- [ ] **Step 1: DialogueUI.tsx 전면 교체**

```tsx
// rpg/ui/DialogueUI.tsx — 하단 대화 박스 (초상화+고유색, Space/Enter/클릭으로 진행)
"use client";

import { useEffect } from "react";
import { useGame } from "../presenter/useGameStore";
import { PARTY_META } from "../data/gameData";
import { NPC_SPEAKERS } from "../data/storyData";

export function DialogueUI() {
    const dialogue = useGame((s) => s.dialogue);
    const advanceDialogue = useGame((s) => s.advanceDialogue);
    const combat = useGame((s) => s.combat);

    const active = combat.phase === "idle" && dialogue.length > 0;

    useEffect(() => {
        if (!active) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                advanceDialogue();
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [active, advanceDialogue]);

    if (!active) return null;
    const line = dialogue[0];

    // 파티원(speakerId) → 고유색/초상화, NPC(speaker) → 중립 호박색 + 아이콘
    const meta = line.speakerId ? PARTY_META[line.speakerId] : null;
    const displayName = meta?.displayName ?? line.speaker ?? "???";
    const color = meta?.color ?? "#fbbf24";
    const portrait =
        meta?.portrait ?? NPC_SPEAKERS[line.speaker ?? ""]?.icon ?? "💬";

    return (
        <div
            className="absolute inset-x-0 bottom-8 flex justify-center z-30"
            onClick={advanceDialogue}
        >
            <div
                className="w-[42rem] max-w-[90vw] bg-black/85 backdrop-blur rounded-2xl px-5 py-4 cursor-pointer select-none flex items-start gap-4"
                style={{ border: `1px solid ${color}B3` }}
            >
                <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                    style={{
                        background: `linear-gradient(135deg, ${color}40, ${color}0D)`,
                        border: `1px solid ${color}80`,
                    }}
                >
                    {portrait}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold mb-1" style={{ color }}>
                        {displayName}
                        {meta && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                {meta.role}
                            </span>
                        )}
                    </div>
                    <div className="text-white leading-relaxed">
                        {line.text}
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-2 animate-pulse">
                        Space ▸ ({dialogue.length}
                        {dialogue.length > 1 ? " 남음" : ""})
                    </div>
                </div>
            </div>
        </div>
    );
}
```

(Task 3 Step 6에서 임시 패치를 넣었다면 이 교체로 자연히 사라진다.)

- [ ] **Step 2: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

새 게임 프롤로그에서: 아린 대사는 파란 테두리+🗡️, 테오는 보라+🔮, 로티는 초록+🍳, 요리사는 호박색+👨‍🍳 확인. 이름 옆 역할 라벨(파티원만) 확인.

- [ ] **Step 3: Commit**

```bash
git add src/app/games/rpg/ui/DialogueUI.tsx
git commit -m "[feat] 대사 UI 초상화 카드 + 캐릭터 고유색 화자 구분

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: FieldCompanions — 파티 동행

**Files:**
- Create: `src/app/games/rpg/field/FieldCompanions.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)

**Interfaces:**
- Consumes: `scene.userData.__playerWorldPos: THREE.Vector3` (FieldPlayer가 매 프레임 갱신), `ModelAvatar` (url/state/scale props), `player.party`/`player.activeCharacter`
- Produces: `scene.userData.__companionPositions: Record<string, { x: number; y: number; z: number }>` — 키는 캐릭터 id. Task 6의 화자 마커가 소비.

- [ ] **Step 1: FieldCompanions.tsx 생성**

```tsx
// rpg/field/FieldCompanions.tsx — 비활성 파티원 동행 (리더 궤적 브레드크럼 팔로우)
"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

const CRUMB_STEP = 0.35; // 리더가 이만큼 움직일 때마다 궤적 기록
const MAX_CRUMBS = 96;
const FOLLOW_DIST = [1.7, 3.2]; // 동료 1·2가 리더 뒤에서 유지할 궤적 거리
const TELEPORT_SNAP = 12; // 리더와 이 이상 벌어지면 워프 (패스트트래블/전투 복귀)

type Crumb = { x: number; y: number; z: number };

function lerpAngle(a: number, b: number, t: number) {
    const PI2 = Math.PI * 2;
    let d = (b - a) % PI2;
    if (d > Math.PI) d -= PI2;
    else if (d < -Math.PI) d += PI2;
    return a + d * t;
}

/** 궤적의 최신 지점부터 뒤로 dist 만큼 걸어간 위치 (부족하면 가장 오래된 지점) */
function pointBehind(crumbs: Crumb[], leader: Crumb, dist: number): Crumb {
    let remain = dist;
    let cur = leader;
    for (let i = crumbs.length - 1; i >= 0; i--) {
        const c = crumbs[i];
        const seg = Math.hypot(cur.x - c.x, cur.z - c.z);
        if (seg >= remain) {
            const t = seg < 1e-6 ? 0 : remain / seg;
            return {
                x: cur.x + (c.x - cur.x) * t,
                y: cur.y + (c.y - cur.y) * t,
                z: cur.z + (c.z - cur.z) * t,
            };
        }
        remain -= seg;
        cur = c;
    }
    return crumbs[0] ?? leader;
}

function Companion({
    charId,
    modelUrl,
    followDist,
    crumbsRef,
}: {
    charId: string;
    modelUrl: string;
    followDist: number;
    crumbsRef: { current: Crumb[] };
}) {
    const { scene } = useThree();
    const rootRef = useRef<THREE.Group>(null);
    const [animState, setAnimState] = useState<"idle" | "walk" | "run">("idle");
    const placed = useRef(false);
    const renderY = useRef(0);

    useFrame((_, dt) => {
        const leader = scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        const g = rootRef.current;
        if (!leader || !g) return;

        if (!placed.current) {
            g.position.set(leader.x, leader.y, leader.z);
            renderY.current = leader.y;
            placed.current = true;
            return;
        }

        const target = pointBehind(
            crumbsRef.current,
            { x: leader.x, y: leader.y, z: leader.z },
            followDist
        );
        const dx = target.x - g.position.x;
        const dz = target.z - g.position.z;
        const gap = Math.hypot(dx, dz);

        // 리더가 순간이동(패스트트래블/전투 복귀)하면 그대로 워프
        const leaderGap = Math.hypot(
            leader.x - g.position.x,
            leader.z - g.position.z
        );
        if (leaderGap > TELEPORT_SNAP) {
            g.position.set(leader.x, leader.y, leader.z);
            renderY.current = leader.y;
            if (animState !== "idle") setAnimState("idle");
            return;
        }

        // 간격에 비례한 추적 속도 — 멀수록 뛰고 가까우면 정지
        let next: "idle" | "walk" | "run" = "idle";
        if (gap > 0.18) {
            const speed = gap > 2.2 ? 7 : 4;
            next = gap > 2.2 ? "run" : "walk";
            const step = Math.min(gap, speed * Math.min(dt, 1 / 8));
            g.position.x += (dx / gap) * step;
            g.position.z += (dz / gap) * step;
            const targetYaw = Math.atan2(dx, dz);
            g.rotation.y = lerpAngle(
                g.rotation.y,
                targetYaw,
                THREE.MathUtils.clamp(dt * 10, 0, 1)
            );
        }
        if (next !== animState) setAnimState(next);

        // y는 궤적(리더가 실제 밟은 지면)에서 가져와 러프 — 계단 팝핑 방지
        if (Math.abs(target.y - renderY.current) > 1.5) {
            renderY.current = target.y;
        } else {
            renderY.current +=
                (target.y - renderY.current) * Math.min(1, dt * 10);
        }
        g.position.y = renderY.current;

        // 화자 마커 등에서 쓸 위치 공유
        const store = (scene.userData.__companionPositions ??= {}) as Record<
            string,
            { x: number; y: number; z: number }
        >;
        store[charId] = {
            x: g.position.x,
            y: g.position.y,
            z: g.position.z,
        };
    });

    return (
        <group ref={rootRef}>
            <Suspense fallback={null}>
                <ModelAvatar url={modelUrl} state={animState} scale={0.005} />
            </Suspense>
        </group>
    );
}

export function FieldCompanions() {
    const { scene } = useThree();
    const party = useGame((s) => s.player.party);
    const activeIdx = useGame((s) => s.player.activeCharacter);
    const crumbsRef = useRef<Crumb[]>([]);

    // 브레드크럼 기록 (동료 전체가 공유)
    useFrame(() => {
        const leader = scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!leader) return;
        const crumbs = crumbsRef.current;
        const last = crumbs[crumbs.length - 1];
        if (
            !last ||
            Math.hypot(leader.x - last.x, leader.z - last.z) >= CRUMB_STEP
        ) {
            // 순간이동이면 궤적을 리셋해 동료가 옛 경로를 거슬러 가지 않게 한다
            if (last && Math.hypot(leader.x - last.x, leader.z - last.z) > TELEPORT_SNAP) {
                crumbs.length = 0;
            }
            crumbs.push({ x: leader.x, y: leader.y, z: leader.z });
            if (crumbs.length > MAX_CRUMBS) crumbs.shift();
        }
    });

    const companions = party.filter((_, i) => i !== activeIdx);

    return (
        <>
            {companions.map((c, i) => (
                <Companion
                    key={c.id}
                    charId={c.id}
                    modelUrl={c.modelUrl || "/character/BlueSoldier_Female.fbx"}
                    followDist={FOLLOW_DIST[i] ?? 3.2}
                    crumbsRef={crumbsRef}
                />
            ))}
        </>
    );
}
```

- [ ] **Step 2: FieldScene.tsx에 마운트**

import 추가:

```tsx
import { FieldCompanions } from "./FieldCompanions";
```

`<FieldPlayer …/>` 바로 아래에 추가:

```tsx
            <FieldPlayer {...{ onEnemyCollide, onTreasureCollide }} />
            <FieldCompanions />
```

- [ ] **Step 3: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

수동 확인 목록:
1. 필드에 캐릭터 3명(기사·마법사·요리사 모델)이 보인다.
2. 걸으면 동료 2명이 줄지어 따라오고, Shift 달리기 시 뒤처지면 뛰어서 따라온다.
3. 멈추면 동료도 멈추고 idle 애니메이션.
4. 계단/경사(광장→골목)에서 동료가 공중에 뜨거나 파묻히지 않는다.
5. 깃발 활성화 후 패스트 트래블 → 동료가 즉시 리더 옆으로 워프.
6. 콘솔: `__fieldScene.userData.__companionPositions` → 두 캐릭터 id 키에 좌표가 실시간 갱신.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/rpg/field/FieldCompanions.tsx src/app/games/rpg/field/FieldScene.tsx
git commit -m "[feat] 파티 동행 — 비활성 파티원 2명 브레드크럼 팔로우

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: SpeakerHighlight — 말하는 캐릭터 머리 위 마커

**Files:**
- Create: `src/app/games/rpg/field/SpeakerHighlight.tsx`
- Modify: `src/app/games/rpg/field/FieldMerchant.tsx` (위치 공유 1줄)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)

**Interfaces:**
- Consumes: `dialogue[0].speakerId`/`speaker`, `scene.userData.__playerWorldPos`, `scene.userData.__companionPositions` (Task 5), `scene.userData.__merchantPos` (이 태스크에서 추가), `PARTY_META`
- Produces: 없음 (말단 연출)

- [ ] **Step 1: FieldMerchant 위치 공유**

FieldMerchant.tsx의 지면 스냅 성공 분기(`if (found) { … }`) 안에 한 줄 추가:

```ts
                if (found) {
                    groupRef.current.position.set(found.x, found.y, found.z);
                    // 화자 마커(SpeakerHighlight)가 요리사 위치를 찾을 수 있게 공유
                    state.scene.userData.__merchantPos = groupRef.current.position;
                }
```

- [ ] **Step 2: SpeakerHighlight.tsx 생성**

```tsx
// rpg/field/SpeakerHighlight.tsx — 대사 중 말하는 캐릭터 머리 위 고유색 마커
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { PARTY_META } from "../data/gameData";

const HEAD_Y = 2.3; // 캐릭터 머리 위 오프셋

export function SpeakerHighlight() {
    const { scene } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const coneRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        const g = groupRef.current;
        if (!g) return;
        const s = useGame.getState();
        const line = s.dialogue[0];
        if (!line || s.combat.phase !== "idle") {
            g.visible = false;
            return;
        }

        // 화자 → 필드 위치 해석: 리더 / 동료 / 요리사(상인). 그 외(일지 등)는 마커 없음
        let pos: { x: number; y: number; z: number } | undefined;
        let color = "#fbbf24";
        if (line.speakerId) {
            const leader = s.player.party[s.player.activeCharacter];
            if (leader?.id === line.speakerId) {
                pos = scene.userData.__playerWorldPos as THREE.Vector3;
            } else {
                pos = (
                    scene.userData.__companionPositions as
                        | Record<string, { x: number; y: number; z: number }>
                        | undefined
                )?.[line.speakerId];
            }
            color = PARTY_META[line.speakerId].color;
        } else if (line.speaker === "요리사") {
            pos = scene.userData.__merchantPos as THREE.Vector3;
        }

        if (!pos) {
            g.visible = false;
            return;
        }
        g.visible = true;
        const bob = 0.15 * Math.sin(performance.now() / 250);
        g.position.set(pos.x, pos.y + HEAD_Y + bob, pos.z);
        if (coneRef.current) {
            (coneRef.current.material as THREE.MeshBasicMaterial).color.set(
                color
            );
        }
    });

    return (
        <group ref={groupRef} visible={false}>
            {/* 아래를 향한 ▼ 마커 */}
            <mesh ref={coneRef} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.22, 0.4, 4]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
        </group>
    );
}
```

- [ ] **Step 3: FieldScene.tsx에 마운트**

import 추가 후 `<FieldCompanions />` 아래에 추가:

```tsx
import { SpeakerHighlight } from "./SpeakerHighlight";
...
            <FieldCompanions />
            <SpeakerHighlight />
```

- [ ] **Step 4: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

수동 확인: `localStorage.clear()` 후 새 게임 →
1. 프롤로그 대사에서 아린 라인일 때 리더(활성 캐릭터) 머리 위 파란 ▼, 테오 라인에서 마법사 동료 위 보라 ▼, 로티 라인에서 요리사 모자 동료 위 초록 ▼.
2. 요리사와 대화 시 상인 NPC 머리 위 호박색 ▼.
3. 일지/쪽지 조사(E) 대사에서는 마커가 나타나지 않음.
4. 대사 종료 시 마커 즉시 사라짐.

- [ ] **Step 5: Commit**

```bash
git add src/app/games/rpg/field/SpeakerHighlight.tsx src/app/games/rpg/field/FieldMerchant.tsx src/app/games/rpg/field/FieldScene.tsx
git commit -m "[feat] 대사 화자 필드 하이라이트 — 말하는 캐릭터 머리 위 고유색 마커

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 지도 베이크 — mapStore + MapBaker

**Files:**
- Create: `src/app/games/rpg/presenter/mapStore.ts`
- Create: `src/app/games/rpg/field/MapBaker.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)

**Interfaces:**
- Consumes: `scene.userData.__environmentMeshes: THREE.Object3D[]` (EnvironmentModel이 설정), 메시 `userData.__type === "environment"` 태그
- Produces:
  - `useMapStore` zustand 스토어: `{ mapUrl: string | null; bounds: MapBounds | null; setMap(url, bounds) }`
  - `type MapBounds = { minX: number; maxX: number; minZ: number; maxZ: number }`
  - `worldToUV(x: number, z: number, b: MapBounds): { u: number; v: number }` — u는 서→동(0→1), v는 북→남(0→1). 베이크 이미지는 **위가 북(-Z)**.

- [ ] **Step 1: mapStore.ts 생성**

```ts
// rpg/presenter/mapStore.ts — 베이크된 지도 이미지/월드 경계 (세이브와 무관한 런타임 상태)
"use client";

import { create } from "zustand";

export type MapBounds = {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};

type MapState = {
    mapUrl: string | null;
    bounds: MapBounds | null;
    setMap: (mapUrl: string, bounds: MapBounds) => void;
};

export const useMapStore = create<MapState>((set) => ({
    mapUrl: null,
    bounds: null,
    setMap: (mapUrl, bounds) => set({ mapUrl, bounds }),
}));

/** 월드 (x,z) → 지도 이미지 UV. 이미지는 위가 북(-Z), 왼쪽이 서(-X). */
export function worldToUV(x: number, z: number, b: MapBounds) {
    return {
        u: (x - b.minX) / (b.maxX - b.minX),
        v: (z - b.minZ) / (b.maxZ - b.minZ),
    };
}
```

- [ ] **Step 2: MapBaker.tsx 생성**

```tsx
// rpg/field/MapBaker.tsx — 환경을 탑다운 오쏘 카메라로 1회 촬영해 지도 이미지 생성
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMapStore } from "../presenter/mapStore";

const TEX_W = 2048;
const WARMUP_FRAMES = 60; // 환경 텍스처/재질 로딩 대기

export function MapBaker() {
    const { gl, scene } = useThree();
    const done = useRef(false);
    const frame = useRef(0);

    useFrame(() => {
        if (done.current) return;
        frame.current++;
        if (frame.current < WARMUP_FRAMES) return;
        const envMeshes = scene.userData.__environmentMeshes as
            | THREE.Object3D[]
            | undefined;
        if (!envMeshes?.length) return;
        done.current = true;

        // 1) 환경 전체의 월드 바운즈 (센터링·회전 적용 후 실제 좌표)
        const box = new THREE.Box3();
        for (const m of envMeshes) box.expandByObject(m);
        const minX = box.min.x,
            maxX = box.max.x,
            minZ = box.min.z,
            maxZ = box.max.z;
        const width = maxX - minX;
        const depth = maxZ - minZ;
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        // 월드 비율 유지 — 정사각 텍스처로 늘어나는 왜곡 방지
        const texH = Math.max(256, Math.round((TEX_W * depth) / width));

        // 2) 탑다운 오쏘 카메라 — 화면 위 = 북(-Z), 오른쪽 = 동(+X)
        const cam = new THREE.OrthographicCamera(
            -width / 2,
            width / 2,
            depth / 2,
            -depth / 2,
            0.1,
            box.max.y - box.min.y + 60
        );
        cam.position.set(cx, box.max.y + 30, cz);
        cam.up.set(0, 0, -1);
        cam.lookAt(cx, 0, cz);
        cam.updateMatrixWorld();

        // 3) 환경 외 오브젝트 숨김 — 메시를 갖되 환경 태그 메시가 없는 최상위 그룹
        //    (라이트·카메라는 메시가 없어 유지 → 조명 그대로 촬영)
        const hidden: THREE.Object3D[] = [];
        for (const child of scene.children) {
            let hasMesh = false;
            let hasEnv = false;
            child.traverse((o: unknown) => {
                const obj = o as THREE.Mesh & {
                    userData: { __type?: string };
                };
                if ((obj as THREE.Mesh).isMesh) {
                    hasMesh = true;
                    if (obj.userData.__type === "environment") hasEnv = true;
                }
            });
            if (hasMesh && !hasEnv && child.visible) {
                child.visible = false;
                hidden.push(child);
            }
        }

        // 4) 렌더타겟 1회 렌더 → 픽셀 읽기 → 캔버스(dataURL)
        const rt = new THREE.WebGLRenderTarget(TEX_W, texH);
        const prevRT = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        gl.render(scene, cam);
        const pixels = new Uint8Array(TEX_W * texH * 4);
        gl.readRenderTargetPixels(rt, 0, 0, TEX_W, texH, pixels);
        gl.setRenderTarget(prevRT);
        rt.dispose();
        for (const o of hidden) o.visible = true;

        const canvas = document.createElement("canvas");
        canvas.width = TEX_W;
        canvas.height = texH;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(TEX_W, texH);
        // GL 픽셀은 아래→위 순서 → 행 반전. RT는 리니어 색공간 → sRGB 감마 보정.
        for (let y = 0; y < texH; y++) {
            const src = (texH - 1 - y) * TEX_W * 4;
            const dst = y * TEX_W * 4;
            for (let i = 0; i < TEX_W * 4; i += 4) {
                img.data[dst + i] = Math.round(
                    255 * Math.pow(pixels[src + i] / 255, 1 / 2.2)
                );
                img.data[dst + i + 1] = Math.round(
                    255 * Math.pow(pixels[src + i + 1] / 255, 1 / 2.2)
                );
                img.data[dst + i + 2] = Math.round(
                    255 * Math.pow(pixels[src + i + 2] / 255, 1 / 2.2)
                );
                img.data[dst + i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        useMapStore.getState().setMap(url, { minX, maxX, minZ, maxZ });
        // 디버깅용 — 콘솔에서 window.open(__mapUrl)로 베이크 결과 확인
        (window as unknown as { __mapUrl?: string }).__mapUrl = url;
        console.log(
            `[MapBaker] 지도 베이크 완료 ${TEX_W}x${texH} X:[${minX.toFixed(
                1
            )}, ${maxX.toFixed(1)}] Z:[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`
        );
    });

    return null;
}
```

- [ ] **Step 3: FieldScene.tsx에 마운트**

import 추가 후 `<SpeakerHighlight />` 아래에 추가:

```tsx
import { MapBaker } from "./MapBaker";
...
            <SpeakerHighlight />
            <MapBaker />
```

- [ ] **Step 4: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

수동 확인 (게임 실행 후 ~1초 뒤 콘솔):
1. `[MapBaker] 지도 베이크 완료 …` 로그와 X/Z 범위가 EnvironmentModel의 world box 로그와 일치.
2. 콘솔에서 `window.open(__mapUrl)` → 새 탭에 탑다운 지형 이미지. 마을(중앙 부근)·항구(오른쪽)·언덕(위쪽) 배치 확인. 새까맣게 나오면 WARMUP_FRAMES를 120으로 올려 재확인.
3. 베이크된 이미지에 플레이어/적/깃발/빛기둥이 찍혀 있지 않아야 한다 (환경만).
4. 베이크 후 필드 화면에 플레이어/적/깃발이 모두 정상 표시(숨김 복원 확인), 프레임 드랍이 지속되지 않음.

- [ ] **Step 5: Commit**

```bash
git add src/app/games/rpg/presenter/mapStore.ts src/app/games/rpg/field/MapBaker.tsx src/app/games/rpg/field/FieldScene.tsx
git commit -m "[feat] 지도 시스템 기반 — 환경 탑다운 1회 베이크(mapStore/MapBaker)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: MiniMap HUD

**Files:**
- Create: `src/app/games/rpg/ui/MiniMap.tsx`
- Modify: `src/app/games/rpg/container/RpgGame.tsx` (마운트 + 표시 조건)

**Interfaces:**
- Consumes: `useMapStore`(mapUrl/bounds), `window.__fieldScene.userData.__playerWorldPos`/`__camForward` (폴백: `useGame` player.pos), `STORY_FLAGS`, `MERCHANT_POS`, `story.target`, `flags`
- Produces: 없음 (말단 UI)

- [ ] **Step 1: MiniMap.tsx 생성**

```tsx
// rpg/ui/MiniMap.tsx — 우상단 원형 미니맵 (북쪽 고정, 플레이어 중심)
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { useMapStore } from "../presenter/mapStore";
import { STORY_FLAGS } from "../data/storyData";
import { MERCHANT_POS } from "../data/gameData";

const SIZE = 160; // px
const METERS_ACROSS = 64; // 미니맵 지름이 커버하는 월드 거리(m)
const S = SIZE / METERS_ACROSS; // px per meter

type View = { px: number; pz: number; headingDeg: number };

export function MiniMap() {
    const mapUrl = useMapStore((s) => s.mapUrl);
    const bounds = useMapStore((s) => s.bounds);
    const target = useGame((s) => s.story.target);
    const flags = useGame((s) => s.flags);
    const [view, setView] = useState<View | null>(null);

    useEffect(() => {
        const id = setInterval(() => {
            const sc = (
                window as unknown as { __fieldScene?: THREE.Scene }
            ).__fieldScene;
            const p =
                (sc?.userData.__playerWorldPos as THREE.Vector3 | undefined) ??
                useGame.getState().player.pos;
            const fwd = sc?.userData.__camForward as
                | THREE.Vector3
                | undefined;
            const headingDeg = fwd
                ? (Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI
                : 0;
            setView({ px: p.x, pz: p.z, headingDeg });
        }, 120);
        return () => clearInterval(id);
    }, []);

    if (!mapUrl || !bounds || !view) return null;
    const { px, pz, headingDeg } = view;
    const imgW = (bounds.maxX - bounds.minX) * S;
    const imgH = (bounds.maxZ - bounds.minZ) * S;
    const left = SIZE / 2 - (px - bounds.minX) * S;
    const top = SIZE / 2 - (pz - bounds.minZ) * S;

    const markers: Array<{ x: number; z: number; icon: string }> = [];
    if (target) markers.push({ x: target.x, z: target.z, icon: "◆" });
    for (const f of STORY_FLAGS) {
        if (flags[`flag_${f.id}`]) markers.push({ x: f.x, z: f.z, icon: "🚩" });
    }
    markers.push({ x: MERCHANT_POS.x, z: MERCHANT_POS.z, icon: "💰" });

    return (
        <div
            className="pointer-events-none absolute top-4 right-4 rounded-full overflow-hidden border-2 border-amber-400/60 bg-black/70 shadow-lg"
            style={{ width: SIZE, height: SIZE }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={mapUrl}
                alt=""
                className="absolute max-w-none opacity-90"
                style={{ width: imgW, height: imgH, left, top }}
            />
            {markers.map((m, i) => {
                const dx = (m.x - px) * S;
                const dz = (m.z - pz) * S;
                if (Math.hypot(dx, dz) > SIZE / 2 - 12) return null;
                return (
                    <div
                        key={i}
                        className="absolute text-[11px] leading-none"
                        style={{
                            left: SIZE / 2 + dx - 6,
                            top: SIZE / 2 + dz - 6,
                            color: m.icon === "◆" ? "#7dd3fc" : undefined,
                        }}
                    >
                        {m.icon}
                    </div>
                );
            })}
            {/* 플레이어 — 시선 방향 화살표 */}
            <div
                className="absolute text-sky-300 leading-none"
                style={{
                    left: SIZE / 2 - 7,
                    top: SIZE / 2 - 8,
                    fontSize: 14,
                    transform: `rotate(${headingDeg}deg)`,
                }}
            >
                ▲
            </div>
            <div className="absolute top-1 inset-x-0 text-center text-[9px] text-amber-300/80">
                N
            </div>
        </div>
    );
}
```

- [ ] **Step 2: RpgGame.tsx 마운트**

import 추가:

```tsx
import { MiniMap } from "../ui/MiniMap";
```

구독 추가 (기존 `const objective = …` 아래):

```tsx
    const dialogueLen = useGame((s) => s.dialogue.length);
    const ui = useGame((s) => s.ui);
```

`{combat.phase === "idle" && <DialogueUI />}` 위에 추가:

```tsx
            {/* 미니맵 — 대화/메뉴 중에는 숨김 */}
            {combat.phase === "idle" &&
                dialogueLen === 0 &&
                !ui.pauseOpen &&
                !ui.inventoryOpen &&
                !ui.shopOpen &&
                !ui.fastTravelOpen && <MiniMap />}
```

- [ ] **Step 3: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

수동 확인:
1. 우상단 원형 미니맵에 실제 지형 이미지가 보이고, 이동하면 지도가 반대로 흘러 플레이어(▲)가 항상 중앙.
2. 마을 광장에서: 상인 💰 마커가 실제 방향과 일치(광장 불빛 쪽). 목표 ◆가 목표 비콘 방향과 일치.
3. 카메라를 돌리면 ▲ 화살표가 회전(북쪽 고정 확인 — 지도는 안 돌고 화살표만).
4. 대화 시작/메뉴(ESC·I) 오픈 시 미니맵 숨김.
5. 동쪽으로 218m 걸어 항구 도달 시 깃발 활성화 후 🚩 마커 표시.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/rpg/ui/MiniMap.tsx src/app/games/rpg/container/RpgGame.tsx
git commit -m "[feat] 원형 미니맵 HUD — 플레이어 중심·북쪽 고정·목표/깃발/상인 마커

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 전체지도 (M키) + 깃발 클릭 빠른이동 + 최종 검증

**Files:**
- Modify: `src/app/games/rpg/presenter/slices/uiSlice.ts` (mapOpen)
- Create: `src/app/games/rpg/menu/FullMapPanel.tsx`
- Modify: `src/app/games/rpg/container/RpgGame.tsx` (M키 + 마운트 + ESC 처리 + 도움말 문구)

**Interfaces:**
- Consumes: `useMapStore`/`worldToUV`, `STORY_FLAGS`, `LORE_POINTS`, `MERCHANT_POS`, `requestTeleport(p: Vec3)`, `closeAll()`, `flags`, `story.target`, `player.pos`
- Produces: `ui.mapOpen: boolean`, `toggleMap(): void` (uiSlice)

- [ ] **Step 1: uiSlice에 mapOpen 추가**

state와 closeAll의 ui 객체 두 곳 모두에 `mapOpen: false` 추가, toggleMap 액션 추가:

```ts
    ui: {
        pauseOpen: false,
        inventoryOpen: false,
        shopOpen: false,
        fastTravelOpen: false,
        mapOpen: false,
    },
```

`openFastTravel` 아래에 추가:

```ts
    // ===== 전체지도 (M키) =====
    toggleMap: () =>
        set((s: any) => ({ ui: { ...s.ui, mapOpen: !s.ui.mapOpen } })),
```

`closeAll`의 ui 객체에도 `mapOpen: false` 추가.

- [ ] **Step 2: FullMapPanel.tsx 생성**

```tsx
// rpg/menu/FullMapPanel.tsx — M키 전체지도 (활성 깃발 클릭: 빠른이동)
"use client";

import { useGame } from "../presenter/useGameStore";
import { useMapStore, worldToUV } from "../presenter/mapStore";
import { STORY_FLAGS, LORE_POINTS } from "../data/storyData";
import { MERCHANT_POS } from "../data/gameData";

export function FullMapPanel() {
    const open = useGame((s) => (s.ui as any).mapOpen);
    const closeAll = useGame((s) => s.closeAll);
    const requestTeleport = useGame((s) => (s as any).requestTeleport);
    const flags = useGame((s) => s.flags);
    const target = useGame((s) => s.story.target);
    const playerPos = useGame((s) => s.player.pos);
    const mapUrl = useMapStore((s) => s.mapUrl);
    const bounds = useMapStore((s) => s.bounds);

    if (!open) return null;

    if (!mapUrl || !bounds) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="rounded-2xl border border-yellow-500/70 bg-black/90 px-8 py-6 text-yellow-100">
                    지도를 그리는 중… 잠시 후 다시 열어줘 (M)
                </div>
            </div>
        );
    }

    const pct = (x: number, z: number) => {
        const { u, v } = worldToUV(x, z, bounds);
        return { left: `${u * 100}%`, top: `${v * 100}%` };
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-yellow-500/70 bg-black/90 p-4">
                <div className="mb-2 text-center text-xs tracking-[0.35em] text-yellow-300">
                    WORLD MAP — 노라
                </div>
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={mapUrl}
                        alt="노라 전체지도"
                        className="rounded-xl border border-white/10"
                        style={{ maxWidth: "80vw", maxHeight: "70vh" }}
                    />
                    {/* 조사 포인트 — 조사 완료는 흐리게 */}
                    {LORE_POINTS.map((lp) => (
                        <div
                            key={lp.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 text-[11px] ${
                                flags[`lore_${lp.id}`] ? "opacity-30" : ""
                            }`}
                            style={pct(lp.x, lp.z)}
                            title={lp.label}
                        >
                            {lp.kind === "note" ? "📜" : "🗿"}
                        </div>
                    ))}
                    {/* 상인 */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-sm"
                        style={pct(MERCHANT_POS.x, MERCHANT_POS.z)}
                        title="요리사(상점)"
                    >
                        💰
                    </div>
                    {/* 깃발 — 활성화된 것만 클릭 가능 */}
                    {STORY_FLAGS.map((f) => {
                        const active = !!flags[`flag_${f.id}`];
                        return (
                            <button
                                key={f.id}
                                disabled={!active}
                                onClick={() => {
                                    requestTeleport({
                                        x: f.x,
                                        y: f.y ?? -33.2,
                                        z: f.z + 1.4, // 깃대와 겹치지 않게 (FastTravelPanel과 동일)
                                    });
                                    closeAll();
                                }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-sm ${
                                    active
                                        ? "cursor-pointer transition-transform hover:scale-125"
                                        : "opacity-40 grayscale"
                                }`}
                                style={pct(f.x, f.z)}
                                title={
                                    active
                                        ? `${f.label} — 클릭: 빠른이동`
                                        : `${f.label} (미활성)`
                                }
                            >
                                🚩
                                <span className="ml-0.5 text-[10px] text-yellow-200">
                                    {f.label}
                                </span>
                            </button>
                        );
                    })}
                    {/* 목표 */}
                    {target && (
                        <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse text-lg text-sky-300"
                            style={pct(target.x, target.z)}
                            title="현재 목표"
                        >
                            ◆
                        </div>
                    )}
                    {/* 플레이어 */}
                    <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-lg text-sky-300"
                        style={pct(playerPos.x, playerPos.z)}
                        title="현재 위치"
                    >
                        ▲
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                        ▲ 현재 위치 · ◆ 목표 · 🚩 깃발(클릭: 빠른이동) · 💰 상인
                        · 📜/🗿 조사 포인트
                    </span>
                    <span>M / ESC: 닫기</span>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: RpgGame.tsx — M키 + 마운트 + ESC + 도움말**

import 추가:

```tsx
import { FullMapPanel } from "../menu/FullMapPanel";
```

키 핸들러의 ESC 분기 조건에 mapOpen 추가:

```tsx
                if (key === "escape") {
                    // 상점/패스트트래블/지도가 열려 있으면 ESC는 그것만 닫는다
                    const ui = useGame.getState().ui as any;
                    if (ui.shopOpen || ui.fastTravelOpen || ui.mapOpen) {
                        closeAll();
                        return;
                    }
                    togglePause();
                }
```

`else if (key === "tab")` 분기 앞에 M키 분기 추가:

```tsx
                else if (key === "m") {
                    if (useGame.getState().dialogue.length > 0) return;
                    document.exitPointerLock?.();
                    (useGame.getState() as any).toggleMap();
                }
```

`{combat.phase === "idle" && <FastTravelPanel />}` 아래에 마운트:

```tsx
            {combat.phase === "idle" && <FullMapPanel />}
```

우하단 도움말 문구 교체:

```tsx
                    <div className="text-xs text-gray-400 text-center">
                        ESC: Menu | I: Inventory | M: Map | TAB: Save/Load
                    </div>
```

Task 8에서 넣은 미니맵 표시 조건에도 `!ui.mapOpen`을 추가 (ui 객체에 필드가 생겼으므로):

```tsx
            {combat.phase === "idle" &&
                dialogueLen === 0 &&
                !ui.pauseOpen &&
                !ui.inventoryOpen &&
                !ui.shopOpen &&
                !ui.fastTravelOpen &&
                !ui.mapOpen && <MiniMap />}
```

- [ ] **Step 4: 타입 체크 + 수동 검증**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

수동 확인:
1. M키 → 전체지도 오버레이. 지형 이미지 위에 ▲(내 위치)가 실제 위치와 일치 — 시작 지점(마을 어귀 동쪽)이면 지도 중앙보다 동쪽.
2. 마커 위치 검증: 광장 깃발(11.2,-10.4)·항구 깃발(218.6,-14.7)·언덕 깃발(0,-210)이 각각 지도 좌중앙/동쪽 끝/북쪽 끝에 위치. 📜/🗿 마커가 마을·항구에 분포.
3. 미활성 깃발은 회색·클릭 불가. 광장 깃발 활성화(E) 후 지도에서 항구 깃발은 여전히 회색, 광장 깃발 클릭 → 광장으로 순간이동 + 지도 닫힘 + 동료 워프.
4. M/ESC로 닫힘. 지도 열린 동안 미니맵 숨김.
5. 대화 중 M키 무시.

- [ ] **Step 5: 최종 회귀 체크 (전체 플로우)**

`localStorage.clear()` 후 새 게임에서 한 번에 통과 확인:
1. 프롤로그 → 요리사 → 보물 → 슬라임 전투 → 오크 소탕까지 스토리 진행 (새 대사, 화자 마커, 초상화 정상).
2. 전투 진입/복귀 시 동료 재배치 정상, 전투 UI에 새 이름.
3. 인벤토리에서 장비 장착(스탯 재계산) 정상 — 리네이밍이 장비 시스템을 깨지 않음.
4. TAB 저장 → 새로고침 → 로드 정상.
5. 최종 타입 체크:

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 기준선 이하.

- [ ] **Step 6: Commit**

```bash
git add src/app/games/rpg/presenter/slices/uiSlice.ts src/app/games/rpg/menu/FullMapPanel.tsx src/app/games/rpg/container/RpgGame.tsx
git commit -m "[feat] 전체지도(M키) — 탑다운 베이크 지도 + 깃발 클릭 빠른이동

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
