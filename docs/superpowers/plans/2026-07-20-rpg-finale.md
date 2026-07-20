# RPG 종장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스토리 완결(ch4 수호전 → 사공/배 → 어둠의 협곡 → 최종 보스 → 엔딩·포스트게임) + 몬스터 8종 추가·무리 다양화(총 31무리) + 존 정복 보상(8존).

**Architecture:** 협곡은 8번째 존(gorge)으로 placementData/zoneContent에 편입 — 기존 전개 루프·리스폰·지도·정복 시스템이 자동 적용. 스토리 전투는 StoryTrigger에 `battle` 필드를 추가해 "대사 종료 → 전투 진입" 파이프라인(pendingStoryBattle)으로 처리, 승리 판정은 기존 defeated_ 플래그 재사용. 보스는 `ENEMY_TEMPLATES.scale`로 대형 렌더.

**Spec:** `docs/superpowers/specs/2026-07-20-rpg-finale-design.md`

## Global Constraints

- 검증 = `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ **28** (현재 27). 테스트 러너 없음, dev 서버 금지(런타임 검증은 컨트롤러 헤드리스).
- 스타일: 4칸 들여쓰기, 한국어 주석, `"use client"`, 태스크별 명시 파일만 `git add`, 커밋 트레일러 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 오버레이/가드/이동잠금/미니맵/StoryTriggers 통합은 **smithOpen·bountyOpen과 동일 패턴**을 그대로 따른다(신규 플래그 추가 시 6개 지점 전부).
- 대사 규약: 파티원 `speakerId`(arin/theo/lotti)만, NPC/보스 `speaker`만. 브리프의 대사 텍스트는 최종 카피 — verbatim.
- 아래 좌표는 전부 도달 마스크 검증 완료 — 손으로 수정 금지.

---

### Task 1: gorge 존 데이터 + 신규 몬스터 8종 + 무리 다양화

**Files:**
- Modify: `src/app/games/rpg/data/placementData.ts` (ZoneId+gorge, ZONE_DEFS, GEN_* 각 Record에 gorge, GEN_FLAGS, 본토 배회 증설, GORGE_LANDING/GORGE_BOSS_ARENA export)
- Modify: `src/app/games/rpg/data/zoneContent.ts` (gorge 엔트리 + 전 존 roamerPacks 확대)
- Modify: `src/app/games/rpg/data/gameData.ts` (dark_crystal 가격, 신규 템플릿 8종+scale 필드, ATTACK_PROFILES, MODEL_BY_TEMPLATE)
- Modify: `src/app/games/rpg/menu/MenuUI.tsx` (dark_crystal), `src/app/games/rpg/actors/ModelAvatar.tsx` (Cow/Pug preload)
- Modify: `src/app/games/rpg/battle/EnemyMesh.tsx` + `src/app/games/rpg/field/FieldEnemyAvatar.tsx` (템플릿 scale 반영)
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (Enemy에 `scale?: number`)

**Interfaces:**
- Produces: `ZoneId`에 `"gorge"`, `GORGE_LANDING = { x: 139.5, y: -42.25, z: 17.5 }`, `GORGE_BOSS_ARENA = { x: 268.5, y: -43.25, z: 42.5 }`, 템플릿 id 8종(ghoul/mad_bull/wild_dog/orc_chief/frost_witch/clockwork_soldier/shade_beast/gear_devourer)

- [ ] **Step 1: placementData.ts 확장**

`ZoneId` 유니온에 `| "gorge"`, `ZONE_DEFS`에 `{ id: "gorge", label: "어둠의 협곡", cx: 200, cz: 110 }` 추가. 각 `GEN_*` Record에 gorge 키 추가:

```ts
// GEN_GATHER.gorge
[
    { x: 136.5, y: -42.25, z: 1.5 }, { x: 214.5, y: -45.25, z: 92.5 },
    { x: 142.5, y: -42.25, z: 152.5 }, { x: 136.5, y: -42.25, z: 36.5 },
    { x: 190.5, y: -44.25, z: 102.5 }, { x: 289.5, y: -53.25, z: 161.5 },
    { x: 287.5, y: -47.25, z: 51.5 }, { x: 281.5, y: -46.25, z: 112.5 },
]
// GEN_ROAMERS.gorge
[
    { x: 162.5, y: -43.25, z: 192.5 }, { x: 237.5, y: -51.25, z: 148.5 },
    { x: 247.5, y: -42.25, z: 187.5 }, { x: 190.5, y: -48.25, z: 145.5 },
    { x: 121.5, y: -43.25, z: 184.5 },
]
// GEN_TREASURES.gorge
[
    { x: 184.5, y: -42.25, z: 26.5 }, { x: 287.5, y: -42.25, z: 10.5 }, { x: 136.5, y: -42.25, z: 106.5 },
]
// GEN_POIS.gorge (제단 최고점)
[{ x: 141.5, y: -25.25, z: 73.5 }]
```

`GEN_FLAGS`에 `{ zone: "gorge", x: 139.5, y: -42.25, z: 17.5 },` (상륙지). 본토 배회 증설 — `GEN_ROAMERS` 기존 존에 append:

```ts
// town +2
{ x: 8.5, y: -31.25, z: -18.5 }, { x: 35.5, y: -33.25, z: -33.5 },
// port +2
{ x: 150.5, y: -33.25, z: -74.5 }, { x: 170.5, y: -36.25, z: -18.5 },
// west_forest +2
{ x: -183.5, y: -29.25, z: -105.5 }, { x: -213.5, y: -29.25, z: -120.5 },
// ne_water +2
{ x: 151.5, y: -47.25, z: -164.5 }, { x: 273.5, y: -47.25, z: -275.5 },
// south_coast +2
{ x: -204.5, y: -31.25, z: 291.5 }, { x: -21.5, y: -33.25, z: 277.5 },
```

파일 끝에 export 추가:

```ts
/** 협곡 상륙지(사공 배 도착 지점)·최종 보스 공터 — 스토리 시스템 소비 */
export const GORGE_LANDING: Spot = { x: 139.5, y: -42.25, z: 17.5 };
export const GORGE_BOSS_ARENA: Spot = { x: 268.5, y: -43.25, z: 42.5 };
```

- [ ] **Step 2: 신규 몬스터 8종 (gameData.ts)**

`Enemy` 타입(RpgTypes)에 `scale?: number` 추가. `ENEMY_MODEL_BY_TEMPLATE`:

```ts
    ghoul: "/character/Zombie_Female.fbx",
    mad_bull: "/character/Cow.fbx",
    wild_dog: "/character/Pug.fbx",
    orc_chief: "/character/Goblin_Male.fbx",
    frost_witch: "/character/Witch.fbx",
    clockwork_soldier: "/character/Goblin_Male.fbx",
    shade_beast: "/character/Zombie_Male.fbx",
    gear_devourer: "/character/Witch.fbx",
