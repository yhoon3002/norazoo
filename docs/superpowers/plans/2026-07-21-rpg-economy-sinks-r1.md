# 경제 싱크 1라운드 (제련 확장·연금·만찬) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제련 +4/+5(에필로그 해금)·연금 소모품 3종(조합 탭)·영구 만찬(상한제 성장)으로 dead-end 재료 6종과 무한 골드에 반복 소비처를 만든다.

**Architecture:** 신규 슬라이스·오버레이 없음 — gameData 파생 루프 확장, ShopPanel 탭 2개 추가(조합/만찬), SmithPanel 티어 상수화, battleActionsSlice에 elixir 효과 분기, playerSlice에 feastStat 액션 1개. 영속은 기존 SaveV1 필드(party.baseStats, counters=killCounts)만 사용해 세이브 포맷 무변경.

**Tech Stack:** Next.js + React Three Fiber + zustand slice 패턴. 테스트 러너 없음.

## Global Constraints

- `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ **27** (기존 베이스라인, 터치 파일 신규 에러 0)
- 스펙: `docs/superpowers/specs/2026-07-21-rpg-economy-sinks-r1-design.md` — 수치(배율 1.75/2.05, 비용 1200/2500G, FEAST_GOLD [300,600,900,1200,1500], elixir 재료·가격)는 스펙 값 그대로
- 표시명 기준은 `MenuUI.tsx`(MATERIALS/CONSUMABLES) — 로컬 맵(ShopPanel/SmithPanel MATERIAL_NAMES)에 동일 표기로 추가
- 세이브 포맷(SaveV1) 변경 금지 — 만찬 횟수는 `killCounts["feast_${stat}"]` 네임스페이스 키
- 커밋 메시지 한국어 `[feat]`/`[fix]` 규약, main 직행

---

### Task 1: 제련 +4/+5 확장 (에필로그 해금)

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts:428-452` (UPGRADE_MULT/UPGRADE_COSTS/파생 루프)
- Modify: `src/app/games/rpg/menu/SmithPanel.tsx` (티어 하드코딩 3곳 + 에필로그 게이트 + MATERIAL_NAMES)

**Interfaces:**
- Consumes: `stageAtLeast(current, target)` — `data/storyData.ts` export (사용례: `field/Boatman.tsx`의 `stageAtLeast(stage, "ch5_gorge")`)
- Produces: `UPGRADE_MULT.length === 5`, `UPGRADE_COSTS.length === 5`, EQUIPMENT에 `_p4`/`_p5` id 자동 파생 (Task 4 검증이 의존)

- [ ] **Step 1: gameData.ts 확장**

```ts
export const UPGRADE_MULT = [1.15, 1.3, 1.5, 1.75, 2.05];
export const UPGRADE_COSTS: Array<{ needs: Array<{ id: string; qty: number }>; gold: number }> = [
    { needs: [{ id: "iron_ore", qty: 2 }], gold: 100 },
    { needs: [{ id: "iron_ore", qty: 3 }, { id: "monster_core", qty: 1 }], gold: 250 },
    { needs: [{ id: "silver_ore", qty: 2 }, { id: "monster_core", qty: 2 }], gold: 600 },
    { needs: [{ id: "dark_crystal", qty: 2 }, { id: "orc_tusk", qty: 2 }], gold: 1200 },
    { needs: [{ id: "dark_crystal", qty: 3 }, { id: "orc_tusk", qty: 3 }], gold: 2500 },
];
```

파생 루프 `for (let n = 1; n <= 3; n++)` → `for (let n = 1; n <= UPGRADE_MULT.length; n++)` (매직넘버 제거). 주석 `(+1~+3)` → `(+1~+5)`.

- [ ] **Step 2: SmithPanel.tsx 수정**

