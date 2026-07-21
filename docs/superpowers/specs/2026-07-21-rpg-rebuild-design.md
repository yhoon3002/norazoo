# 마을 재건 패키지 — 아낙 재봉소·어부 반복 납품·광장 기부함

## 배경/목표

에필로그에 깨어난 NPC(아낙·어부)에게 실제 역할을 주고, 무한 골드의 최종 종착지를 만든다. 신규 어종(ice_fish/gold_carp 등)의 소비처가 여기서 생긴다. 좌표는 전부 플레이어 착지 프로브 검증 완료.

**전제**: tsc ≤ 26, 세이브 포맷 무변경(영속은 killCounts 네임스페이스·flags만), main 직행. 오버레이 신설 1개(tailorOpen)는 기존 6사이트 배선 규약을 따른다.

---

## ① 아낙 재봉소 (에필로그 게이트)

### 데이터 (`data/tailorData.ts` 신규)

```ts
// rpg/data/tailorData.ts — 재봉 레시피: 재료+골드 → 장비 (아낙 재봉소, 에필로그 해금)
export type TailorRecipe = {
    id: string;          // 산출 EQUIPMENT id
    needs: Array<{ id: string; qty: number }>;
    gold: number;
};
export const TAILOR_RECIPES: TailorRecipe[] = [
    { id: "reed_cloak", needs: [{ id: "reed", qty: 6 }, { id: "tree_sap", qty: 2 }], gold: 200 },
    { id: "frost_coat", needs: [{ id: "frost_moss", qty: 4 }, { id: "ice_fish", qty: 2 }], gold: 300 },
    { id: "sailor_gloves", needs: [{ id: "driftwood", qty: 3 }, { id: "sea_salt", qty: 3 }], gold: 250 },
    { id: "festival_dress", needs: [{ id: "gold_carp", qty: 1 }, { id: "wind_flower", qty: 4 }], gold: 500 },
];
```

### 신규 장비 4종 (`data/gameData.ts` EQUIPMENT — 파생 자동, ITEM_PRICES 필수)

| id | 이름 | type | rarity | stats | 가격 |
|---|---|---|---|---|---|
| reed_cloak | 갈대 망토 | accessory | rare | def 6, speed 5 | 260 |
| frost_coat | 서리털 외투 | armor | rare | def 14, maxHp 20 | 300 |
| sailor_gloves | 뱃사람 장갑 | accessory | rare | atk 6, def 6 | 280 |
| festival_dress | 축제의 옷 | armor | epic | def 10, speed 6, luck 10 | 520 |

SHOP_STOCK 미추가(재봉 전용). → ice_fish·gold_carp·driftwood에 제작 용처 발생.

### NPC + 패널

- `field/FieldTailor.tsx`: NPC (92.5, -33.25, -23.5) — 굳은 아낙 석상(gate_wife 로어, 96.8,-26.6에서 5.3m 이격)의 "깨어난 본인" 콘셉. model `/character/Viking_Female.fbx`(재사용 선례), 라벨 "재봉사 아낙", 🧵 Html 마커. **`stageAtLeast(stage, "epilogue")`일 때만 렌더**(Boatman 패턴). E 가드는 기존 NPC 규약 + tailorOpen. E → `toggleTailor()`.
- `menu/TailorPanel.tsx`: SmithPanel 골격 복제 — TAILOR_RECIPES 목록(장비명·스탯·재료·골드), 제작 버튼(fresh 재검증→단일 setState 차감→addItem→spawnPopup 🧵). 표시명은 EQUIPMENT/MenuUI 기준.
- **6사이트 배선**(uiSlice `tailorOpen`+`toggleTailor`+closeAll / RpgGame ESC·m·i 가드 / MiniMap 숨김 조건 / FieldPlayer 이동잠금 / StoryTriggers 보류 / 기존 NPC·낚시터 E 가드 목록에 tailorOpen 추가) — smithOpen이 등장하는 모든 지점을 grep해 동일하게 추가.

## ② 어부 반복 납품 (에필로그 게이트)

- `field/FieldFishTrade.tsx`: NPC (200.5, -38.25, 1.5) — 깨어난 어부(port_fisher 로어 203.2,5.6에서 4.9m·fisher_fish 퀘 NPC 207,3에서 6.7m 이격). model `/character/Elf.fbx`, 라벨 "어부", 🐟 Html. epilogue 게이트. E →
  - 세트 보유 시(`wind_trout×2 + ice_fish×2 + deep_fish×1`): 차감 + **300G** + 보너스 1개(`monster_core`/`silver_ore`/`golden_herb` 중 납품 횟수 `n % 3` 순환 — Math.random 대신 결정적) + `killCounts["fish_trade"] = n+1` + 대화("좋은 물건이군! ...") + 팝업.
  - 미보유 시: 요구 세트 안내 대화(어종 한국어명 명시).
  - 반복 무제한(횟수는 라운드D 업적 연계용 영속).
- 화자 "어부"는 NPC_SPEAKERS에 이미 존재.

## ③ 광장 기부함 (게이트 없음 — 상시)

- `field/DonationBox.tsx`: (18.5, -33.25, -20.5) — finale 트리거(24.5,-17 r6) 밖 6.9m, 상인 8.6m. 소형 상자 메시(boxGeometry + 갈색/금색 머티리얼) + 💰 Html + E 프롬프트 "E: 재건 기부".
- 단계: `killCounts["donation_lv"]` 0→3, 비용 [500, 1500, 5000].
  - E → 현재 단계 비용 보유 시: 골드 차감 + 단계 증가 + 효과 + 대화/팝업. 미보유 시 안내 팝업.
  - **1단계(500G)**: 팝업 "🌸 광장에 꽃이 피었다" — 기부함 주변 꽃 데코 렌더(작은 colored sphere/cone 메시 4개, `donation_lv ≥ 1` 조건부).
  - **2단계(1500G)**: 파티 전원 maxHp +10 영구 — `feastStat("maxHp", 10)` 재사용(만찬 상한과 별개 1회성). 팝업 "🏮 거리가 밝아졌다 — 파티 최대 HP +10".
  - **3단계(5000G)**: `feastStat("atk", 2)` + `feastStat("def", 2)` + `flags.donation_max = true`(라운드D 칭호 연계) + 축제 데코 추가 렌더 + 팝업 "🎉 노라 재건 완료! 공격/방어 +2".
- 영속: killCounts + flags — 세이브 무변경. feastStat은 baseStats 변경이라 party로 영속.

## 검증 계약 (헤드리스)

1. 재봉소: 에필로그 미달 시 NPC 부재 → epilogue 주입 후 E → tailorOpen; 재료·골드 주입 → 갈대 망토 제작(-200G·재료 차감·bag 반영) → 장착 스탯 반영.
2. 어부 납품: 세트 주입 → E 납품(+300G·보너스·fish_trade=1) → 재납품 가능(=2). 미보유 시 안내만.
3. 기부함: 500G 주입 → E → donation_lv 1·팝업; 1500G → lv2·파티 maxHp+10 확인; 5000G → lv3·atk/def+2·donation_max 플래그. 세이브 왕복 후 단계·스탯 유지.
4. 배선: tailorOpen 열림 중 이동 잠금·미니맵 숨김·ESC 닫기, 다른 NPC E 무반응.
5. tsc ≤ 26.