```

`ENEMY_TEMPLATES` — 기존 필드 구조 그대로, 값:

| id | name | lv | hp | atk | def | spd | exp/gold | drops(chance) | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| ghoul | 구울 | 7 | 120 | 24 | 8 | 20 | 55/40 | tree_sap .3, monster_core .2 | ai aggressive, skills [slash] |
| mad_bull | 미친 들소 | 7 | 160 | 28 | 14 | 12 | 65/45 | herb .5, monster_core .2 | ai aggressive, skills [slash] |
| wild_dog | 안개 들개 | 4 | 70 | 14 | 5 | 24 | 30/20 | slime_gel .3 | ai aggressive, skills [slash] |
| orc_chief | 오크 족장 | 10 | 220 | 32 | 16 | 14 | 120/100 | orc_tusk .8, iron_ore .3, monster_core .3 | ai smart, skills [slash, guard_break] |
| frost_witch | 서리 마녀 | 10 | 140 | 34 | 10 | 20 | 110/90 | frost_moss .5, silver_ore .2, monster_core .3 | ai smart, skills [ice_shard, lightning] |
| clockwork_soldier | 태엽 병정 | 11 | 180 | 30 | 18 | 16 | 130/95 | dark_crystal .35, monster_core .3 | ai balanced, skills [slash] |
| shade_beast | 어둠 마수 | 12 | 240 | 36 | 14 | 15 | 160/120 | dark_crystal .45, monster_core .35 | ai aggressive, skills [slash, guard_break] |
| gear_devourer | 태엽을 삼킨 마수 | 15 | 900 | 42 | 20 | 18 | 800/1500 | (드롭 없음 — 스토리 보상) | ai smart, skills [fireball, lightning, guard_break], **scale: 2.4** |

`ENEMY_ATTACK_PROFILES`:

```ts
    ghoul: { chargeMs: 800, hits: [0, 400], parryable: true, ringColor: "#a3e635" },
    mad_bull: { chargeMs: 1100, hits: [0, 500], parryable: false, ringColor: "#f97316" }, // 돌진 — 회피 전용
    wild_dog: { chargeMs: 500, hits: [0, 250, 500], parryable: true, ringColor: "#d4d4d8" },
    orc_chief: { chargeMs: 750, hits: [0, 400, 800], parryable: true, ringColor: "#c084fc" },
    frost_witch: { chargeMs: 1500, hits: [0], parryable: false, ringColor: "#67e8f9" },
    clockwork_soldier: { chargeMs: 700, hits: [0, 350, 700], parryable: true, ringColor: "#fbbf24" },
    shade_beast: { chargeMs: 1000, hits: [0, 650], parryable: true, ringColor: "#6b21a8" },
    gear_devourer: { chargeMs: 900, hits: [0, 450, 900], parryable: true, ringColor: "#f59e0b" }, // 보스 — 3연타