파일 상단에 추가:
```ts
import { stageAtLeast } from "../data/storyData";
const MAX_UPGRADE = UPGRADE_COSTS.length; // 5
```
수정 3곳 + 게이트:
1. `upgradeInfo` 정규식: `/^(.*)_p([123])$/` → `/^(.*)_p([1-5])$/`
2. `upgrade()`: `if (level >= 3) return;` → `if (level >= MAX_UPGRADE) return; if (level >= 3 && !stageAtLeast(useGame.getState().story.stage, "epilogue")) return;`
3. 렌더: `const maxed = level >= 3;` → `const maxed = level >= MAX_UPGRADE;` 그리고 컴포넌트에서 `const stage = useGame((s) => s.story.stage);` 구독 후, `const locked = !maxed && level >= 3 && !stageAtLeast(stage, "epilogue");` — `locked`면 강화 버튼 대신 `최대 강화` span 스타일 재사용으로 `💤 대장장이가 깨어나면 +4 강화가 열린다` 표시.
4. `MATERIAL_NAMES`에 `dark_crystal: "암흑 수정"`, `orc_tusk: "오크 엄니"` 추가 — 먼저 `MenuUI.tsx` MATERIALS의 실제 표기를 확인해 동일하게(다르면 MenuUI 표기를 따른다).

- [ ] **Step 3: 검증** — `npx tsc --noEmit 2>&1 | grep -c "error TS"` = 27. `node -e`로 데이터 확인:
```bash
# next 환경 밖에서 ts 실행이 안 되므로 tsc 통과 + grep으로 확인
grep -c "_p5" src/app/games/rpg/data/gameData.ts   # 0 (파생은 런타임) — 대신 UPGRADE_MULT 길이 확인
grep "1.75, 2.05" src/app/games/rpg/data/gameData.ts # 1줄 매치
```

- [ ] **Step 4: Commit** — `[feat] 제련 +4/+5 확장 — 에필로그 대장장이 각성 해금, 암흑 수정·오크 엄니 소비`

---

### Task 2: 연금 소모품 (조합 탭 + 전투 효과)

**Files:**
- Create: `src/app/games/rpg/data/alchemyData.ts`
- Modify: `src/app/games/rpg/menu/ShopPanel.tsx` (탭 union + craft 탭 + craft())
- Modify: `src/app/games/rpg/presenter/slices/battleActionsSlice.ts:245-259` (selectItem 즉시소비 폴백 앞 분기)
- Modify: `src/app/games/rpg/menu/MenuUI.tsx` (CONSUMABLES 3종), `src/app/games/rpg/data/gameData.ts` (ITEM_PRICES 3종)

**Interfaces:**
- Consumes: `cook()` 규약(ShopPanel.tsx:57-76 — fresh 재검증→차감), `applyStatusEffect(targetId, {type,duration,value})`(statusSlice.ts:8), `gainEther(charId, n)`(playerSlice.ts), 전투 아이템 필터 `b.id.includes("elixir")`(battleActionsSlice.ts:78-83, 수정 불필요)
- Produces: 아이템 id `ether_elixir`/`war_elixir`/`guard_elixir` (Task 4 검증이 의존)

- [ ] **Step 1: alchemyData.ts 생성** — 스펙 §② 코드 그대로:

```ts
// rpg/data/alchemyData.ts — 조합(연금) 레시피: 재료+골드 → 전투 소모품
export type AlchemyRecipe = {
    id: string; // 전투 메뉴 필터(id.includes("elixir"))를 위해 반드시 "elixir" 포함
    name: string;
    icon: string;
    desc: string;
    needs: Array<{ id: string; qty: number }>;
    gold: number;
};
export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
    { id: "ether_elixir", name: "에테르 정수", icon: "💠", desc: "파티 전원 에테르 +2 (전투 중 사용)",
      needs: [{ id: "mana_crystal", qty: 2 }], gold: 50 },
    { id: "war_elixir", name: "용맹의 비약", icon: "⚔️", desc: "사용자 공격 +20% (이번 전투 동안)",
      needs: [{ id: "tree_sap", qty: 2 }, { id: "frost_moss", qty: 1 }], gold: 80 },
    { id: "guard_elixir", name: "수호의 비약", icon: "🛡️", desc: "사용자 방어 +20% (이번 전투 동안)",
      needs: [{ id: "frost_moss", qty: 2 }, { id: "tree_sap", qty: 1 }], gold: 80 },
];
```

