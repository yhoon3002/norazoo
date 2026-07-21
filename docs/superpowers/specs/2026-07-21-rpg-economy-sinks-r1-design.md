# RPG 경제 싱크 1라운드 — 심화 패키지 (제련 확장·연금 소모품·영구 만찬)

## 배경

경제 감사 결과: 골드·재료 유입은 무한(현상금·채집·낚시·전투)인데 소비 상한은 유한(~1만G)이라 엔딩 시점에 싱크가 고갈된다. 재료 23종 중 9종이 용처 0(판매 전용)이며, 특히 `golden_herb`(스토리 최종 보상), `dark_crystal`(협곡 엔드게임 재료), `mana_crystal`(소스 5개)이 잡템이다.

**목표**: 기존 시스템(제련·요리·전투 아이템)을 확장해 dead-end 9종 중 6종에 반복 용처를 만들고, 골드 싱크를 무한 반복형(제련 3.3만G + 만찬 1.8만G+)으로 바꾼다. `driftwood`/`silver_trout`/`coral_fish`는 2라운드(마을 재건: 재봉소·어부 납품)용으로 남긴다.

**전제**: 테스트 러너 없음 — 검증은 `npx tsc --noEmit` 에러 수 ≤ 27(기존 베이스라인) + 헤드리스 puppeteer 시뮬레이션. main 직행 커밋.

---

## ① 제련 +4/+5 확장 — "대장장이 각성" 연동

### 데이터 (`data/gameData.ts`)

기존 파생 루프(gameData.ts:428-452)를 확장한다:

```ts
export const UPGRADE_MULT = [1.15, 1.3, 1.5, 1.75, 2.05];
export const UPGRADE_COSTS: ... = [
    { needs: [{ id: "iron_ore", qty: 2 }], gold: 100 },
    { needs: [{ id: "iron_ore", qty: 3 }, { id: "monster_core", qty: 1 }], gold: 250 },
    { needs: [{ id: "silver_ore", qty: 2 }, { id: "monster_core", qty: 2 }], gold: 600 },
    { needs: [{ id: "dark_crystal", qty: 2 }, { id: "orc_tusk", qty: 2 }], gold: 1200 },  // +3→+4
    { needs: [{ id: "dark_crystal", qty: 3 }, { id: "orc_tusk", qty: 3 }], gold: 2500 },  // +4→+5
];
```

파생 루프의 `for (let n = 1; n <= 3; n++)`를 `n <= 5`로. 세이브 호환: `_pN` id는 모듈 로드 시 재생성되므로 구세이브의 `_p1.._p3` id는 그대로 해석된다(추가만 하므로 무파괴).

### UI (`menu/SmithPanel.tsx`) — 티어 하드코딩 3곳 수정

1. `upgradeInfo`의 정규식 `/^(.*)_p([123])$/` → `/^(.*)_p([1-5])$/`
2. `upgrade()`의 `if (level >= 3) return;` → 최대 티어 상수 `MAX_UPGRADE = UPGRADE_COSTS.length`(=5) 기준. **에필로그 게이트**: `level >= 3 && !stageAtLeast(stage, "epilogue")`이면 return.
3. 렌더의 `const maxed = level >= 3;` → `level >= 5`. 단 `level >= 3 && !에필로그`인 아이템은 강화 버튼 대신 잠금 문구 **"💤 대장장이가 깨어나면 +4 강화가 열린다"** 표시(회색 span, `최대 강화` 스타일 재사용).

- `stageAtLeast`는 `data/storyData.ts` export를 import(사용 예: Boatman.tsx의 ch5_gorge 게이트).
- `MATERIAL_NAMES`(SmithPanel.tsx:7-11)에 추가: `dark_crystal: "암흑 수정"`, `orc_tusk: "오크 엄니"` (MenuUI.tsx MATERIALS의 기존 표기와 동일하게 — 다르면 MenuUI 표기를 따른다).

### 밸런스 결과

9피스(무기/방어구/악세 × 3인) 풀 +5강 시 약 3.3만G + dark_crystal 45 + orc_tusk 45 소비. 협곡 채집(dark_crystal 스팟)·hill 현상금(orc_tusk)이 반복 파밍 목적지가 된다.

---

## ② 연금 소모품 (elixir 라인) — 상점 "조합" 탭

### 데이터 — 신규 파일 `data/alchemyData.ts`