```

`ITEM_PRICES`에 `dark_crystal: 90,` / MenuUI MATERIALS에 `dark_crystal: { name: "어둠 수정" },` / ModelAvatar preload에 Cow.fbx·Pug.fbx.

- [ ] **Step 3: scale 렌더 반영**

EnemyMesh.tsx(전투)와 FieldEnemyAvatar.tsx(필드)에서 템플릿의 `scale`을 모델 스케일에 곱한다(기본 1). 각 파일에서 ModelAvatar/모델 렌더의 scale 계산 지점을 찾아 `* (template.scale ?? 1)` 적용 — 기존 스케일 상수(0.005 등)에 곱하는 방식.

- [ ] **Step 4: zoneContent.ts — gorge + 무리 다양화**

gorge 엔트리 추가:

```ts
    gorge: {
        gatherItems: ["dark_crystal", "mana_crystal", "dark_crystal"],
        roamerPacks: [
            ["clockwork_soldier", "clockwork_soldier"],
            ["shade_beast"],
            ["clockwork_soldier", "shade_beast"],
            ["shade_beast", "clockwork_soldier", "clockwork_soldier"],
            ["shade_beast", "shade_beast"],
        ],
        treasureLoot: [
            [{ id: "dark_crystal", qty: 2 }, { id: "health_potion", qty: 2 }],
            [{ id: "silver_ore", qty: 2 }, { id: "mana_potion", qty: 2 }],
            [{ id: "golden_herb", qty: 2 }, { id: "monster_core", qty: 2 }],
        ],
    },
```

기존 7존 roamerPacks를 신규 종 혼합으로 4~6조합으로 확대:

```ts
    town: [["slime", "slime"], ["wild_dog", "wild_dog", "wild_dog"], ["slime", "wild_dog"]],
    port: [["slime", "orc"], ["wild_dog", "wild_dog"], ["ghoul", "slime"]],
    hill: [["orc", "orc"], ["mad_bull"], ["orc_chief", "orc"], ["mad_bull", "orc"]],
    west_forest: [["zombie", "zombie"], ["ghoul", "zombie"], ["ghoul", "ghoul", "slime"], ["zombie", "wild_dog", "wild_dog"], ["ghoul", "mad_bull"]],
    north_woods: [["witch"], ["frost_witch", "zombie"], ["witch", "witch"], ["frost_witch", "ghoul"]],
    ne_water: [["ninja"], ["ninja", "ninja"], ["ninja", "witch"], ["ninja", "ghoul"], ["frost_witch", "ninja"]],
    south_coast: [["zombie", "orc"], ["mad_bull", "mad_bull"], ["ghoul", "ghoul"], ["orc", "slime", "slime"], ["wild_dog", "wild_dog", "mad_bull"]],
```

- [ ] **Step 5: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/placementData.ts src/app/games/rpg/data/zoneContent.ts src/app/games/rpg/data/gameData.ts src/app/games/rpg/menu/MenuUI.tsx src/app/games/rpg/actors/ModelAvatar.tsx src/app/games/rpg/battle/EnemyMesh.tsx src/app/games/rpg/field/FieldEnemyAvatar.tsx src/app/games/rpg/types/RpgTypes.ts
git commit -m "[feat] 종장 기반 — 협곡 존(gorge)·신규 몬스터 8종(보스 포함)·무리 다양화(31무리)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 존 정복 보상 시스템

**Files:**
- Create: `src/app/games/rpg/data/zoneRewards.ts`
- Create: `src/app/games/rpg/field/ZoneCompletionController.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)
- Modify: `src/app/games/rpg/menu/FullMapPanel.tsx` (존 라벨에 진행도 n/5·🏆)