- [ ] **Step 2: ShopPanel 조합 탭** — `useState<"buy" | "sell" | "cook">` → `<"buy" | "sell" | "cook" | "craft">`, 탭 버튼 "조합 ⚗️" 추가(요리 버튼 마크업 복제), `{tab === "craft" && ...}` 블록은 cook 탭 렌더 복제(레시피 카드: 아이콘·이름·desc·재료 목록·골드). `craft()`:

```ts
const craft = (r: AlchemyRecipe) => {
    const s = useGame.getState() as any;
    const fresh = useGame.getState();
    const ok =
        fresh.player.gold >= r.gold &&
        r.needs.every((n) => (fresh.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >= n.qty);
    if (!ok) return;
    useGame.setState((st: any) => {
        let bag = [...st.bag];
        for (const n of r.needs)
            bag = bag
                .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                .filter((b: any) => b.qty > 0);
        return { bag, player: { ...st.player, gold: st.player.gold - r.gold } };
    });
    s.addItem(r.id, 1);
    s.spawnPopup({ side: "ally", text: `${r.icon} ${r.name} 제작!`, color: "#a78bfa" });
};
```
재료 표시는 ShopPanel 기존 `displayName()` 사용 — `MATERIAL_NAMES`에 `mana_crystal`/`tree_sap`/`frost_moss` 표기가 없으면 MenuUI 표기로 추가.

- [ ] **Step 3: 전투 효과 분기** — battleActionsSlice `selectItem`의 "즉시 소비" 폴백(245-259행) **앞에**, 폴백과 동일한 bag 차감·`triggerFX("player", 1.2)`·450ms 후 `endPlayerTurn()` 골격으로 id 분기 추가:

```ts
if (id === "ether_elixir") {
    for (const c of s.player.party) if ((c.stats?.hp ?? 0) > 0) get().gainEther(c.id, 2);
}
if (id === "war_elixir" || id === "guard_elixir") {
    const actor = s.player.party.find((c: any) => c.id === actorId);
    const key = id === "war_elixir" ? "atk" : "def";
    get().applyStatusEffect(actorId, {
        type: id === "war_elixir" ? "buff_atk" : "buff_def",
        duration: 99, // 사실상 전투 전체 (턴당 -1)
        value: Math.round(((actor?.stats as any)?.[key] ?? 0) * 0.2),
    });
}
```
기존 3종 분기(health/mana potion targetSelect)는 건드리지 않는다. 폴백의 차감·FX·턴종료 코드가 이 분기들 뒤에도 실행되도록 배치(분기 후 return하지 말 것 — 실제 폴백 구조를 읽고 자연스럽게 통합).

- [ ] **Step 4: 표시명·가격** — MenuUI CONSUMABLES에 `ether_elixir: { name: "에테르 정수", effect: "전원 에테르 +2" }`, `war_elixir: { name: "용맹의 비약", effect: "전투 중 공격 +20%" }`, `guard_elixir: { name: "수호의 비약", effect: "전투 중 방어 +20%" }`. gameData ITEM_PRICES에 `ether_elixir: 60, war_elixir: 90, guard_elixir: 90`. SHOP_STOCK에는 추가하지 않는다.

- [ ] **Step 5: 검증+Commit** — tsc 27 유지. `[feat] 연금 소모품 — 조합 탭(에테르 정수·용맹/수호 비약)·전투 효과`

---

### Task 3: 요리사 영구 만찬

**Files:**
- Modify: `src/app/games/rpg/data/recipeData.ts` (FeastDef/FEAST_DEFS/FEAST_GOLD/FEAST_MAX — 스펙 §③ 코드 그대로)
- Modify: `src/app/games/rpg/presenter/slices/playerSlice.ts` (feastStat 액션)
- Modify: `src/app/games/rpg/menu/ShopPanel.tsx` (만찬 탭 + feast())

**Interfaces:**
- Consumes: `calculateStats`(playerSlice 내부 비공개 — 액션도 playerSlice에), killCounts 영속 규약(fieldSlice killCounts ↔ SaveV1.counters, turnSlice snapshot:534/applySave:512)
- Produces: `feastStat(stat: "maxHp"|"atk"|"def"|"speed", delta: number)`, killCounts 키 `feast_${stat}` (Task 4 검증이 의존)