```ts
// rpg/data/alchemyData.ts — 조합(연금) 레시피: 재료+골드 → 전투 소모품
export type AlchemyRecipe = {
    id: string;          // 산출 아이템 id — 전투 메뉴 필터를 위해 반드시 "elixir" 포함
    name: string;
    icon: string;
    desc: string;
    needs: Array<{ id: string; qty: number }>;
    gold: number;
};
export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
    { id: "ether_elixir", name: "에테르 정수", icon: "💠",
      desc: "파티 전원 에테르 +2 (전투 중 사용)",
      needs: [{ id: "mana_crystal", qty: 2 }], gold: 50 },
    { id: "war_elixir", name: "용맹의 비약", icon: "⚔️",
      desc: "사용자 공격 +20% (이번 전투 동안)",
      needs: [{ id: "tree_sap", qty: 2 }, { id: "frost_moss", qty: 1 }], gold: 80 },
    { id: "guard_elixir", name: "수호의 비약", icon: "🛡️",
      desc: "사용자 방어 +20% (이번 전투 동안)",
      needs: [{ id: "frost_moss", qty: 2 }, { id: "tree_sap", qty: 1 }], gold: 80 },
];
```

### 제작 UI (`menu/ShopPanel.tsx`)

- 탭 union `"buy" | "sell" | "cook"`에 `"craft"` 추가, 버튼 라벨 "조합 ⚗️", `{tab === "craft" && ...}` 블록은 cook 탭 렌더 구조 복제.
- `craft(r: AlchemyRecipe)`는 `cook()`(ShopPanel.tsx:57-76)과 동일 규약(fresh 재검증→재료 차감) + **골드 검사·차감 추가**(SmithPanel의 인라인 `gold: st.player.gold - cost.gold` 패턴). 성공 시 `addItem(r.id, 1)` + `spawnPopup({side:"ally", text:`${r.icon} ${r.name} 제작!`, color:"#a78bfa"})`.

### 전투 효과 (`presenter/slices/battleActionsSlice.ts` selectItem)

전투 아이템 메뉴 필터(battleActionsSlice.ts:78-83)는 id의 `"elixir"` 포함으로 자동 노출 — 수정 불필요. 효과는 selectItem의 "Instant Consume Items" 폴백(245-259행) **앞에** id 분기 추가:

- `ether_elixir`: 생존 파티 전원에게 `gainEther(c.id, 2)`.
- `war_elixir`: 사용 캐릭터에게 `applyStatusEffect(actorId, { type: "buff_atk", duration: 99, value: Math.round((actor.stats?.atk ?? 0) * 0.2) })` — 버프 시스템이 가산(flat)이므로 사용 시점 20%를 환산. duration 99 = 사실상 전투 전체(턴당 -1, statusSlice.ts:122-133).
- `guard_elixir`: 동일하게 `buff_def`, `def * 0.2`.

세 경우 모두 기존 폴백과 동일하게 bag 1개 차감 + `triggerFX("player", 1.2)` + 450ms 후 `endPlayerTurn()`. **알려진 제약(수용)**: `applyStatusEffect`는 같은 type 교체(중첩 불가) — 요리 buff_atk(+5, 4턴)와 용맹의 비약은 나중 것이 덮어쓴다. 사용자가 고르는 트레이드오프로 문서화만 한다.

### 표시명·가격

- `MenuUI.tsx` CONSUMABLES에 3종 추가(name + effect 설명), `gameData.ts` ITEM_PRICES에 `ether_elixir: 60`, `war_elixir: 90`, `guard_elixir: 90`(판매가 50% 규약은 기존 로직 그대로). SHOP_STOCK에는 넣지 않는다(제작 전용).

---

## ③ 요리사 영구 만찬 — 상한제 영구 성장

### 데이터 — `data/recipeData.ts`에 추가

```ts
export type FeastDef = {
    stat: "maxHp" | "atk" | "def" | "speed";
    name: string; icon: string; desc: string;
    delta: number;                              // maxHp 5, 나머지 1
    needs: Array<{ id: string; qty: number }>;  // golden_herb×1 + 특산 1종
};
export const FEAST_DEFS: FeastDef[] = [
    { stat: "maxHp", name: "생명의 만찬", icon: "🍖", desc: "파티 전원 최대 HP +5", delta: 5,
      needs: [{ id: "golden_herb", qty: 1 }, { id: "forest_mushroom", qty: 3 }] },
    { stat: "atk", name: "용사의 만찬", icon: "🍱", desc: "파티 전원 공격 +1", delta: 1,
      needs: [{ id: "golden_herb", qty: 1 }, { id: "fish_rare", qty: 1 }] },
    { stat: "def", name: "수호의 만찬", icon: "🥟", desc: "파티 전원 방어 +1", delta: 1,
      needs: [{ id: "golden_herb", qty: 1 }, { id: "clam", qty: 3 }] },
    { stat: "speed", name: "질풍의 만찬", icon: "🍜", desc: "파티 전원 속도 +1", delta: 1,
      needs: [{ id: "golden_herb", qty: 1 }, { id: "wind_flower", qty: 3 }] },
];
export const FEAST_GOLD = [300, 600, 900, 1200, 1500]; // 스탯별 회차 비용 (상한 5회)
export const FEAST_MAX = FEAST_GOLD.length;
```

