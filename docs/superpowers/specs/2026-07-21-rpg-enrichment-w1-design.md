# 콘텐츠 풍성화 웨이브1 — 스킬·장비·연금/요리·존 보강

## 배경/목표

콘텐츠 전수조사 결과 가장 얇은 곳이 플레이어 최다 접점(전투 스킬 7종 고정·광역 0, 액세서리 2, 연금 3, hill 존 로머 스폰 1)이었다. 웨이브1은 **데이터 확장 중심**으로: 스킬 7→18(캐릭터별 레벨 언락), 장비 9→20, 연금 3→9, 요리 6→12, 낚시터 4→8·어종 4→8, hill/north_woods/gorge 존 보강, mage 필드 등장. 웨이브2(사이드퀘 5건·상점 단계 해금)는 별도 스펙.

**전제**: 테스트 러너 없음 — tsc ≤ 27 + 헤드리스 검증. main 직행. 표시명 기준은 MenuUI(3맵 동기화 규약).

**확인된 기반 사실**: Skill 타입에 `targetType: "single"|"all"|"self"`·`statusEffect` 이미 존재, **광역 공격 실행 경로 완비**(selectSkill이 공격형 all의 targetIds를 적으로 채우고 resolvePlayerAction turnSlice.ts:351-357의 all 분기가 처리 — 데이터만 없음). 버프형 스킬은 heal 분기로 흘러 statusEffect가 **부여되지 않음**(턴슬라이스 :234-284에 훅 필요). 스킬 조회는 name 기반(`label.split("  [")[0]` → `find(x.name === name)`) — 이름 유니크 필수. 장비는 착용 제한 모델 없음, EQUIPMENT 추가 시 `_p1.._p5`·가격 자동 파생. 보물은 장비 id 지급 가능(선례 있음).

---

## ① 스킬 7→18 — 캐릭터 전용 + 레벨 언락 (+기존 7종 한국어화)

### 타입 확장 (`types/RpgTypes.ts` Skill)

```ts
/** 전용 캐릭터 — 지정 시 해당 캐릭터만 습득 */
character?: PartyId;
/** 습득 레벨 — 지정 시 해당 레벨부터 자동 습득 (기본 1) */
unlockLevel?: number;
```

### getAvailableSkills 확장 (`playerSlice.ts:35-44`)

기존 `character.skills ∪ 장비 skills`에 **레벨 언락 풀 추가**:

```ts
Object.values(SKILLS).forEach((sk) => {
    if (sk.character === character.id && character.level >= (sk.unlockLevel ?? 1))
        ids.add(sk.id);
});
```

### 버프형 스킬 statusEffect 훅 (`turnSlice.ts` resolvePlayerAction :234-284)

heal/buff 분기에서 대상 확정 후:
- `sk.statusEffect`가 있으면 각 대상에게 `applyStatusEffect(targetId, sk.statusEffect)` + 팝업 `${type}!`(기존 데미지 분기 :332-340과 동일 형식, side "ally").
- `sk.damage === 0`(순수 버프)이면 힐 수치 팝업(`+0`)은 생략.

### 기존 7종 한국어화 (name만 변경 — 조회는 name 기반이라 데이터 내부 일관 변경으로 안전)

Slash→**베기**, Fireball→**화염구**, Heal→**치유**, Lightning Strike→**낙뢰**, Ice Shard→**얼음 조각**, Guard Break→**철갑 부수기**, Group Heal→**집단 치유**. description도 한국어로.

### 신규 11종 (SKILLS 추가 — id/이름/언락/스펙 verbatim)