**Interfaces:**
- 판정(존당 5플래그): 깃발 `flag_${legacyId or z_${zone}}` — town/port/hill은 `flag_town/flag_port/flag_hill`, 그 외는 `flag_z_${zone}` · 보물 `treasure_z_${zone}_t0..2` · 전망 `poi_z_${zone}0`
- Produces: `ZONE_REWARDS: Record<ZoneId, { gold: number; items: {id,qty}[] }>`, `zoneProgress(zoneId, flags): { done: number; total: 5 }` 헬퍼(zoneRewards.ts에서 export), 완료 플래그 `zone_done_${zoneId}`

- [ ] **Step 1: zoneRewards.ts**

```ts
// rpg/data/zoneRewards.ts — 존 정복 판정·보상 (기준: 깃발+보물3+전망 = 5요소)
import type { ZoneId } from "./placementData";

export const ZONE_REWARDS: Record<ZoneId, { gold: number; items: Array<{ id: string; qty: number }> }> = {
    town: { gold: 300, items: [{ id: "health_potion", qty: 3 }] },
    port: { gold: 400, items: [{ id: "clam", qty: 5 }] },
    hill: { gold: 500, items: [{ id: "wind_flower", qty: 3 }] },
    west_forest: { gold: 600, items: [{ id: "forest_mushroom", qty: 5 }] },
    south_coast: { gold: 600, items: [{ id: "coral_fish", qty: 2 }] },
    north_woods: { gold: 800, items: [{ id: "silver_ore", qty: 2 }] },
    ne_water: { gold: 800, items: [{ id: "lotus", qty: 3 }] },
    gorge: { gold: 1000, items: [{ id: "dark_crystal", qty: 3 }] },
};

const LEGACY_FLAG: Partial<Record<ZoneId, string>> = { town: "town", port: "port", hill: "hill" };

/** 존 정복 요소 플래그 목록 (깃발 1 + 보물 3 + 전망 1) */
export function zoneChecklist(zone: ZoneId): string[] {
    const flagId = LEGACY_FLAG[zone] ?? `z_${zone}`;
    return [
        `flag_${flagId}`,
        `treasure_z_${zone}_t0`,
        `treasure_z_${zone}_t1`,
        `treasure_z_${zone}_t2`,
        `poi_z_${zone}0`,
    ];
}

export function zoneProgress(zone: ZoneId, flags: Record<string, boolean>) {
    const list = zoneChecklist(zone);
    return { done: list.filter((f) => flags[f]).length, total: list.length };
}
```

- [ ] **Step 2: ZoneCompletionController.tsx**

RespawnController 골격(useFrame 60프레임 스로틀, combat idle 가드). 각 존에 대해: `zone_done_${id}` 미설정이고 `zoneProgress.done === total`이면 → 플래그 설정 + `gainGold` + rewards `addItem` + `spawnPopup({ side: "ally", text: "🏆 ${label} 정복! +${gold}G", color: "#fbbf24" })`. FieldScene에 마운트.

- [ ] **Step 3: FullMapPanel 진행도**

존 라벨 렌더를 `{zd.label} {done}/{total}` 형태로, `zone_done_` 플래그 시 `🏆 {zd.label}`. (`flags` 이미 구독 중, zoneProgress import.)

- [ ] **Step 4: tsc + Commit** — 파일 4개, 메시지 `[feat] 존 정복 보상 — 8존 탐사 완료(깃발+보물3+전망) 판정·보상·지도 진행도`

---

### Task 3: 스토리 데이터 — ch4 수호전·ch5 협곡·엔딩 (대사 전문)

**Files:**
- Modify: `src/app/games/rpg/data/storyData.ts`

**Interfaces:**
- `STAGE_ORDER`에 `"ch5_gorge", "epilogue"` 추가(ch4_hill 뒤).
- `StoryTrigger`에 신규 필드: `battle?: { id: string; templates: string[] }` (대사 종료 후 전투 진입 — Task 4가 파이프라인 구현), `reward?: { gold?: number; items?: Array<{ id: string; qty: number }> }` (발동 시 지급 — Task 4 구현).
- `CHAPTER_TITLES`에 `ch5_gorge: { sub: "태엽 조각 · 마지막", title: "종장 — 어둠의 협곡" }`, `epilogue: { sub: "노라의 아침", title: "종막 — 시계탑이 깨어나다", detail: "멈췄던 시간이 다시 흐른다" }`.