### 액션 (`presenter/slices/playerSlice.ts`)

`calculateStats`가 slice 내부 비공개이므로 만찬 액션은 playerSlice에 둔다:

```ts
// 만찬: 파티 전원 baseStats[stat] += delta 후 재파생. 성장은 반드시 baseStats에(레벨업 규약 동일).
feastStat: (stat: "maxHp" | "atk" | "def" | "speed", delta: number) =>
    set((s: any) => ({
        player: {
            ...s.player,
            party: s.player.party.map((c: Character) =>
                calculateStats({
                    ...c,
                    baseStats: { ...c.baseStats, [stat]: (c.baseStats as any)[stat] + delta },
                    stats: undefined, // 레벨업과 동일 — 완전 회복(만찬의 보너스 체감)
                })
            ),
        },
    })),
```

### 횟수 영속 — killCounts 네임스페이스 재사용

만찬 횟수는 `killCounts[`feast_${stat}`]`로 저장한다. killCounts는 이미 비처치 키(`bounty_${id}_base`)를 담는 관례가 있고 SaveV1.counters로 영속되므로 **세이브 포맷 변경이 전혀 없다**. 증가는 ShopPanel에서 `useGame.setState((st) => ({ killCounts: { ...st.killCounts, [key]: n + 1 } }))`.

### UI (`menu/ShopPanel.tsx`)

- 탭 union에 `"feast"` 추가, 버튼 "만찬 🍖". 각 FEAST_DEF 카드에: 현재 회차 `n/5`, 이번 비용(`FEAST_GOLD[n]`G + 재료), 파티 적용 효과. `n >= FEAST_MAX`면 "🏅 최고 경지" 표시.
- `feast(def)`는 cook() 규약(fresh 재검증) + 골드 검사·차감 + 재료 차감 + `feastStat(def.stat, def.delta)` + killCounts 증가 + `spawnPopup({side:"ally", text:`${def.icon} ${def.name}! 파티가 강해졌다`, color:"#fbbf24"})`. 더블클릭 이중 지급 방지: 차감·검증을 단일 `setState` 흐름에서 fresh 상태로 재확인(기존 cook/claim 규약).
- 스테이지 게이트 없음(재료·골드가 자연 게이트).

### 밸런스 결과

4스탯 완주 = 20회: 골드 18,000 + golden_herb 20 + 특산 재료(숲버섯/월광어/조개/바람꽃). 파티 최종 +HP25/공5/방5/속5 — 상한제로 밸런스 붕괴 없음. golden_herb 전용 스폰(GOLDEN_HERB_SPOTS)·현상금 보상이 포스트게임 파밍 루트가 된다.

---

## 통합 규약 (전 태스크 공통)

- 표시명 맵 3곳 동기화: 신규 아이템/재료 표기는 `MenuUI.tsx`(CONSUMABLES/MATERIALS)가 기준이며, `ShopPanel.tsx`·`SmithPanel.tsx`의 로컬 맵에 동일 표기로 추가한다.
- 신규 오버레이 없음 — 전부 기존 ShopPanel/SmithPanel 내부 확장이라 uiSlice/6개 배선 지점 변경 불필요.
- `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ 27, 터치 파일 신규 에러 0.

## 검증 계약 (헤드리스 puppeteer)

1. **제련**: 에필로그 스테이지 주입 + 재료·골드 주입 → `_p3` 장비를 +4→+5 연속 강화, 스탯 ×1.75/×2.05 반올림 일치·재료 차감 확인. 에필로그 미달 시 +4 버튼 부재(잠금 문구) 확인.
2. **연금**: 재료·골드 주입 → craft 3종 → bag 반영·골드 차감 확인. 전투 진입 → 아이템 메뉴에 3종 노출 → ether_elixir 사용 시 전원 에테르 +2, war_elixir 사용 시 buff_atk(= atk×0.2 반올림) statusEffect 부여 확인.
3. **만찬**: 골드·재료 주입 → 만찬 1회 → 파티 전원 baseStats 반영·비용 점증(300→600)·killCounts `feast_*` 증가 확인. 5회 도달 시 버튼 잠금. 세이브 스냅샷→applySave 왕복 후 스탯·회차 유지 확인.
