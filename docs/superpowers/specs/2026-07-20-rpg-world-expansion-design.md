# RPG 월드 확장 — 전 맵 존 개방 + 시스템 확충 설계

날짜: 2026-07-20
상태: 승인됨 (사용자: "전부 + 이동 가능한 영역 전부 사용")

## 배경

- 맵(579×632m) 중 실사용 ~15%. 오프라인 도달성 BFS(이동 규칙 복제: 단차 2.1·수면 차단·잎 통과) 실측 결과 **지면의 50.8%(95,990㎡)가 도보 도달 가능**하며 도로망이 전 맵을 순환.
- 채집·부가 시스템 빈약. 스토리 완결은 월드 확장 후 다음 라운드로 연기(남동 군도는 ch5 무대로 예약).

## 핵심 자산: 검증된 배치 좌표 (이미 저장소에 생성됨)

`src/app/games/rpg/data/placementData.ts` — 도달 마스크 위에서 자동 산출·검증된 좌표:
- `ZONE_DEFS` 7존(보로노이 중심): town/port/hill/west_forest/north_woods/ne_water/south_coast + `zoneOf(x,z)`
- `GEN_FLAGS` 4 (신규 존 깃발, 도로 개방도 최상위 지점) · `GEN_GATHER` 84 (존별 12) · `GEN_ROAMERS` 11무리 · `GEN_TREASURES` 21 · `GEN_POIS` 7 · `GEN_FISHING` 3 (물가)
- 모든 y는 실측 지면 높이. 배치 태스크는 이 데이터를 map 전개로 소비한다(리터럴 복붙 금지).

## 1. 존 티어 콘텐츠

| 존 | 티어 | 특산 채집물 | 배회 몬스터 |
|---|---|---|---|
| town | 1 | herb(기존) | slime |
| port | 1 | clam(조개)·sea_salt(바닷소금) | slime/orc |
| hill | 2 | wind_flower(바람꽃) | orc |
| west_forest | 2 | forest_mushroom(숲버섯)·tree_sap(나무수액) | **zombie(신규)** |
| north_woods | 3 | frost_moss(서리이끼)·iron_ore(철광석) | **witch(신규)** |
| ne_water | 3 | reed(갈대)·lotus(연꽃)·silver_ore(은광석) | **ninja(신규)** |
| south_coast | 2 | clam·driftwood(유목) | zombie/orc 혼합 |

- 신규 적 3종: `zombie`(Zombie_Male.fbx, 느린 다단 2연타), `witch`(Witch.fbx, 긴 차지 회피 전용 마법), `ninja`(Ninja_Female.fbx, 빠른 3연타 패리) — ENEMY_TEMPLATES/MODEL/ATTACK_PROFILES 등록, 존 재료+monster_core 드롭, 티어별 스탯·보상.
- 배회 몬스터: GEN_ROAMERS 11무리(3분 리스폰) + 기존 r1~r5 유지. 숨은 보물 21(티어 전리품), 전망 POI 7, 신규 깃발 4(빠른이동 망 완성).

## 2. 요리 시스템 (요리사)

- `recipeData.ts` RECIPES 6종: 존 재료 조합 → **즉석 섭취(아이템화 없음)** → `pendingBuffs`에 등록, **다음 전투 시작 시** 파티 전원 statusEffects로 적용(지속 N턴). 예: 조개찜(clam2+sea_salt1→def+6/4턴), 버섯스튜(forest_mushroom2+herb1→hp재생/4턴), 바람꽃차(wind_flower2→speed+5/4턴), 구운 생선(fish_common2→atk+5/4턴), 월광어회(fish_rare1→atk+8·speed+4/4턴), 연꽃죽(lotus1+reed2→에테르+2 시작).
- UI: ShopPanel에 "요리" 탭 추가(요리사 상점 재사용). pendingBuffs는 fieldSlice(비영속), 만료 5분.
- combatSlice.startCombat에서 pendingBuffs 소비 → 파티 statusEffects 부여.

## 3. 장비 강화 (대장장이)

- EQUIPMENT에 +1~+3 파생 자동 생성(`${id}_p1..3`, 모듈 로드 시): 스탯 ×1.15/1.30/1.50 반올림, 이름 "… +n".
- 비용: +1 iron_ore2+100G, +2 iron_ore3+monster_core1+250G, +3 silver_ore2+monster_core2+600G.
- `FieldSmith` NPC(견습 대장장이 옆): smith_core 퀘스트 완료 후 개방(E→강화 패널), 미완료 시 안내 대사. `SmithPanel`(ShopPanel 스타일): 가방 속 장비 선택→강화(재료·골드 차감, id 교체). uiSlice `smithOpen`.

## 4. 사냥 의뢰판 (반복 콘텐츠)

- `bountyData.ts` BOUNTIES 8종(존 티어별: 슬라임5/오크4/좀비4/마녀3/닌자3 등 → 골드+재료 보상).
- 처치 카운트: fieldSlice `killCounts: Record<template, number>` — turnSlice 승리 처리에서 증가, **SaveV1 optional `counters`로 영속**(snapshot/applySave 왕복).
- 마을 광장 게시판 오브젝트(E→`BountyPanel`): 의뢰별 "수락(기준점 기록)→진행도(누적킬-기준점)→보상 수령→재수락" 반복 구조. uiSlice `bountyOpen`.

## 5. 낚시 확장

- FishingSpot을 다중 인스턴스화(props: id/x/y/z/fishTable) — 기존 부두 + GEN_FISHING 3곳(총 4곳).
- 어종 확장: silver_trout(은빛송어, 민물)·coral_fish(산호어, 남부) 추가 — 스팟별 어획 테이블, 요리 재료 연계.

## 6. 지도/오버레이 통합

- 전체지도: 존 라벨(ZONE_DEFS) 텍스트 표시, 낚시터 🎣·게시판 📋 마커. 신규 깃발/보물/POI는 기존 데이터 기반 마커에 자동 편입.
- 오버레이 배타/이동 잠금 규칙에 smithOpen/bountyOpen 편입(M/I/E 가드, closeAll, StoryTriggers 보류, 미니맵 숨김).

## 신규 아이템 요약 (MATERIALS/ITEM_PRICES 등록)

재료 11: clam 10G·sea_salt 8·wind_flower 25·forest_mushroom 15·tree_sap 12·frost_moss 30·iron_ore 35·silver_ore 70·reed 6·lotus 28·driftwood 9 / 어종 2: silver_trout 40·coral_fish 55

## 검증

- tsc 기준선 28 유지. 배치 좌표는 생성 단계에서 도달 검증 완료.
- 헤드리스 스팟체크: 신규 깃발 4곳 텔레포트 착지(지면 y 일치) + 각 존 워크 샘플.
- 사용자 최종 플레이: 존 순회(깃발 개방), 요리 버프 전투 적용, 강화 +1, 의뢰 1건 완주, 낚시터 신규 어종.

## 비범위

스토리 ch5/보스/엔딩(다음 라운드 — 남동 군도 예약), 사운드, 낚시 미니게임 룰 변경, 장비 인스턴스 내구도, 존 전용 날씨/조명.
