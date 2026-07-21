# 풍성화 웨이브2 — 외곽 5존 사이드퀘스트 + 상점 단계 해금

## 배경/목표

외곽 5존(서부 대삼림·북부 숲길·북동 수변·남부 해안·협곡)에는 퀘스트가 0건이라 탐험 동기가 약하고, 상점은 첫 방문에 에픽(flame_blade)까지 전부 판매해 진행감이 없다. 웨이브2는 **존당 사이드퀘 1건(총 5건) + 상점 재고의 스토리 단계 해금**을 추가한다.

**기반 사실(확인됨)**: 사이드퀘는 완전 데이터 주도 — `SIDE_QUESTS` 배열에 추가하면 FieldScene 마운트·FullMapPanel/MiniMap ❗마커가 자동. SideQuest 타입: npc{x,z,y,label,model}/availableFrom/accept/progress/complete/needs?/kills?/rewards/rewardGold. kills는 `defeated_${fieldId}` 정확 매칭 — **리스폰 스폰은 플래그가 리셋되므로 토벌 퀘는 비리스폰 전용 캠프 필수**(선례: guard_bounty의 bounty1). NPC 좌표는 전부 플레이어 착지 프로브 검증 완료.

**전제**: tsc ≤ 26, 세이브 포맷 무변경, main 직행. NPC 모델 재사용은 허용 선례(Elf 2회) 있음.

---

## ① 사이드퀘스트 5건 (`data/questData.ts` SIDE_QUESTS 말미 추가)

| id | 존/NPC | model | availableFrom | 조건 | 보상 |
|---|---|---|---|---|---|
| herb_witch | west_forest 약초술사 (-212.5, -18.25, 106.5) | /character/Witch.fbx | ch3_port | needs: forest_mushroom×5 + tree_sap×2 | golden_herb×2 + 150G |
| lost_hunter | north_woods 사냥꾼 (-139.5, -31.25, -215.5) | /character/Ninja_Female.fbx | ch4_hill | kills: ["qw_nw_0","qw_nw_1"] | silver_ore×2 + mana_potion×2 + 180G |
| reed_hermit | ne_water 갈대밭 강태공 (233.5, -47.25, -261.5) | /character/Elf.fbx | ch4_hill | needs: lotus×2 + reed×3 | fish_rare×2 + guard_elixir×1 + 160G |
| drift_trader | south_coast 퇴역 뱃사람 (-80.5, -33.25, 82.5) | /character/VikingHelmet.fbx | ch3_port | needs: driftwood×3 + sea_salt×2 | war_elixir×1 + health_potion×2 + 140G |
| gear_goblin | gorge 조난 태엽기술자 (199.5, -49.25, 153.5) | /character/Goblin_Male.fbx | ch5_gorge | kills: ["qw_gorge_0","qw_gorge_1"] | dark_crystal×3 + monster_core×3 + 250G |

- 대사(accept 2-3줄/progress 1줄/complete 1-2줄)는 기존 4퀘 톤(화자 label + 파티원 리액션 1줄)을 따라 구현 시 한국어로 작성. accept에는 조건(재료/사냥 대상·장소)이 명시돼야 한다. gear_goblin은 "시계탑 태엽을 노리다 조난당한 고블린 기술자가 폭주한 태엽 병정을 멈춰달라 부탁" 콘셉트(적 모델의 우호 NPC 재사용 명분).
- 신규 speaker 표기: NPC_SPEAKERS(storyData)에 `약초술사 🧪`, `사냥꾼 🏹`, `강태공 🎣`(어부와 구분 필요 시 기존 어부 아이콘 재사용 가능), `퇴역 뱃사람 ⚓`, `태엽기술자 ⚙️` 추가 — DialogueLine speaker 문자열과 정확히 일치시킬 것.

## ② 토벌 전용 캠프 2곳 (`data/gameData.ts` FIELD_ENEMIES 추가 — 비리스폰)

```ts
{ id: "qw_nw", pos: new THREE.Vector3(-155.5, -32.25, -205.5), templates: ["witch", "witch"] },
{ id: "qw_gorge", pos: new THREE.Vector3(215.5, -44.25, 110.5), templates: ["clockwork_soldier", "clockwork_soldier"] },
```

**구현 규약**: 기존 `bounty1`(guard_bounty의 토벌 대상) FIELD_ENEMIES 항목을 찾아 respawn 필드 유무를 **정확히 미러**한다(비리스폰 = 퀘스트 플래그 영구 보존의 검증된 선례). 좌표는 착지 프로브 검증 완료 — 수정 금지.

## ③ 상점 단계 해금

`data/gameData.ts`에 추가:

```ts
/** 상점 재고 해금 스테이지 — 미기재 id는 처음부터 판매 */
export const SHOP_UNLOCK_STAGE: Record<string, string> = {
    steel_sword: "ch2_cleanup",
    scout_leather: "ch2_cleanup",
    mage_staff: "ch3_port",
    mage_robes: "ch3_port",
    chain_mail: "ch3_port",
    silver_watch: "ch3_port",
    power_ring: "ch4_hill",
    health_amulet: "ch4_hill",
    gear_robe: "ch4_hill",
    guard_charm: "ch4_hill",
    flame_blade: "ch5_gorge",
    knight_greatsword: "ch5_gorge",
};
```

`menu/ShopPanel.tsx` buy 탭: `SHOP_STOCK.map(` → `SHOP_STOCK.filter((id) => stageAtLeast(stage, SHOP_UNLOCK_STAGE[id] ?? "prologue")).map(` — `stage`는 기존 SmithPanel 패턴(`useGame((s) => s.story.stage)`) 구독, `stageAtLeast`/`SHOP_UNLOCK_STAGE` import 추가. 잠긴 항목은 **숨김**(자물쇠 표시 없음 — 단순성).

결과: 시작 4종(포션2+iron_sword+leather_armor) → ch2 +2 → ch3 +4 → ch4 +4 → ch5 +2(에픽). 구매 자체는 buyItem 무변경(숨겨진 항목은 클릭 불가이므로 게이트 충분).

## 검증 계약 (헤드리스)

1. 스테이지별 상점 재고 수: prologue 4 → ch2_cleanup 6 → ch3_port 10 → ch4_hill 14 → ch5_gorge 16 (buy 탭 DOM 카운트).
2. 사이드퀘 1건 풀사이클(herb_witch): ch3_port 주입 → NPC 위치 텔레포트 → E 수락(quest_herb_witch 플래그) → 재료 주입 → E 완료(보상 golden_herb×2·150G·quest_herb_witch_done).
3. 토벌 퀘(gear_goblin): ch5_gorge 주입 → 수락 → qw_gorge 캠프 전투 승리 주입(defeated_qw_gorge_0/1) → E 완료(보상 지급).
4. 신규 NPC 5명 위치에서 E 프롬프트 노출(착지 후 상호작용 확인, 최소 2곳 샘플).
5. tsc ≤ 26 유지.
