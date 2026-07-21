# 콘텐츠 풍성화 웨이브1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스킬 7→18(레벨 언락)·장비 9→20·연금 3→9·요리 6→12·낚시터 4→8·존 보강으로 게임 전반의 종류·요소를 배가한다.

**Architecture:** 전부 기존 데이터 파일 확장 + 훅 2곳(getAvailableSkills 레벨 언락, resolvePlayerAction 버프 statusEffect 부여) + 전투 아이템 분기 확장. 신규 슬라이스·오버레이·세이브 변경 없음.

**Tech Stack:** Next.js + R3F + zustand slices. 테스트 러너 없음.

## Global Constraints

- **스펙이 단일 진실**: `docs/superpowers/specs/2026-07-21-rpg-enrichment-w1-design.md` — 스킬/장비/연금/요리/좌표 표의 id·이름·수치를 **verbatim** 사용.
- `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ **27**, 터치 파일 신규 에러 0.
- 표시명 3맵 동기화(MenuUI.tsx가 기준 — ShopPanel/SmithPanel/FishingPanel 로컬 맵 동일 표기).
- 모든 신규 아이템/장비에 ITEM_PRICES 필수(없으면 매매 불가·파생가 결손).
- 스킬 조회는 name 기반(`Object.values(SKILLS).find(x.name === label명)`) — **이름 중복 금지**.
- 세이브 포맷(SaveV1) 변경 금지.
- 커밋 한국어 `[feat]` 규약, main 직행.

---

### Task 1: 스킬 시스템 — 레벨 언락 + 버프 훅 + 18종

**Files:**
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (Skill에 `character?: PartyId; unlockLevel?: number;` — PartyId import 확인)
- Modify: `src/app/games/rpg/data/gameData.ts` (SKILLS 7종 한국어화 + 11종 추가, SKILL_ANIMATIONS 매핑)
- Modify: `src/app/games/rpg/presenter/slices/playerSlice.ts:35-44` (getAvailableSkills)
- Modify: `src/app/games/rpg/presenter/slices/turnSlice.ts:234-284` (heal/buff 분기 statusEffect 훅)

**Interfaces:**
- Consumes: `applyStatusEffect(targetId, {type,duration,value})`(statusSlice), `spawnPopup`, SKILLS 실행 경로(변경 불필요 — 광역 공격 경로 완비).
- Produces: SKILLS에 `arin_whirl` 등 11개 id(스펙 §① 표 verbatim). Task 5 검증이 의존.

- [ ] **Step 1: RpgTypes Skill 확장** — 스펙 §① 타입 블록 그대로 두 필드 추가.
- [ ] **Step 2: getAvailableSkills 확장** — 기존 합집합 뒤에 스펙의 레벨 언락 루프 추가:
```ts
Object.values(SKILLS).forEach((sk) => {
    if (sk.character === character.id && character.level >= (sk.unlockLevel ?? 1))
        ids.add(sk.id);
});
```
(SKILLS import 필요 여부 확인 — playerSlice가 이미 EQUIPMENT를 import하는 구문 옆에 추가.)
- [ ] **Step 3: turnSlice 버프 훅** — resolvePlayerAction heal/buff 분기에서 대상 id 배열 확정 직후:
```ts
if (sk.statusEffect) {
    for (const tid of targetIdList) {
        get().applyStatusEffect(tid, sk.statusEffect);
        get().spawnPopup({ side: "ally", charId: tid, text: `${sk.statusEffect.type}!`, color: "#a78bfa" });
    }
}
```
`sk.damage === 0`이면 기존 힐 수치 팝업/HP 가산은 생략(0 힐 방지). all 분기와 single/self 분기 모두 커버할 것.
- [ ] **Step 4: SKILLS 데이터** — 기존 7종 name/description 한국어화(스펙 §① 이름 그대로), 신규 11종 추가(스펙 표 verbatim — id/character/unlockLevel/type/targetType/damage/etherCost/statusEffect/element). description은 이름·효과에 맞는 한국어 1문장. SKILL_ANIMATIONS에 11종 매핑(physical→"skill1", 나머지→"skill2").
- [ ] **Step 5: 검증+Commit** — tsc 27. `[feat] 전투 스킬 18종 — 캐릭터별 레벨 언락·광역기·버프기(한국어화 포함)`

---

### Task 2: 장비 11종 + 상점/보물 배치

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts` (EQUIPMENT 11종 + ITEM_PRICES 11종 + SHOP_STOCK 5종)
- Modify: `src/app/games/rpg/data/zoneContent.ts` (6개 존 treasureLoot 첫 배열에 장비 1개씩)

