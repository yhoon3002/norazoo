# RPG 월드 확장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검증된 배치 좌표(placementData.ts)로 7존 전체에 콘텐츠를 전개하고, 요리(전투 버프)·장비 강화·사냥 의뢰판·낚시 확장 시스템을 추가한다.

**Architecture:** 존 구성은 `zoneContent.ts` 단일 소스, 배치는 placementData를 map 전개(리터럴 복붙 금지). 신규 시스템 상태는 fieldSlice(pendingBuffs·killCounts)와 uiSlice(smithOpen·bountyOpen). 패널 UI는 ShopPanel 스타일 재사용.

**Tech Stack:** 기존 그대로. 신규 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-07-20-rpg-world-expansion-design.md`

## Global Constraints

- 테스트 러너 없음. 검증 = `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ **28** + 브라우저 확인은 사용자/컨트롤러 위임.
- 스타일: 4칸 들여쓰기, 한국어 주석, 파일 헤더 `// rpg/<경로> — <설명>`, `"use client"`.
- 커밋: 태스크별 명시 파일만 `git add`. `git add -A` 금지. `[feat]/[fix]` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `src/app/games/rpg/data/placementData.ts`는 이미 저장소에 존재(도달 검증된 좌표). 좌표를 손으로 추가/수정하지 말 것.
- 배치 id 규약: `z_${zoneId}_g{i}`(채집)/`z_${zoneId}_r{i}`(배회)/`z_${zoneId}_t{i}`(보물)/`z_${zoneId}`(깃발)/`poi_z_${zoneId}{i}`(전망).

---

### Task 1: 존 기반 데이터 — 신규 아이템 13종·적 3종·zoneContent

**Files:**
- Create: `src/app/games/rpg/data/zoneContent.ts`
- Modify: `src/app/games/rpg/data/gameData.ts` (ITEM_PRICES, ENEMY_MODEL_BY_TEMPLATE, ENEMY_TEMPLATES, ENEMY_ATTACK_PROFILES)
- Modify: `src/app/games/rpg/menu/MenuUI.tsx` (MATERIALS)
- Modify: `src/app/games/rpg/actors/ModelAvatar.tsx` (preload 3종)
- Add: `src/app/games/rpg/data/placementData.ts` (이미 작성됨 — 이 태스크 커밋에 포함)

**Interfaces:**
- Consumes: `ZoneId` (placementData)
- Produces: `ZONE_CONTENT: Record<ZoneId, { gatherItems: string[]; roamerPacks: string[][]; treasureLoot: Array<Array<{id,qty}>> }>`, 적 템플릿 `zombie`/`witch`/`ninja`, 아이템 id: clam/sea_salt/wind_flower/forest_mushroom/tree_sap/frost_moss/iron_ore/silver_ore/reed/lotus/driftwood/silver_trout/coral_fish

- [ ] **Step 1: gameData.ts — 아이템 가격 추가**

`ITEM_PRICES`에 추가:

```ts
    clam: 10,
    sea_salt: 8,
    wind_flower: 25,
    forest_mushroom: 15,
    tree_sap: 12,
    frost_moss: 30,
    iron_ore: 35,
    silver_ore: 70,
    reed: 6,
    lotus: 28,
    driftwood: 9,
    silver_trout: 40,
    coral_fish: 55,
```

- [ ] **Step 2: MenuUI.tsx — MATERIALS 등록**

```ts
    clam: { name: "조개" },
    sea_salt: { name: "바닷소금" },
    wind_flower: { name: "바람꽃" },
    forest_mushroom: { name: "숲버섯" },
    tree_sap: { name: "나무수액" },
    frost_moss: { name: "서리이끼" },
    iron_ore: { name: "철광석" },
    silver_ore: { name: "은광석" },
    reed: { name: "갈대" },
    lotus: { name: "연꽃" },
    driftwood: { name: "유목" },
    silver_trout: { name: "은빛송어" },
    coral_fish: { name: "산호어" },
```

- [ ] **Step 3: 신규 적 3종**

`ENEMY_MODEL_BY_TEMPLATE`에 추가:

```ts
    zombie: "/character/Zombie_Male.fbx",
    witch: "/character/Witch.fbx",
    ninja: "/character/Ninja_Female.fbx",
```

`ENEMY_TEMPLATES`에 추가 — **기존 slime/orc/mage 항목과 완전히 같은 필드 구조**(name/model/level/stats/skills/statusEffects/aiPattern/rewards)를 그대로 따른다. 값:

```ts
    zombie: {
        name: "썩은 좀비", model: "/character/Zombie_Male.fbx", level: 6,
        stats: { hp: 140, maxHp: 140, mp: 0, maxMp: 0, atk: 22, def: 12, speed: 8, luck: 3 },
        skills: ["slash"], statusEffects: [], aiPattern: "aggressive",
        rewards: { exp: 45, gold: 30, items: [ { id: "tree_sap", chance: 0.35 }, { id: "monster_core", chance: 0.2 } ] },
    },
    witch: {
        name: "숲의 마녀", model: "/character/Witch.fbx", level: 8,
        stats: { hp: 110, maxHp: 110, mp: 60, maxMp: 60, atk: 30, def: 8, speed: 18, luck: 10 },
        skills: ["fireball", "lightning"], statusEffects: [], aiPattern: "smart",
        rewards: { exp: 70, gold: 55, items: [ { id: "frost_moss", chance: 0.4 }, { id: "monster_core", chance: 0.25 } ] },
    },
    ninja: {
        name: "그림자 닌자", model: "/character/Ninja_Female.fbx", level: 9,
        stats: { hp: 130, maxHp: 130, mp: 20, maxMp: 20, atk: 26, def: 10, speed: 26, luck: 12 },
        skills: ["slash", "ice_shard"], statusEffects: [], aiPattern: "smart",
        rewards: { exp: 85, gold: 70, items: [ { id: "silver_ore", chance: 0.2 }, { id: "monster_core", chance: 0.25 } ] },
    },
```