| id | 이름 | character/lv | type/target | damage | ether | statusEffect | element |
|---|---|---|---|---|---|---|---|
| arin_whirl | 회전 베기 | arin/3 | physical/all | 90 | 2 | — | — |
| arin_bastion | 철벽의 맹세 | arin/5 | buff/all | 0 | 2 | buff_def 3턴 12 | — |
| arin_execute | 처형 일격 | arin/7 | physical/single | 260 | 3 | — | — |
| arin_bless | 수호기사의 축복 | arin/10 | buff/all | 0 | 3 | regen 3턴 12 | — |
| theo_gearburst | 태엽 폭발 | theo/3 | magic/all | 130 | 2 | — | lightning |
| theo_haste | 시간 가속 | theo/5 | buff/all | 0 | 2 | speed 3턴 6 | — |
| theo_corrode | 부식 태엽 | theo/7 | magic/single | 120 | 2 | poison 3턴 14 | — |
| theo_collapse | 시공 붕괴 | theo/10 | magic/all | 210 | 4 | — | lightning |
| lotti_pan | 프라이팬 강타 | lotti/4 | physical/single | 140 | 1 | stun 1턴 1 | — |
| lotti_spice | 매운맛 양념 | lotti/6 | buff/all | 0 | 2 | buff_atk 3턴 10 | — |
| lotti_fullcourse | 풀코스 | lotti/8 | heal/all | -70 | 3 | regen 2턴 8 | — |

- description 각 1문장 한국어(구현 시 작성, 이름·효과와 일치).
- `SKILL_ANIMATIONS`: physical→"skill1", magic/heal/buff→"skill2"로 신규 11종 매핑 추가.
- 상태이상 4종(poison/buff_def/regen/speed)이 이로써 전부 실사용됨. stun은 적 스킵 판정 기존 코드 사용.

---

## ② 장비 9→20 (파생 포함 45→100)

### 신규 11종 (EQUIPMENT — stats 키는 기존 사용 키만: atk/def/speed/maxHp/maxMp/luck)

| id | 이름(name) | type | rarity | stats | skills | 입수 |
|---|---|---|---|---|---|---|
| scout_leather | 정찰병 경갑 | armor | common | def 8, speed 4 | — | 상점 100G |
| gear_robe | 태엽 로브 | armor | rare | def 10, maxHp 10, atk 5 | — | 상점 220G |
| chef_apron | 셰프의 앞치마 | armor | rare | def 12, maxHp 25 | — | west_forest 보물 |
| dragon_scale | 용린 갑옷 | armor | epic | def 22, maxHp 40, speed -2 | — | gorge 보물 |
| silver_watch | 은빛 회중시계 | accessory | rare | speed 8 | — | 상점 240G |
| guard_charm | 수호 부적 | accessory | rare | def 8, maxHp 15 | — | 상점 260G |
| hunter_ring | 사냥꾼의 반지 | accessory | epic | atk 12, speed 3 | — | hill 보물 |
| sage_pendant | 현자의 목걸이 | accessory | epic | atk 8, luck 8 | ["ice_shard"] | ne_water 보물 |
| knight_greatsword | 기사단 대검 | weapon | epic | atk 40, speed -3 | — | 상점 450G |
| clock_staff | 태엽 지팡이 | weapon | epic | atk 30, speed 4 | ["lightning"] | north_woods 보물 |
| chef_blade | 명장의 조리검 | weapon | epic | atk 32, speed 6 | — | south_coast 보물 |

- ITEM_PRICES 전 11종 필수(파생/판매): scout_leather 100, gear_robe 220, chef_apron 240, dragon_scale 520, silver_watch 240, guard_charm 260, hunter_ring 320, sage_pendant 340, knight_greatsword 450, clock_staff 480, chef_blade 460.
- SHOP_STOCK += [scout_leather, gear_robe, silver_watch, guard_charm, knight_greatsword].
- 보물 배치: `zoneContent.ts` 해당 존 treasureLoot **첫 배열**에 `{ id: <장비id>, qty: 1 }` 추가(기존 항목 유지). 대상 존: west_forest/gorge/hill/ne_water/north_woods/south_coast (6곳).

---

## ③ 연금 3→9 + 요리 6→12

### 연금 신규 6종 (`alchemyData.ts` ALCHEMY_RECIPES 추가 — id에 "elixir" 필수)