**Interfaces:**
- Consumes: EQUIPMENT 파생 루프(자동 `_p1.._p5`), 보물 지급 경로(id 무관 addItem — 선례 있음).
- Produces: 장비 id 11종(스펙 §② 표 verbatim). Task 5 검증이 의존.

- [ ] **Step 1: EQUIPMENT 11종 추가** — 스펙 §② 표 verbatim(id/name/type/rarity/stats/skills). name은 표의 한국어 이름 그대로(기존 항목은 영어 name 유지 — 변경 금지).
- [ ] **Step 2: ITEM_PRICES 11종 + SHOP_STOCK 5종** — 스펙 가격 그대로. SHOP_STOCK 추가 순서는 배열 말미.
- [ ] **Step 3: 보물 배치** — zoneContent.ts에서 west_forest→chef_apron, gorge→dragon_scale, hill→hunter_ring, ne_water→sage_pendant, north_woods→clock_staff, south_coast→chef_blade — 각 존 treasureLoot **인덱스 0 배열**에 `{ id, qty: 1 }` 추가(기존 항목 유지).
- [ ] **Step 4: 검증+Commit** — tsc 27. `[feat] 장비 11종 — 액세서리·에픽 방어구·캐릭터 무기(상점 5·존 보물 6 배치)`

---

### Task 3: 연금 6종 + 요리 6종 + 전투 아이템 분기

**Files:**
- Modify: `src/app/games/rpg/data/alchemyData.ts` (ALCHEMY_RECIPES 6종 추가)
- Modify: `src/app/games/rpg/data/recipeData.ts` (RECIPES 6종 추가)
- Modify: `src/app/games/rpg/presenter/slices/battleActionsSlice.ts` (selectItem 분기: revive targetSelect + instant 4종)
- Modify: `src/app/games/rpg/presenter/slices/bagSlice.ts` (useItem revive 분기)
- Modify: `src/app/games/rpg/menu/MenuUI.tsx` (CONSUMABLES 6종 + BATTLE_ONLY_CONSUMABLES 6종 + MATERIALS 확인)
- Modify: `src/app/games/rpg/data/gameData.ts` (ITEM_PRICES 6종)

**Interfaces:**
- Consumes: 기존 elixir instant 분기 선례(:245-257), health_potion targetSelect 분기(:222-243), `applyDamage`/`applyStatusEffect`/`aliveEnemies`.
- Produces: 아이템 id 6종(스펙 §③ 표 verbatim). Task 5 검증이 의존.

- [ ] **Step 1: 데이터** — ALCHEMY_RECIPES/RECIPES에 스펙 §③ 두 표 verbatim 추가(재료·골드·버프 수치 그대로).
- [ ] **Step 2: revive_elixir** — selectItem에 targetSelect 분기(health_potion 분기 복제, `allowedTargets`를 `c.stats.hp <= 0`인 파티원으로, 없으면 playerMenu 복귀). bagSlice.useItem에:
```ts
if (id === "revive_elixir" && targetId) {
    // 사망 아군 부활 — HP 50%
    return {
        bag,
        player: { ...s.player, party: s.player.party.map((c: any) =>
            c.id === targetId && c.stats.hp <= 0
                ? { ...c, stats: { ...c.stats, hp: Math.round(c.stats.maxHp * 0.5) } }
                : c
        ) },
    };
}
```
(기존 분기들의 bag 차감 구조를 정확히 따를 것 — useItem 상단의 공통 차감 확인.)
- [ ] **Step 3: instant 4종 분기** — 기존 elixir 분기 옆에 스펙 §③ "전투 분기 구현" 항목대로: purify(파티 statusEffects 필터), blast(aliveEnemies 각 applyDamage 60 + 팝업), frost(각 applyStatusEffect freeze 1턴), swift/vital(사용자 statusEffect). 기존 폴백의 차감·FX·턴종료 공유(이중 차감 금지, early return 금지).
- [ ] **Step 4: 표시명/가격/필드 차단** — ITEM_PRICES(스펙 가격), MenuUI CONSUMABLES 6종(name+effect), BATTLE_ONLY_CONSUMABLES에 6종 추가. ShopPanel MATERIAL_NAMES에 새 재료 표기 필요 시 MenuUI 기준 추가.
- [ ] **Step 5: 검증+Commit** — tsc 27. `[feat] 연금 6종(부활·정화·폭염·서리·신속·활력)+요리 6종 — 전투 아이템 확장`