(기존 템플릿의 실제 필드와 다르면 기존 구조를 우선하고 값만 이식한다.)

`ENEMY_ATTACK_PROFILES`에 추가:

```ts
    zombie: { chargeMs: 1000, hits: [0, 600], parryable: true, ringColor: "#84cc16" }, // 굼뜬 2연타
    witch: { chargeMs: 1800, hits: [0], parryable: false, ringColor: "#a78bfa" }, // 긴 차지 회피 전용
    ninja: { chargeMs: 600, hits: [0, 300, 600], parryable: true, ringColor: "#f472b6" }, // 빠른 3연타
```

- [ ] **Step 4: ModelAvatar.tsx preload 추가**

```ts
useFBX.preload("/character/Zombie_Male.fbx");
useFBX.preload("/character/Witch.fbx");
useFBX.preload("/character/Ninja_Female.fbx");
```

- [ ] **Step 5: zoneContent.ts 생성**

```ts
// rpg/data/zoneContent.ts — 존 티어 구성 단일 소스 (채집 아이템·배회 조합·보물 전리품)
// 배치 좌표는 placementData가, "무엇을 놓을지"는 이 파일이 결정한다.
import type { ZoneId } from "./placementData";

export const ZONE_CONTENT: Record<
    ZoneId,
    {
        /** 채집 스폰에 순환 배정할 아이템 id */
        gatherItems: string[];
        /** 배회 무리 조합(순환) */
        roamerPacks: string[][];
        /** 숨은 보물 전리품(순환) */
        treasureLoot: Array<Array<{ id: string; qty: number }>>;
    }
> = {
    town: {
        gatherItems: ["herb", "slime_gel"],
        roamerPacks: [["slime", "slime"]],
        treasureLoot: [
            [{ id: "health_potion", qty: 2 }],
            [{ id: "herb", qty: 3 }, { id: "mana_potion", qty: 1 }],
            [{ id: "monster_core", qty: 1 }],
        ],
    },
    port: {
        gatherItems: ["clam", "sea_salt", "clam"],
        roamerPacks: [["slime", "orc"]],
        treasureLoot: [
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "sea_salt", qty: 3 }],
            [{ id: "mana_crystal", qty: 2 }],
        ],
    },
    hill: {
        gatherItems: ["wind_flower", "herb"],
        roamerPacks: [["orc", "orc"]],
        treasureLoot: [
            [{ id: "wind_flower", qty: 2 }, { id: "health_potion", qty: 1 }],
            [{ id: "orc_tusk", qty: 3 }],
            [{ id: "golden_herb", qty: 1 }],
        ],
    },
    west_forest: {
        gatherItems: ["forest_mushroom", "tree_sap", "forest_mushroom"],
        roamerPacks: [["zombie", "zombie"], ["zombie", "slime"], ["zombie", "zombie", "slime"]],
        treasureLoot: [
            [{ id: "forest_mushroom", qty: 3 }],
            [{ id: "tree_sap", qty: 2 }, { id: "health_potion", qty: 2 }],
            [{ id: "monster_core", qty: 2 }],
        ],
    },
    north_woods: {
        gatherItems: ["frost_moss", "iron_ore"],
        roamerPacks: [["witch"], ["witch", "zombie"], ["witch", "witch"]],
        treasureLoot: [
            [{ id: "iron_ore", qty: 2 }],
            [{ id: "frost_moss", qty: 2 }, { id: "mana_potion", qty: 2 }],
            [{ id: "silver_ore", qty: 1 }],
        ],
    },
    ne_water: {
        gatherItems: ["reed", "lotus", "silver_ore"],
        roamerPacks: [["ninja"], ["ninja", "ninja"], ["ninja", "witch"]],
        treasureLoot: [
            [{ id: "silver_ore", qty: 2 }],
            [{ id: "lotus", qty: 2 }, { id: "mana_crystal", qty: 2 }],
            [{ id: "monster_core", qty: 2 }, { id: "golden_herb", qty: 1 }],
        ],
    },
    south_coast: {
        gatherItems: ["clam", "driftwood"],
        roamerPacks: [["zombie", "orc"], ["orc", "slime", "slime"], ["zombie", "zombie"]],
        treasureLoot: [
            [{ id: "driftwood", qty: 3 }],
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "coral_fish", qty: 1 }, { id: "sea_salt", qty: 2 }],
        ],
    },
};
```