- [ ] **Step 1: recipeData.ts에 스펙 §③의 FeastDef/FEAST_DEFS/FEAST_GOLD/FEAST_MAX를 그대로 추가** (스펙 코드 블록 verbatim 전사)

- [ ] **Step 2: playerSlice.ts feastStat 액션** — gainExp 아래에:

```ts
// 만찬: 파티 전원 baseStats[stat] += delta 후 재파생.
// 성장은 반드시 baseStats에 — 파생 stats에 더하면 calculateStats 재계산 시 소실(레벨업 규약 동일).
feastStat: (stat: "maxHp" | "atk" | "def" | "speed", delta: number) =>
    set((s: any) => ({
        player: {
            ...s.player,
            party: s.player.party.map((c: Character) =>
                calculateStats({
                    ...c,
                    baseStats: { ...c.baseStats, [stat]: (c.baseStats as any)[stat] + delta },
                    stats: undefined, // 레벨업과 동일 — 완전 회복
                })
            ),
        },
    })),
```

- [ ] **Step 3: ShopPanel 만찬 탭** — 탭 union에 `"feast"` 추가, 버튼 "만찬 🍖". 카드마다: `const n = killCounts[`feast_${d.stat}`] ?? 0;` (killCounts는 `useGame((s: any) => s.killCounts)` 구독), 비용 `FEAST_GOLD[n]`, `n >= FEAST_MAX`면 버튼 대신 `🏅 최고 경지`. `feast()`:

```ts
const feast = (d: FeastDef) => {
    const s = useGame.getState() as any;
    const fresh = useGame.getState() as any;
    const n = fresh.killCounts[`feast_${d.stat}`] ?? 0;
    if (n >= FEAST_MAX) return;
    const gold = FEAST_GOLD[n];
    const ok =
        fresh.player.gold >= gold &&
        d.needs.every((x: any) => (fresh.bag.find((b: any) => b.id === x.id)?.qty ?? 0) >= x.qty);
    if (!ok) return;
    useGame.setState((st: any) => {
        let bag = [...st.bag];
        for (const x of d.needs)
            bag = bag
                .map((b: any) => (b.id === x.id ? { ...b, qty: b.qty - x.qty } : b))
                .filter((b: any) => b.qty > 0);
        return {
            bag,
            player: { ...st.player, gold: st.player.gold - gold },
            killCounts: { ...st.killCounts, [`feast_${d.stat}`]: n + 1 },
        };
    });
    s.feastStat(d.stat, d.delta);
    s.spawnPopup({ side: "ally", text: `${d.icon} ${d.name}! 파티가 강해졌다`, color: "#fbbf24" });
};
```
재료 표시: `golden_herb`/`fish_rare`/`clam`/`wind_flower`/`forest_mushroom` 표기가 ShopPanel MATERIAL_NAMES에 없으면 MenuUI 표기로 추가.

- [ ] **Step 4: 검증+Commit** — tsc 27 유지. `[feat] 영구 만찬 — 파티 상한제 성장(스탯별 5회, killCounts 영속)`

---

### Task 4: 헤드리스 검증 + 최종 리뷰 (컨트롤러 수행)

- [ ] tsc ≤ 27, `git status` 클린.
- [ ] 헤드리스(puppeteer, 기존 스크립트 패턴): ① 에필로그 주입+재료·골드 주입 → `_p3` 장비 +4→+5 연속 강화(스탯 ×1.75/×2.05 반올림 일치, 재료 차감), 에필로그 미달 시 잠금 문구 확인 ② craft 3종 → bag·골드 반영; 전투 진입 → 아이템 메뉴 3종 노출 → ether_elixir 전원 에테르 +2, war_elixir buff_atk(atk×0.2 반올림) statusEffect 확인 ③ 만찬 1회 → 파티 baseStats 반영·비용 점증·`feast_*` 카운터 증가, 5회 상한 잠금, snapshot→applySave 왕복 후 유지.
- [ ] 최종 전체 브랜치 리뷰(SDD) → 수정 웨이브 → 완료 보고.