| id | 이름 | 재료+골드 | 전투 효과 |
|---|---|---|---|
| revive_elixir | 부활의 정수 🕊️ | coral_fish×1 + golden_herb×1 + 150G | 쓰러진 아군 부활(HP 50%) — **대상 선택(사망자만)** |
| purify_elixir | 정화의 정수 ✨ | reed×2 + herb×1 + 60G | 파티 전원 해로운 효과(poison/burn/freeze/stun) 제거 |
| blast_elixir | 폭염 정수 💥 | driftwood×2 + dark_crystal×1 + 120G | 적 전체 60 피해 |
| frost_elixir | 서리 정수 ❄️ | frost_moss×2 + silver_trout×1 + 180G | 적 전체 빙결 1턴 |
| swift_elixir | 신속의 비약 💨 | wind_flower×2 + reed×1 + 70G | 사용자 speed +10 (99턴) |
| vital_elixir | 활력의 비약 💗 | lotus×1 + herb×2 + 70G | 사용자 regen 8 (4턴) |

**전투 분기 구현** (`battleActionsSlice.ts` selectItem, 기존 elixir 분기 :245-257 옆):
- `revive_elixir`: **신규 targetSelect 분기** — allowedTargets를 `hp <= 0`인 파티원으로(기존 health_potion 분기 :222-243 복제, 사망자 필터만 반전). 사망자 없으면 playerMenu 복귀. 효과는 `bagSlice.useItem`에 분기 추가: `hp: Math.round(maxHp * 0.5)`.
- `purify_elixir`: instant — 파티 전원 `statusEffects.filter(e => !["poison","burn","freeze","stun"].includes(e.type))`.
- `blast_elixir`: instant — `aliveEnemies` 각각 `applyDamage(id, 60)` + 팝업.
- `frost_elixir`: instant — `aliveEnemies` 각각 `applyStatusEffect(id, {type:"freeze", duration:1, value:1})`.
- `swift_elixir`/`vital_elixir`: instant — 사용자에게 applyStatusEffect(speed +10/99턴, regen 8/4턴). war/guard 선례 패턴.
- 모든 instant 분기는 기존 폴백의 차감·FX·턴종료를 그대로 공유(이중 차감 금지).
- ITEM_PRICES: revive 200, purify 80, blast 150, frost 220, swift 90, vital 90. SHOP_STOCK 미추가(제작 전용). MenuUI CONSUMABLES 6종 + BATTLE_ONLY_CONSUMABLES에 6종 추가(필드 사용 차단 — 기존 규약).

### 요리 신규 6종 (`recipeData.ts` RECIPES 추가)

| id | 이름 | 재료 | buffs |
|---|---|---|---|
| trout_braise | 은송어 조림 🐟 | silver_trout×1 + sea_salt×1 | regen 10/4턴 |
| coral_soup | 산호어 스프 🍜 | coral_fish×1 + clam×1 | buff_def 8/4턴 |
| lotus_tea | 연꽃탕 🫖 | lotus×2 | ether 3 (즉시) |
| reed_porridge | 갈대죽 🥣 | reed×2 + herb×1 | speed 6/4턴 |
| golden_salad | 황금 샐러드 🥗 | golden_herb×1 + forest_mushroom×2 | buff_atk 10/4턴 + regen 6/4턴 |
| frost_tea | 서리이끼 차 ☕ | frost_moss×1 + wind_flower×1 | buff_def 6/4턴 + speed 4/4턴 |

→ 판매 전용이던 driftwood·coral_fish·silver_trout·reed가 전부 편입됨(2라운드 어부 납품은 신규 어종 기반으로 재설계 — 충돌 없음).

---

## ④ 존 보강 + 낚시 확장 (좌표 전부 nav 프로브 검증 완료)

### placementData.ts 추가