- [ ] **Step 6: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/zoneContent.ts src/app/games/rpg/data/placementData.ts src/app/games/rpg/data/gameData.ts src/app/games/rpg/menu/MenuUI.tsx src/app/games/rpg/actors/ModelAvatar.tsx
git commit -m "[feat] 월드 확장 기반 — 존 티어 구성·신규 재료 13종·신규 적 3종(좀비/마녀/닌자)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 전 존 배치 전개 (채집 84·배회 11·보물 21·깃발 4·전망 7)

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts` (배치 전개 루프)
- Modify: `src/app/games/rpg/data/storyData.ts` (STORY_FLAGS 확장)
- Modify: `src/app/games/rpg/data/poiData.ts` (POIS 확장 + HIDDEN_TREASURE_IDS 확장)

**Interfaces:**
- Consumes: `ZONE_DEFS/GEN_*` (placementData), `ZONE_CONTENT` (Task 1)
- Produces: id 규약대로 확장된 FIELD_GATHERABLES/FIELD_ENEMIES/FIELD_TREASURES/STORY_FLAGS/POIS — 소비처(FieldScene/MiniMap/FullMapPanel/FastTravelPanel)는 데이터 기반이라 자동 반영

- [ ] **Step 1: gameData.ts — 배치 전개**

import에 추가: `import { ZONE_DEFS, GEN_GATHER, GEN_ROAMERS, GEN_TREASURES } from "./placementData";` / `import { ZONE_CONTENT } from "./zoneContent";`

`GOLDEN_HERB_SPOTS` 선언 아래에 추가:

```ts
// ===== 존 확장 배치 — placementData(도달 검증 좌표) × zoneContent(티어 구성) 전개 =====
for (const zd of ZONE_DEFS) {
    const zc = ZONE_CONTENT[zd.id];
    GEN_GATHER[zd.id].forEach((s, i) => {
        FIELD_GATHERABLES.push({
            id: `z_${zd.id}_g${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            item: zc.gatherItems[i % zc.gatherItems.length],
            qty: 1,
        });
    });
    GEN_ROAMERS[zd.id].forEach((s, i) => {
        FIELD_ENEMIES.push({
            id: `z_${zd.id}_r${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            templates: zc.roamerPacks[i % zc.roamerPacks.length],
            respawn: 180_000,
        });
    });
    GEN_TREASURES[zd.id].forEach((s, i) => {
        FIELD_TREASURES.push({
            id: `z_${zd.id}_t${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            items: zc.treasureLoot[i % zc.treasureLoot.length],
        });
    });
}
```

- [ ] **Step 2: storyData.ts — 신규 깃발 4개**

import 추가: `import { GEN_FLAGS, ZONE_DEFS } from "./placementData";`
`STORY_FLAGS` 선언 아래에 추가:

```ts
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
```

- [ ] **Step 3: poiData.ts — 전망 POI 7 + 숨은 보물 지도 대상 확장**

import 추가: `import { ZONE_DEFS, GEN_POIS, GEN_TREASURES } from "./placementData";`
`POIS` 선언 아래에 추가:

```ts
// 존 전망 포인트 — 고지대/물가 (티어별 보상)
const ZONE_POI_DESC: Record<string, string> = {
    town: "성채와 광장이 한눈에 들어온다",
    port: "멈춘 만의 물결이 유리처럼 빛난다",
    hill: "바람의 결이 굳은 벌판",
    west_forest: "끝없는 수해가 펼쳐진다",
    north_woods: "서리 낀 숲 사이로 옛길이 보인다",
    ne_water: "갈대밭 너머 수로가 얽혀 있다",
    south_coast: "굳은 파도가 해안을 감싼다",
};
for (const zd of ZONE_DEFS) {
    GEN_POIS[zd.id].forEach((s, i) => {
        POIS.push({
            id: `z_${zd.id}${i}`,
            x: s.x,
            z: s.z,
            y: s.y,
            label: `${zd.label} 전망`,
            desc: ZONE_POI_DESC[zd.id] ?? "",
            rewardGold: 100,
            rewardExp: 60,
        });
    });
}

// 지도 '?' 대상에 존 보물 포함
for (const zd of ZONE_DEFS) {
    GEN_TREASURES[zd.id].forEach((_, i) => {
        HIDDEN_TREASURE_IDS.push(`z_${zd.id}_t${i}`);
    });
}
```

(`POIS`/`HIDDEN_TREASURE_IDS`가 `const` 배열이므로 push 사용.)

- [ ] **Step 4: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/gameData.ts src/app/games/rpg/data/storyData.ts src/app/games/rpg/data/poiData.ts
git commit -m "[feat] 7존 전체 콘텐츠 전개 — 채집 84·배회 11무리·보물 21·깃발 4·전망 7 (검증 좌표)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 요리 시스템 (레시피 → 다음 전투 버프)

**Files:**
- Create: `src/app/games/rpg/data/recipeData.ts`
- Modify: `src/app/games/rpg/presenter/slices/fieldSlice.ts` (pendingBuffs)
- Modify: `src/app/games/rpg/presenter/slices/combatSlice.ts` (startCombat에서 버프 적용)
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (statusEffects 타입 유니온에 "regen" 추가)
- Modify: `src/app/games/rpg/presenter/slices/statusSlice.ts` (regen 처리)
- Modify: `src/app/games/rpg/presenter/slices/battleActionsSlice.ts` + `src/app/games/rpg/presenter/slices/enemyActionsSlice.ts` (buff_atk/def 데미지 수식 반영)
- Modify: `src/app/games/rpg/menu/ShopPanel.tsx` ("요리" 탭)

**Interfaces:**
- Consumes: bag(addItem 차감), `ZONE_CONTENT` 재료, statusEffects
- Produces:
  - `RECIPES: Recipe[]`, `type Recipe = { id; name; icon; desc; needs: {id,qty}[]; buffs: Array<{type:"buff_atk"|"buff_def"|"regen"|"speed"|"ether"; value:number; duration:number}> }`
  - fieldSlice: `pendingBuffs: Array<{type,value,duration,expiresAt}>`, `addPendingBuffs(buffs)`, `consumePendingBuffs(): Buff[]`
  - **버프 수식 계약**: 공격자 유효 atk = stats.atk + Σ(buff_atk.value), 피격자 유효 def = stats.def + Σ(buff_def.value). speed 버프는 턴 순서 계산 시(전투 시작 시 statusEffects 반영), ether는 섭취 즉시 gainEther.

- [ ] **Step 1: recipeData.ts 생성**

```ts
// rpg/data/recipeData.ts — 요리 레시피 (존 재료 → 다음 전투 버프, 즉석 섭취)
export type RecipeBuff = {
    type: "buff_atk" | "buff_def" | "regen" | "speed" | "ether";
    value: number;
    /** 전투 내 지속 턴 (ether는 즉시 적용이라 무시) */
    duration: number;
};

export type Recipe = {
    id: string;
    name: string;
    icon: string;
    desc: string;
    needs: Array<{ id: string; qty: number }>;
    buffs: RecipeBuff[];
};

export const RECIPES: Recipe[] = [
    {
        id: "clam_steam", name: "조개찜", icon: "🥘",
        desc: "다음 전투: 방어 +6 (4턴)",
        needs: [ { id: "clam", qty: 2 }, { id: "sea_salt", qty: 1 } ],
        buffs: [{ type: "buff_def", value: 6, duration: 4 }],
    },
    {
        id: "mushroom_stew", name: "버섯스튜", icon: "🍲",
        desc: "다음 전투: 매 턴 HP 8 회복 (4턴)",
        needs: [ { id: "forest_mushroom", qty: 2 }, { id: "herb", qty: 1 } ],
        buffs: [{ type: "regen", value: 8, duration: 4 }],
    },
    {
        id: "wind_tea", name: "바람꽃차", icon: "🍵",
        desc: "다음 전투: 속도 +5 (4턴)",
        needs: [{ id: "wind_flower", qty: 2 }],
        buffs: [{ type: "speed", value: 5, duration: 4 }],
    },
    {
        id: "grilled_fish", name: "생선구이", icon: "🐟",
        desc: "다음 전투: 공격 +5 (4턴)",
        needs: [ { id: "fish_common", qty: 2 }, { id: "sea_salt", qty: 1 } ],
        buffs: [{ type: "buff_atk", value: 5, duration: 4 }],
    },
    {
        id: "moon_sashimi", name: "월광어회", icon: "🌕",
        desc: "다음 전투: 공격 +8·속도 +4 (4턴)",
        needs: [{ id: "fish_rare", qty: 1 }],
        buffs: [
            { type: "buff_atk", value: 8, duration: 4 },
            { type: "speed", value: 4, duration: 4 },
        ],
    },
    {
        id: "lotus_porridge", name: "연꽃죽", icon: "🥣",
        desc: "즉시: 파티 전원 에테르 +2",
        needs: [ { id: "lotus", qty: 1 }, { id: "reed", qty: 2 } ],
        buffs: [{ type: "ether", value: 2, duration: 0 }],
    },
];
```

- [ ] **Step 2: fieldSlice — pendingBuffs**

`goldenHerbIdx` 아래에 추가:

```ts
    /** 요리 버프 대기열 — 다음 전투 시작 시 파티 전원에게 적용 (5분 내 미사용 시 만료, 비영속) */
    pendingBuffs: [] as Array<{ type: string; value: number; duration: number; expiresAt: number }>,

    addPendingBuffs: (buffs: Array<{ type: string; value: number; duration: number }>) =>
        set((s: any) => ({
            pendingBuffs: [
                ...s.pendingBuffs,
                ...buffs.map((b) => ({ ...b, expiresAt: Date.now() + 300_000 })),
            ],
        })),

    /** 전투 시작 시 1회 소비 */
    consumePendingBuffs: () => {
        const now = Date.now();
        const valid = get().pendingBuffs.filter((b: any) => b.expiresAt > now);
        set({ pendingBuffs: [] });
        return valid as Array<{ type: string; value: number; duration: number }>;
    },
```

- [ ] **Step 3: RpgTypes/statusSlice — regen 지원**

RpgTypes.ts의 statusEffects 타입 유니온(25행 부근)에 `"regen"`과 `"speed"` 추가 (요리 버프가 statusEffects로 들어간다):

```ts
        type: "poison" | "burn" | "freeze" | "stun" | "buff_atk" | "buff_def" | "regen" | "speed";
```

statusSlice.ts `processStatusEffects`의 switch에 케이스 추가 (burn/poison 케이스 아래):

```ts
                case "regen":
                    get().healCharacter?.(characterId, effect.value) ??
                        // healCharacter가 없으면 applyDamage 음수로 대체하지 말고 직접 회복
                        set((state: any) => {
                            const party = state.player.party.map((c: any) =>
                                c.id === characterId
                                    ? { ...c, stats: { ...c.stats, hp: Math.min(c.stats.maxHp, c.stats.hp + effect.value) } }
                                    : c
                            );
                            return { player: { ...state.player, party } };
                        });
                    get().spawnPopup({
                        side: char ? "ally" : "enemy",
                        charId: characterId,
                        text: `+${effect.value} (재생)`,
                        color: "#4ade80",
                    });
                    break;
```

(스토어에 `healCharacter` 액션이 실제로 있으면 그것만 사용하고 위 인라인 set은 제거 — 구현 시 확인.)

- [ ] **Step 4: combatSlice.startCombat — 버프 적용**

startCombat의 `set((s: any) => { ... })` 안에서 party를 구성/사용하는 지점에 다음을 통합 (enemies 계산 아래):

```ts
            // 요리 버프 소비 — 파티 전원 statusEffects에 부여, ether는 즉시
            const buffs = (get() as any).consumePendingBuffs?.() ?? [];
            const statusBuffs = buffs.filter((b: any) => b.type !== "ether");
            const party = s.player.party.map((c: any) => ({
                ...c,
                statusEffects: [
                    ...c.statusEffects,
                    ...statusBuffs.map((b: any) => ({
                        type: b.type,
                        duration: b.duration,
                        value: b.value,
                    })),
                ],
            }));
```

이후 반환 상태에서 기존 `s.player.party` 참조를 `party`로 교체하고(`player: { ...s.player, party }` 포함 — startCombat이 player를 반환하지 않는 구조면 추가), ether 버프는:

```ts
            for (const b of buffs.filter((x: any) => x.type === "ether"))
                for (const c of party) (get() as any).gainEther(c.id, b.value);
```

를 set 완료 직후(액션 말미)에 호출한다. speed 버프는 statusEffects로 들어가므로 턴 순서 계산이 statusEffects speed를 반영하는지 확인하고, 반영하지 않으면 **턴 큐 계산에서 유효 speed = stats.speed + Σ(speed buff value)**로 수정한다(턴 큐 구성 코드는 combatSlice/turnSlice 내 speed 정렬 지점 — `speed`로 정렬하는 곳을 찾아 반영).

- [ ] **Step 5: buff_atk/buff_def 데미지 수식 반영**

`battleActionsSlice.ts`(아군 공격)와 `enemyActionsSlice.ts`(적 공격)에서 데미지 계산에 쓰이는 `stats.atk` / `stats.def` 사용처를 찾아, 아래 헬퍼를 `gameStoreHelpers.ts`에 추가하고 두 슬라이스의 해당 사용처를 교체한다:

```ts
/** statusEffects의 buff_atk/buff_def를 합산한 유효 스탯 */
export function effectiveStat(
    unit: { stats?: { atk: number; def: number }; statusEffects: Array<{ type: string; value: number }> },
    key: "atk" | "def"
): number {
    const base = unit.stats?.[key] ?? 0;
    const buffType = key === "atk" ? "buff_atk" : "buff_def";
    return (
        base +
        unit.statusEffects
            .filter((e) => e.type === buffType)
            .reduce((s, e) => s + e.value, 0)
    );
}
```

교체 규칙: **공격측 atk와 방어측 def를 읽는 모든 데미지 수식**(스킬/기본공격/적 공격)에서 `attacker.stats.atk` → `effectiveStat(attacker, "atk")`, `target.stats.def` → `effectiveStat(target, "def")`. 힐/보조 수식은 제외.

- [ ] **Step 6: ShopPanel — "요리" 탭**

`tab` 상태를 `"buy" | "sell" | "cook"`으로 확장하고, 구매/판매 버튼 옆에 요리 탭 버튼(라벨 "요리 🍲")을 같은 스타일로 추가. cook 탭 내용:

```tsx
                {tab === "cook" && (
                    <div className="space-y-2">
                        {RECIPES.map((r) => {
                            const can = r.needs.every(
                                (n) =>
                                    (bag.find((b) => b.id === n.id)?.qty ?? 0) >= n.qty
                            );
                            return (
                                <div
                                    key={r.id}
                                    className="flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3"
                                >
                                    <div>
                                        <div className="font-bold text-amber-100">
                                            {r.icon} {r.name}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {r.desc} · 재료:{" "}
                                            {r.needs
                                                .map((n) => `${displayName(n.id)}×${n.qty}`)
                                                .join(", ")}
                                        </div>
                                    </div>
                                    <button
                                        disabled={!can}
                                        onClick={() => cook(r)}
                                        className={`rounded-lg px-3 py-1.5 text-sm ${
                                            can
                                                ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/40"
                                                : "cursor-not-allowed bg-white/5 text-gray-500"
                                        }`}
                                    >
                                        조리
                                    </button>
                                </div>
                            );
                        })}
                        <div className="pt-1 text-center text-xs text-gray-400">
                            조리한 요리는 바로 먹는다 — 효과는 다음 전투에 적용 (5분 내)
                        </div>
                    </div>
                )}
```

`cook` 핸들러 (컴포넌트 내):

```tsx
    const cook = (r: Recipe) => {
        const s = useGame.getState() as any;
        // 재료 차감
        useGame.setState((st: any) => {
            let bag = [...st.bag];
            for (const n of r.needs)
                bag = bag
                    .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                    .filter((b: any) => b.qty > 0);
            return { bag };
        });
        s.addPendingBuffs(r.buffs);
        s.spawnPopup({ side: "ally", text: `${r.icon} ${r.name} — 다음 전투에 적용!`, color: "#fbbf24" });
    };
```

(ShopPanel의 기존 아이템 표시명 헬퍼(`displayName` 상당)를 재사용하고, 없으면 MATERIALS/CONSUMABLES 참조 헬퍼를 이 파일에 맞게 사용. `RECIPES`/`Recipe` import 추가.)

- [ ] **Step 7: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/recipeData.ts src/app/games/rpg/presenter/slices/fieldSlice.ts src/app/games/rpg/presenter/slices/combatSlice.ts src/app/games/rpg/types/RpgTypes.ts src/app/games/rpg/presenter/slices/statusSlice.ts src/app/games/rpg/presenter/slices/battleActionsSlice.ts src/app/games/rpg/presenter/slices/enemyActionsSlice.ts src/app/games/rpg/presenter/gameStoreHelpers.ts src/app/games/rpg/menu/ShopPanel.tsx
git commit -m "[feat] 요리 시스템 — 존 재료 레시피 6종, 다음 전투 버프(공/방/재생/속도/에테르) + 버프 수식 실반영

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 장비 강화 (+1~+3, 대장장이)

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts` (EQUIPMENT 파생 생성 + 강화 비용표)
- Create: `src/app/games/rpg/field/FieldSmith.tsx`
- Create: `src/app/games/rpg/menu/SmithPanel.tsx`
- Modify: `src/app/games/rpg/presenter/slices/uiSlice.ts` (smithOpen)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (FieldSmith 마운트)
- Modify: `src/app/games/rpg/container/RpgGame.tsx` (SmithPanel 마운트 + ESC/M/I 가드에 smithOpen)

**Interfaces:**
- Consumes: EQUIPMENT 테이블 구조(id→{name, type, stats, skills?}), bag, gold, `quest_smith_core_done` 플래그
- Produces:
  - EQUIPMENT에 `${id}_p1..p3` 파생(원본 스탯 ×1.15/1.30/1.50 반올림, name "+n" 접미) — ITEM_PRICES에도 같은 배율 등록
  - `UPGRADE_COSTS: Array<{ needs: {id,qty}[]; gold: number }>` (레벨 1→+1, 2→+2, 3→+3 비용)
  - `ui.smithOpen`, `toggleSmith()`

- [ ] **Step 1: gameData.ts — 파생 생성기 + 비용표**

EQUIPMENT 선언 **직후**에 추가:

```ts
// ===== 장비 강화 파생 (+1~+3) — 모듈 로드 시 자동 생성 =====
// id 규약: `${원본}_p{n}`. 스탯 ×1.15/1.30/1.50 반올림, 표시명 "+n".
export const UPGRADE_MULT = [1.15, 1.3, 1.5];
export const UPGRADE_COSTS: Array<{ needs: Array<{ id: string; qty: number }>; gold: number }> = [
    { needs: [{ id: "iron_ore", qty: 2 }], gold: 100 },
    { needs: [{ id: "iron_ore", qty: 3 }, { id: "monster_core", qty: 1 }], gold: 250 },
    { needs: [{ id: "silver_ore", qty: 2 }, { id: "monster_core", qty: 2 }], gold: 600 },
];
for (const baseId of Object.keys(EQUIPMENT)) {
    const base = EQUIPMENT[baseId];
    for (let n = 1; n <= 3; n++) {
        const stats: Record<string, number> = {};
        for (const [k, v] of Object.entries(base.stats)) {
            if (typeof v === "number") stats[k] = Math.round(v * UPGRADE_MULT[n - 1]);
        }
        EQUIPMENT[`${baseId}_p${n}`] = {
            ...base,
            name: `${base.name} +${n}`,
            stats: stats as any,
        };
        if (ITEM_PRICES[baseId])
            ITEM_PRICES[`${baseId}_p${n}`] = Math.round(ITEM_PRICES[baseId] * UPGRADE_MULT[n - 1]);
    }
}
```

(EQUIPMENT의 실제 항목 구조를 확인해 `stats` 외 필드는 `...base`로 보존. SHOP_STOCK에는 파생을 넣지 않는다.)

- [ ] **Step 2: uiSlice — smithOpen**

state·closeAll 양쪽에 `smithOpen: false` 추가 + 액션:

```ts
    // ===== 대장간 강화 =====
    toggleSmith: () =>
        set((s: any) => ({ ui: { ...s.ui, smithOpen: !s.ui.smithOpen } })),
```

- [ ] **Step 3: FieldSmith.tsx 생성**

FieldQuestNpc와 동일 골격(스냅·근접·E 핸들러)로 작성하되:
- 위치 `{ x: 46.5, y: -33.25, z: -26.5 }` (견습 대장장이 옆), 모델 `/character/VikingHelmet.fbx`는 파수꾼과 중복이므로 `/character/Cowboy_Hair.fbx`도 소년과 중복 — **`/character/Viking_Female.fbx` 재사용 금지** → 사용 가능한 나머지 중 `/character/Zombie_Female.fbx`는 부적합하므로 **`/character/BlueSoldier_Female.fbx`** 사용, 라벨 "대장장이 화로".
- E 핸들러: `combat idle`·`dialogue 0`·오버레이(mapOpen/shopOpen/fishingOpen/bountyOpen) 가드 후:
  - `!flags.quest_smith_core_done`이면 `startDialogue([{ speaker: "견습 대장장이", text: "화로가 아직 차가워요… 마물 결정을 구해다 주시면 (❗ 의뢰) 강화로를 열 수 있어요." }])`
  - 완료면 `document.exitPointerLock?.(); toggleSmith();`
- 머리 위 Html 라벨: 범위 내에서 "E: 강화 🔨".

- [ ] **Step 4: SmithPanel.tsx 생성**

ShopPanel 골격 재사용(오버레이·헤더 "SMITHY"). 내용:

```tsx
// 가방 속 장비(EQUIPMENT에 있고 카테고리 equipment) 목록 → 선택 → 강화
// 현재 강화 단계: id의 _p{n} 접미로 판정 (없으면 0)
function upgradeInfo(id: string) {
    const m = id.match(/^(.*)_p([123])$/);
    return m ? { baseId: m[1], level: Number(m[2]) } : { baseId: id, level: 0 };
}
```

- 목록 행: 장비명(+n 포함), 다음 단계 비용(`UPGRADE_COSTS[level]` — needs 아이템명×qty + 골드), "강화" 버튼(재료·골드 충족 시 활성).
- 강화 실행: bag에서 해당 장비 1개 차감 → `${baseId}_p${level+1}` 1개 추가(addItem) → needs 차감 → `gainGold(-cost.gold)`가 아닌 `useGame.setState`로 gold 차감(음수 gainGold 금지, gold < cost.gold면 버튼 비활성) → spawnPopup(`🔨 {이름} 강화 성공!`).
- level 3(=`_p3`)이면 "최대 강화" 표시.
- 장착 중 장비는 목록에서 제외(가방만) — 안내 문구 "장착 중인 장비는 해제 후 강화할 수 있다".

- [ ] **Step 5: 마운트 + 가드**

- FieldScene: `<FieldSmith />` 마운트 (SIDE_QUESTS 마운트 근처).
- RpgGame: `{combat.phase === "idle" && <SmithPanel />}` + ESC 분기·`m`·`i` 가드 목록에 `smithOpen` 추가 + 미니맵 숨김 조건에 `!ui.smithOpen`.
- FieldPlayer 이동 잠금(`inDialogue` 계산)에 `smithOpen` 추가.
- StoryTriggers 보류 가드에 `smithOpen` 추가.

- [ ] **Step 6: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/gameData.ts src/app/games/rpg/field/FieldSmith.tsx src/app/games/rpg/menu/SmithPanel.tsx src/app/games/rpg/presenter/slices/uiSlice.ts src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/container/RpgGame.tsx src/app/games/rpg/field/FieldPlayer.tsx src/app/games/rpg/field/StoryTriggers.tsx
git commit -m "[feat] 장비 강화 — +1~+3 파생 자동 생성, 대장간 NPC/패널 (광석+마물 결정 소모)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 사냥 의뢰판 (반복 토벌)

**Files:**
- Create: `src/app/games/rpg/data/bountyData.ts`
- Modify: `src/app/games/rpg/presenter/slices/fieldSlice.ts` (killCounts)
- Modify: `src/app/games/rpg/presenter/slices/turnSlice.ts` (승리 시 카운트 + snapshot/applySave 왕복)
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (SaveV1 optional `counters`)
- Create: `src/app/games/rpg/field/BountyBoard.tsx`
- Create: `src/app/games/rpg/menu/BountyPanel.tsx`
- Modify: `src/app/games/rpg/presenter/slices/uiSlice.ts` (bountyOpen)
- Modify: `src/app/games/rpg/field/FieldScene.tsx`, `src/app/games/rpg/container/RpgGame.tsx`, `src/app/games/rpg/field/FieldPlayer.tsx`, `src/app/games/rpg/field/StoryTriggers.tsx` (마운트/가드)

**Interfaces:**
- Produces:
  - `BOUNTIES: Array<{ id; label; template; count; rewardGold; rewardItems: {id,qty}[] }>`
  - fieldSlice: `killCounts: Record<string, number>` (템플릿별 누적, **영속**), `addKill(template)`, 의뢰 기준점은 `killCounts[`bounty_${id}_base`]`에 저장
  - RpgTypes: `SaveV1.counters?: Record<string, number>` — snapshot은 killCounts를 counters로 저장, applySave는 복원
  - `ui.bountyOpen`, `toggleBounty()`

- [ ] **Step 1: bountyData.ts**

```ts
// rpg/data/bountyData.ts — 사냥 의뢰 (반복 수주 가능: 수락→토벌→보상→재수락)
export type Bounty = {
    id: string;
    label: string;
    desc: string;
    template: string;
    count: number;
    rewardGold: number;
    rewardItems: Array<{ id: string; qty: number }>;
};

export const BOUNTIES: Bounty[] = [
    { id: "slime_cull", label: "슬라임 소탕", desc: "마을 주변 슬라임 5마리", template: "slime", count: 5, rewardGold: 120, rewardItems: [{ id: "health_potion", qty: 1 }] },
    { id: "orc_cull", label: "오크 토벌", desc: "언덕의 오크 4마리", template: "orc", count: 4, rewardGold: 200, rewardItems: [{ id: "iron_ore", qty: 1 }] },
    { id: "zombie_cull", label: "좀비 정화", desc: "서부 숲 좀비 4마리", template: "zombie", count: 4, rewardGold: 260, rewardItems: [{ id: "tree_sap", qty: 2 }] },
    { id: "witch_hunt", label: "마녀 추격", desc: "북부 숲 마녀 3마리", template: "witch", count: 3, rewardGold: 380, rewardItems: [{ id: "frost_moss", qty: 2 }] },
    { id: "ninja_hunt", label: "그림자 사냥", desc: "수변 지구 닌자 3마리", template: "ninja", count: 3, rewardGold: 450, rewardItems: [{ id: "silver_ore", qty: 1 }] },
    { id: "mage_cull", label: "마물 술사 처치", desc: "마법사 마물 3마리", template: "mage", count: 3, rewardGold: 220, rewardItems: [{ id: "mana_crystal", qty: 2 }] },
    { id: "slime_mass", label: "슬라임 대량 소탕", desc: "슬라임 12마리", template: "slime", count: 12, rewardGold: 320, rewardItems: [{ id: "golden_herb", qty: 1 }] },
    { id: "core_hunt", label: "결정 수집가", desc: "아무 마물 10마리", template: "*", count: 10, rewardGold: 300, rewardItems: [{ id: "monster_core", qty: 2 }] },
];
```

- [ ] **Step 2: fieldSlice — killCounts**

```ts
    /** 템플릿별 누적 처치 수 (+ 의뢰 기준점 `bounty_${id}_base`) — 세이브 영속 */
    killCounts: {} as Record<string, number>,

    addKill: (template: string) =>
        set((s: any) => ({
            killCounts: {
                ...s.killCounts,
                [template]: (s.killCounts[template] ?? 0) + 1,
                "*": (s.killCounts["*"] ?? 0) + 1,
            },
        })),
```

- [ ] **Step 3: turnSlice — 카운트 + 영속**

`exitBattle`의 victory 분기에서 defeated 플래그 처리 부근에 추가:

```ts
                enemiesInCombat(s).forEach((e: any) => {
                    if (e.template) get().addKill(e.template);
                });
```

`snapshot()` 반환에 `counters: s.killCounts,` 추가. `applySave`에 `killCounts: (d as any).counters ?? {},` 추가. RpgTypes SaveV1에:

```ts
    /** 처치 카운트/의뢰 기준점 (v1 후기 추가 — 없으면 빈 객체) */
    counters?: Record<string, number>;
```

- [ ] **Step 4: uiSlice — bountyOpen** (smithOpen과 동일 패턴, `toggleBounty`)

- [ ] **Step 5: BountyBoard.tsx**

FieldFlag 골격(스냅/근접/E) 재사용. 위치 `{ x: 16.5, y: -33.25, z: -13 }`(광장, 상인 옆). 외형: 나무 게시판(박스 2개 — 기둥+판) + 근접 Html "E: 의뢰판 📋". E → 오버레이 가드 후 `exitPointerLock` + `toggleBounty()`.

- [ ] **Step 6: BountyPanel.tsx**

ShopPanel 골격. 각 의뢰 행:

```tsx
// 상태 판정: base = killCounts[`bounty_${b.id}_base`]
//  - base 미존재 → "수락" 버튼 (killCounts[bounty_..._base] = 현재 누적치 기록)
//  - 존재 → 진행도 = (killCounts[b.template] ?? 0) - base
//      진행도 >= count → "보상 받기" (gold+items 지급, base 키 삭제 → 재수락 가능)
//      아니면 "진행 중 n/count"
```

- 수락/기준점 기록·해제는 `useGame.setState`로 killCounts를 직접 갱신.
- 보상: `gainGold`, `addItem`, `spawnPopup("📋 {label} 완료!")`.

- [ ] **Step 7: 마운트 + 가드** — FieldScene `<BountyBoard />`, RpgGame `<BountyPanel />` + ESC/M/I 가드·미니맵 조건·FieldPlayer 잠금·StoryTriggers 보류에 `bountyOpen` 추가. FullMapPanel에 게시판 📋 마커(고정 좌표) + 범례.

- [ ] **Step 8: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/data/bountyData.ts src/app/games/rpg/presenter/slices/fieldSlice.ts src/app/games/rpg/presenter/slices/turnSlice.ts src/app/games/rpg/types/RpgTypes.ts src/app/games/rpg/field/BountyBoard.tsx src/app/games/rpg/menu/BountyPanel.tsx src/app/games/rpg/presenter/slices/uiSlice.ts src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/container/RpgGame.tsx src/app/games/rpg/field/FieldPlayer.tsx src/app/games/rpg/field/StoryTriggers.tsx src/app/games/rpg/menu/FullMapPanel.tsx
git commit -m "[feat] 사냥 의뢰판 — 반복 토벌 8종, 처치 카운트 영속(counters) + 게시판 UI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 낚시 다중화 + 지도 통합

**Files:**
- Modify: `src/app/games/rpg/field/FishingSpot.tsx` (props화 + 어종 테이블)
- Modify: `src/app/games/rpg/menu/FishingPanel.tsx` (스팟별 어종)
- Modify: `src/app/games/rpg/presenter/slices/uiSlice.ts` (fishingSpotId)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (기존 부두 + GEN_FISHING 3곳)
- Modify: `src/app/games/rpg/menu/FullMapPanel.tsx` (존 라벨 + 🎣 마커)
- Modify: `src/app/games/rpg/ui/MiniMap.tsx` (🎣 마커)

**Interfaces:**
- Produces: `FISHING_SPOTS: Array<{ id; x; y; z; zone?: ZoneId; table: { common: string; rare: string } }>` (gameData 또는 FishingSpot 모듈에서 export), `ui.fishingSpotId: string | null`

- [ ] **Step 1: 스팟 데이터 + FishingSpot props화**

FishingSpot.tsx의 SPOT 상수를 제거하고 props `{ spot }`로 변경. gameData.ts에 추가:

```ts
// ===== 낚시터 — 부두(기존) + 존 물가 3곳 (placementData 도달 검증 좌표) =====
import { GEN_FISHING } from "./placementData"; // (상단 import에 병합)

export const FISHING_SPOTS: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    table: { common: string; rare: string };
}> = [
    { id: "pier", x: 222.5, y: -38.25, z: -18.9, table: { common: "fish_common", rare: "fish_rare" } },
    ...GEN_FISHING.map((f, i) => ({
        id: `z_fish_${f.zone}`,
        x: f.x,
        y: f.y,
        z: f.z,
        table:
            f.zone === "south_coast"
                ? { common: "fish_common", rare: "coral_fish" }
                : { common: "silver_trout", rare: "fish_rare" },
    })),
];
```

- [ ] **Step 2: uiSlice — fishingSpotId**

`toggleFishing`을 `openFishing(spotId: string)`/closeAll 시 null 리셋 구조로 확장:

```ts
    fishingSpotId: null as string | null,
    openFishing: (spotId: string) =>
        set((s: any) => ({ ui: { ...s.ui, fishingOpen: true }, fishingSpotId: spotId })),
```

(기존 `toggleFishing` 호출처(FishingSpot)는 `openFishing(spot.id)`로 교체. closeAll은 ui만 리셋하므로 fishingSpotId는 남아도 무해 — FishingPanel은 fishingOpen일 때만 읽는다.)

- [ ] **Step 3: FishingPanel — 스팟 어종 반영**

결과 지급부에서 `FISHING_SPOTS.find((s) => s.id === fishingSpotId)?.table`을 조회해 `addItem(table.common, catches)` / `addItem(table.rare, 1)`로 교체. 팝업 문구는 MATERIALS 표시명 사용.

- [ ] **Step 4: FieldScene — 다중 마운트**

```tsx
            {FISHING_SPOTS.map((sp) => (
                <FishingSpot key={sp.id} spot={sp} />
            ))}
```

- [ ] **Step 5: 지도 통합**

- FullMapPanel: `FISHING_SPOTS` 🎣 마커(title=어종) + **존 라벨**: `ZONE_DEFS.map(zd => pct(zd.cx, zd.cz) 위치에 <div className="text-[10px] text-white/50 tracking-widest">{zd.label}</div>)` + 범례에 `· 🎣 낚시터` 추가.
- MiniMap: markers에 `for (const sp of FISHING_SPOTS) markers.push({ x: sp.x, z: sp.z, icon: "🎣" });`

- [ ] **Step 6: tsc + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 28
git add src/app/games/rpg/field/FishingSpot.tsx src/app/games/rpg/menu/FishingPanel.tsx src/app/games/rpg/presenter/slices/uiSlice.ts src/app/games/rpg/data/gameData.ts src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/menu/FullMapPanel.tsx src/app/games/rpg/ui/MiniMap.tsx
git commit -m "[feat] 낚시터 4곳(존 물가)·어종 확장(은빛송어/산호어) + 전체지도 존 라벨·🎣 마커

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 최종 검증

- [ ] **Step 1:** `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ 28, `git status --short` 에 태스크 외 변경 없음.
- [ ] **Step 2 (컨트롤러 수행):** 헤드리스 스팟체크 — 신규 깃발 4곳 requestTeleport 착지(y가 데이터 ±1.5), 존 1곳 걷기 샘플, 요리 1회(pendingBuffs 등록→전투 진입 시 statusEffects 반영 확인), 의뢰 수락→킬 카운트 증가 확인(콘솔).
- [ ] **Step 3:** 최종 전체 브랜치 리뷰(SDD 프로세스) 후 잔여 이슈 수정.