- [ ] **Step 1: 트리거 추가** (STORY_TRIGGERS 끝의 "Phase 3에서 확장" 주석 교체) — 대사는 아래 verbatim:

```ts
    {
        id: "hill_altar",
        stage: "ch4_hill",
        near: { x: 0, z: -210, radius: 8 },
        dialogue: [
            { speakerId: "theo", text: "제단이에요. 두 번째 태엽 조각의 파동이… 바로 아래에서 느껴집니다." },
            { speakerId: "arin", text: "기척이 있다. 수호자다 — 무기 들어." },
        ],
        battle: { id: "guardians", templates: ["orc_chief", "orc", "orc"] },
    },
    {
        id: "hill_altar_done",
        stage: "ch4_hill",
        flagsAll: ["defeated_guardians_0", "defeated_guardians_1", "defeated_guardians_2"],
        dialogue: [
            { speakerId: "lotti", text: "두 번째 조각이다! 반짝반짝… 갓 구운 파이처럼 탐스러운걸." },
            { speakerId: "theo", text: "남은 건 하나 — 쪽지의 '협곡'이군요. 바다 건너 남동쪽 군도입니다." },
            { speakerId: "arin", text: "항구로 간다. 배를 내줄 사람을 찾지." },
        ],
        nextStage: "ch5_gorge",
        objective: "항구의 사공을 찾아가자 ⛵",
        target: { x: 225.5, z: -11.5 },
    },
    {
        id: "gorge_landing",
        stage: "ch5_gorge",
        near: { x: 139.5, z: 17.5, radius: 10 },
        dialogue: [
            { speakerId: "arin", text: "…공기가 다르다. 여기가 어둠의 협곡이군." },
            { speakerId: "theo", text: "시간의 정체가 가장 짙어요. 태엽 조각이 — 아니, '삼킨 자'가 깊은 곳에 있습니다." },
            { speakerId: "lotti", text: "발밑 조심해. 뭔가… 움직이고 있어." },
        ],
        objective: "협곡 깊은 곳의 기척을 쫓자",
        target: { x: 268.5, z: 42.5 },
    },
    {
        id: "gorge_boss_intro",
        stage: "ch5_gorge",
        near: { x: 268.5, z: 42.5, radius: 10 },
        flagsAll: ["story_gorge_landing"],
        dialogue: [
            { speakerId: "theo", text: "저기! 태엽 조각을… 몸에 박아 넣은 마수예요. 시간을 삼키며 자란 겁니다." },
            { speaker: "태엽을 삼킨 마수", text: "…돌아가라. 시간은 이제, 나의 것이다." },
            { speakerId: "arin", text: "노라의 것을 돌려받겠다. 간다!" },
        ],
        battle: { id: "gorge_boss", templates: ["gear_devourer", "clockwork_soldier", "clockwork_soldier"] },
    },
    {
        id: "gorge_boss_done",
        stage: "ch5_gorge",
        flagsAll: ["defeated_gorge_boss_0", "defeated_gorge_boss_1", "defeated_gorge_boss_2"],
        dialogue: [
            { speakerId: "lotti", text: "해냈어…! 마지막 조각이야!" },
            { speakerId: "theo", text: "세 조각이 공명하고 있어요. 시계탑이 부르는 겁니다." },
            { speakerId: "arin", text: "돌아가자. 노라의 아침을 되찾으러." },
        ],
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
            { speaker: "요리사", text: "종이… 종이 울린다! 오오, 거리를 봐 — 모두 깨어나고 있어!" },
            { speakerId: "arin", text: "임무 완료다. …수고했다, 둘 다." },
            { speakerId: "lotti", text: "끝나고 나니 배고파! 사부님, 축하 잔치 해요!" },
            { speakerId: "theo", text: "노라의 시간이 다시 흐릅니다. 우리가, 해냈어요." },
        ],
        nextStage: "epilogue",
        objective: "되살아난 노라를 자유롭게 여행하자",
        target: null,
        reward: { gold: 3000, items: [ { id: "golden_herb", qty: 3 }, { id: "monster_core", qty: 5 } ] },
    },
```

- [ ] **Step 2: 주민 전원 각성** — LORE_POINTS의 `gate_wife`/`smith`/`port_fisher`에 `awakeAtStage: "epilogue"` + awakeLines 추가:

```ts
// gate_wife
awakeLines: [
    { speaker: "아낙", text: "어머, 빨래가 다 말랐네! …당신들이 구해준 거죠? 고마워요!" },
],
// smith
awakeLines: [
    { speaker: "대장장이", text: "망치가… 움직인다! 하하, 밀린 일감이 산더미군. 고맙네, 원정대!" },
],
// port_fisher
awakeLines: [
    { speaker: "어부", text: "그물이 이렇게 무거웠나! 이봐, 오늘 잡은 건 전부 자네들 몫일세!" },
],
```

- [ ] **Step 3: STAGE_ORDER/CHAPTER_TITLES/StoryTrigger 타입 확장** (Interfaces 참조 그대로).
- [ ] **Step 4: tsc + Commit** — 메시지 `[feat] 종장 스토리 데이터 — 제단 수호전·협곡·최종 보스·엔딩 대사 전문 + 에필로그 각성`

---

### Task 4: 스토리 전투 파이프라인 + 사공 왕복 + 트리거 보상

**Files:**
- Modify: `src/app/games/rpg/presenter/slices/storySlice.ts` (pendingStoryBattle)
- Modify: `src/app/games/rpg/field/StoryTriggers.tsx` (battle/reward 필드 처리)
- Modify: `src/app/games/rpg/ui/DialogueUI.tsx` (대사 종료 시 pendingStoryBattle 소비)
- Create: `src/app/games/rpg/field/Boatman.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (Boatman 마운트)

**Interfaces:**
- storySlice: `pendingStoryBattle: null | { id: string; templates: string[] }`, `setPendingStoryBattle(b)`.
- 파이프라인: StoryTriggers가 트리거의 `battle`을 `setPendingStoryBattle`로 저장(대사와 함께) → DialogueUI의 `advanceDialogue`로 **큐가 비는 순간** pendingStoryBattle이 있으면 `startCombat({ group: b.templates.map((t, i) => ({ template: t, fieldId: `${b.id}_${i}` })) })` 호출 후 null 리셋 → 승리 시 기존 exitBattle이 `defeated_${b.id}_${i}` 플래그 자동 기록 → 후속 트리거 flagsAll이 감지.
- StoryTriggers가 트리거 `reward`를 발동 시 지급(gainGold/addItem + spawnPopup "🎁 보상").
- Boatman: 사공 NPC 2개소 — 항구 (225.5, -38.25, -11.5) [ch5_gorge부터 표시] E→`requestTeleport(GORGE_LANDING)`, 상륙지 (139.5, -42.25, 17.5) 옆 (137, -42.25, 15) E→`requestTeleport({ x: 224.9, y: -38.25, z: -16.1 })`(부두). 모델 Elf.fbx, 라벨 "사공", 머리 위 ⛵ Html, E 가드는 기존 오버레이 규약. FieldQuestNpc 골격 재사용(퀘스트 상태 없음 — 단순 대화+텔레포트).

- [ ] **Step 1~4:** 위 계약대로 구현. DialogueUI 소비 지점: `advanceDialogue` 호출 후 큐 길이가 0이 되는 시점(클릭/키 핸들러에서 `dialogue.length === 1`일 때 처리하거나, 스토어 액션에서 처리 — **storySlice.advanceDialogue 내부에서** 큐가 비면 소비하는 방식을 권장: 슬라이스에서 `if (next.length === 0 && s.pendingStoryBattle) { ...startCombat 호출... }`. startCombat은 get()으로 접근).
- [ ] **Step 5: tsc + Commit** — 메시지 `[feat] 스토리 전투 파이프라인(대사→전투)·사공 왕복 항로·트리거 보상 지급`

---

### Task 5: 최종 검증 (컨트롤러 수행)

- [ ] tsc ≤ 28, `git status` 클린.
- [ ] 헤드리스: ① 사공 텔레포트 상륙(협곡 착지 y≈-42) + 귀환 ② 스토리 시뮬레이션 — 스테이지를 ch4_hill로 설정·제단 접근 → 수호전 진입 확인 → defeated 플래그 주입 → ch5 전이 → 협곡 상륙/보스 인트로 → 보스 defeated 주입 → finale 트리거·epilogue 전이·보상 지급 확인 ③ 존 정복: 임의 존 5플래그 주입 → zone_done + 보상 확인.
- [ ] 최종 전체 브랜치 리뷰(SDD) → 수정 웨이브 → 완료 보고.