---

### Task 4: 존 보강 + 낚시 확장

**Files:**
- Modify: `src/app/games/rpg/data/placementData.ts` (GEN_ROAMERS.hill +3 / .north_woods +2, GEN_GATHER.gorge +4, GEN_FISHING +4 — 스펙 §④ 좌표 블록 verbatim)
- Modify: `src/app/games/rpg/data/zoneContent.ts` (west_forest 팩 `["ghoul","ghoul","slime"]` → `["mage","ghoul"]`)
- Modify: `src/app/games/rpg/data/gameData.ts` (FISHING_SPOTS 삼항 → ZONE_FISH_TABLE 맵(스펙 §④ verbatim), ITEM_PRICES 어종 4종)
- Modify: `src/app/games/rpg/menu/FishingPanel.tsx` (FISH_NAMES 4종), `src/app/games/rpg/menu/MenuUI.tsx` (MATERIALS 4종)

**Interfaces:**
- Consumes: GEN_* 소비 루프(fieldId `z_{zone}_r{i}` 자동), FISHING_SPOTS `z_fish_${zone}` id 규약.
- Produces: FIELD_ENEMIES `z_hill_r0..r3`/`z_north_woods_r0..r4`, FIELD_GATHERABLES `z_gorge_g8..g11`, FISHING_SPOTS `z_fish_hill/north_woods/gorge/town`. 어종 id: wind_trout/ice_fish/deep_fish/gold_carp.

- [ ] **Step 1: placementData 좌표 추가** — 스펙 §④ 코드 블록 verbatim(기존 배열 말미에 append — 순서 변경 금지: fieldId 인덱스가 세이브 defeated_/gather_ 플래그와 결합).
- [ ] **Step 2: zoneContent mage 교체 + gameData 어종 테이블** — 스펙 §④ ZONE_FISH_TABLE 그대로. **기존 3존(ne_water/south_coast/west_forest) 테이블 결과가 이전과 동일함을 diff로 확인**(회귀 금지).
- [ ] **Step 3: 어종 가격·표기** — ITEM_PRICES(wind_trout 30, ice_fish 35, deep_fish 45, gold_carp 120), FISH_NAMES(바람송어/빙어/심연어/황금잉어), MenuUI MATERIALS 동일 표기.
- [ ] **Step 4: 검증+Commit** — tsc 27. `[feat] 존 보강 — hill 로머 4스폰·낚시터 4곳·어종 4종·gorge 채집 12·mage 필드 등장`

---

### Task 5: 헤드리스 검증 + 최종 리뷰 (컨트롤러 수행)

- [ ] tsc ≤ 27, `git status` 클린.
- [ ] 헤드리스(스펙 §검증 계약 4항목): 스킬(레벨 주입→언락 노출·광역·버프 statusEffect·poison 틱), 장비(상점 구매·장착 스탯·보물 획득·`_p4` 존재), 연금/요리(제작·blast/frost/revive 전투 동작·요리 버프 적용), 존/낚시(스폰·채집 수·신규 낚시터 4곳 어획·기존 테이블 불변).
- [ ] 최종 전체 브랜치 리뷰(SDD) → 수정 웨이브 → 완료 보고.