```ts
// GEN_ROAMERS.hill (1→4) — 죽은 팩 3개 연결
{ x: 52.5, y: -25.75, z: -235.5 }, { x: -18.5, y: -21.25, z: -180.5 }, { x: 4.5, y: -25.25, z: -152.5 },
// GEN_ROAMERS.north_woods (3→5)
{ x: -97.5, y: -25.75, z: -186.5 }, { x: -228.5, y: -36.25, z: -224.5 },
// GEN_GATHER.gorge (8→12)
{ x: 182.5, y: -48.25, z: 136.5 }, { x: 228.5, y: -52.25, z: 156.5 },
{ x: 287.5, y: -42.25, z: 8.5 }, { x: 216.5, y: -44.25, z: 94.5 },
// GEN_FISHING (3→7)
{ zone: "hill", x: 9.5, y: -33.25, z: -127.5 },
{ zone: "north_woods", x: -139.5, y: -31.25, z: -315.5 },
{ zone: "gorge", x: 137.5, y: -42.25, z: 21.5 },
{ zone: "town", x: 148.5, y: -37.25, z: 4.5 },
```

주의: north_woods roamerPacks는 4개 → 스폰 5개로 `i % 4` 순환되어 죽은 팩 해소. hill은 스폰 4개 = 팩 4개 전부 사용. **mage 필드 등장**: `zoneContent.ts` west_forest roamerPacks의 `["ghoul","ghoul","slime"]` → `["mage","ghoul"]`로 교체.

### 낚시 어종 4→8 + 존별 테이블

gameData.ts FISHING_SPOTS의 GEN_FISHING 매핑 삼항을 **존별 테이블 맵**으로 교체:

```ts
const ZONE_FISH_TABLE: Record<string, { common: string; rare: string }> = {
    ne_water: { common: "silver_trout", rare: "fish_rare" },
    south_coast: { common: "fish_common", rare: "coral_fish" },
    west_forest: { common: "silver_trout", rare: "fish_rare" },
    hill: { common: "wind_trout", rare: "fish_rare" },
    north_woods: { common: "ice_fish", rare: "fish_rare" },
    gorge: { common: "deep_fish", rare: "gold_carp" },
    town: { common: "fish_common", rare: "gold_carp" },
};
```

신규 어종 4: **wind_trout 바람송어**(가격 30), **ice_fish 빙어**(35), **deep_fish 심연어**(45), **gold_carp 황금잉어**(120). ITEM_PRICES + FishingPanel FISH_NAMES + MenuUI MATERIALS 동기화. (기존 3스팟 테이블 결과 불변 — 회귀 없음 확인 필수.)

---

## 통합 규약

- 표시명 3맵 동기화(MenuUI 기준), ITEM_PRICES 없는 아이템 매매 불가 규약 준수.
- tsc ≤ 27, 터치 파일 신규 에러 0. 세이브 포맷 무변경(스킬 언락은 레벨 파생이라 저장 불필요).

## 검증 계약 (헤드리스)

1. **스킬**: 레벨 10 주입 → getAvailableSkills에 캐릭터별 전용 스킬 노출(아린 4·테오 4·로티 3, 타 캐릭터 전용 미노출). 전투에서 회전 베기(광역 물리) → 적 전체 피해; 철벽의 맹세 → 파티 전원 buff_def statusEffect; 부식 태엽 → 적 poison 부여 후 턴마다 피해 틱.
2. **장비**: 상점 신규 5종 구매 표시·구매 후 장착 스탯 반영; 보물 장비(존 1곳 샘플) 획득 확인; `_p4` 파생 존재.
3. **연금/요리**: 신규 6종 제작(재료·골드 차감); 전투에서 blast(적 전체 피해)·frost(빙결)·revive(사망자 부활 HP 50%) 동작; 신규 요리 1종 버프가 전투 시작 시 적용.
4. **존/낚시**: hill 로머 4스폰 존재(FIELD_ENEMIES z_hill_r0..r3), gorge 채집 12, 신규 낚시터 4곳 상호작용 → 신규 어종 획득, 기존 3스팟 테이블 불변.
