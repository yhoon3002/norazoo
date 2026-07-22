# 활성화 라운드(E) — 미사용 기능 전면 실동작화

## 배경/목표

미사용 감사(확정 37+부분 6)에서 나온 항목을 "제거"가 아니라 **전부 실동작**으로 연결한다. 기능이 아닌 순수 잔재(그림자 정의·미사용 import·데드 헬퍼·보일러플레이트)는 정리한다. 세이브 포맷: SaveV1의 기존 필드(unlockedSkills/unlockedEquipment)를 **실사용으로 전환**(형태 불변 — 마이그레이션 불필요, 구세이브는 빈 배열로 로드).

**전제**: tsc ≤ 26(정리로 감소 기대 — 감소는 허용, 증가 금지), main 직행, 헤드리스 검증.

---

## ① 전투 코어 활성화 (E-T1)

### 1. guard_break(철갑 부수기) 버그 수정 → debuff_def 신설
- statusEffect 타입 유니온에 `"debuff_def"` 추가(RpgTypes Skill.statusEffect + Character/Enemy statusEffects는 string이라 무변경).
- `gameStoreHelpers.effectiveStat`: `def` 계산 시 `debuff_def` 효과 합만큼 **감산**(최저 0).
- `statusSlice.processStatusEffects`: `debuff_def` case는 no-op(effectiveStat에서 처리) + 지속 감소는 기존 공통 로직.
- gameData `guard_break`: `statusEffect: { type: "debuff_def", duration: 3, value: 10 }` 로 교체(적 방어 -10, 3턴). description도 일치 확인.

### 2. luck → 치명타
- `calcBasicAttackDamage`와 turnSlice 스킬 데미지 계산에 치명타 롤 추가: 확률 `(5 + attacker.stats.luck * 0.5)%`(luck 없으면 5%), 발동 시 최종 피해 ×1.5 반올림 + `spawnPopup({side:"enemy"|피격측, text:"💥 치명타!", color:"#f97316"})`.
- 적도 동일 공식 적용(적 luck 스탯 존재 — 없으면 0). 결정성: Math.random 사용(전투 내 랜덤은 기존 드랍 롤 선례 있음).
- 구현 위치: 피해 산식이 모이는 지점(`calcBasicAttackDamage`는 순수함수 — 치명 여부를 함께 반환하도록 `{ damage, crit }` 형태의 새 헬퍼 `rollDamage(actor, target, base)`를 gameStoreHelpers에 추가하고 3개 호출처(기본공격 targetSlice·스킬 turnSlice·적 공격 enemyActionsSlice)에서 사용).

### 3. formation(진형) 활성화
- `Player.formation` 값 소비: **가하는 피해/받는 피해 배율** — front: ×1.1/×1.1, back: ×0.9/×0.9, balanced: ×1.0/×1.0. 파티 전체 단일 진형(기존 필드 그대로).
- 적용 지점: rollDamage 헬퍼에서 공격자/피격자가 파티면 진형 배율 반영.
- UI: MenuUI 파티(원정대) 사이드에 진형 토글(3버튼: 돌격/균형/수비 — front/balanced/back), `setFormation(f)` 액션 신설(playerSlice). 현재 진형 강조 표시. SaveV1.player.formation은 이미 저장됨.

### 4. escape(도주) 활성화
- battleMenu에 4번째 항목 `"Escape"` 추가(combatSlice battleMenu 초기 배열 — 실제 선언 위치 확인). confirmSelectionAt에 `choice === "Escape"` 분기: 성공률 `clamp(0.5 + (파티 평균 speed - 적 평균 speed) * 0.02, 0.3, 0.9)` 롤 →
  - 성공: `spawnPopup("💨 도주 성공!")` + 전투 이탈 — exitBattle의 victory/defeat 어느 쪽도 아닌 **도주 전용 정리**: 보상 없음·defeated_ 미기록·파티 현 상태 유지(ether/statusEffects는 승리 규약과 동일하게 ether 3·효과 정리), `combat:{phase:"idle"}`·turnQueue 정리·lastEncounterGroup 초기화. exitBattle에 `flee` 분기 추가 방식 권장(phase "fleeing" 경유 또는 exitBattle("flee") 인자 — 기존 코드 구조에 맞게).
  - 실패: `spawnPopup("도주 실패…")` + 턴 소모(endPlayerTurn).
- BattleUI 메뉴 라벨 "도주"(기존 메뉴가 영문이면 "Escape" — 기존 표기 관례 따름). 스토리 전투 도주 허용(재발동 시스템이 커버).

### 5. MP → 에테르 연계(자원 일원화)
- 의미 부여: **전투 시작 에테르 = clamp(3 + floor(캐릭터 유효 maxMp / 30), 0, maxEther)** — mage_staff(+30)=+1, mage_robes(+40)와 합산 70=+2 — 기본 maxMp도 합산되므로 테오(기본 60)는 장비 포함 총 +4(시작 7). 적용: combatSlice startCombat의 파티 초기화에서 ether 산정(기존 고정 3 대체). exitBattle 승리 복원도 동일 공식.
- UI: MenuUI 스탯 패널의 "MP x/y" 표기를 `에테르 +n`(장비 maxMp 파생 시작 보너스)으로 교체 — mp/maxMp 원값 노출 제거. 장비 스탯 델타의 maxMp 표기는 "시작 에테르"로 라벨링(개별 UI 위치는 구현 시 기존 STAT_ORDER/라벨 맵 수정).
- 데이터 무변경(mp/maxMp 필드 유지 — 이제 소비처 존재).

## ② 적 AI·프로필 활성화 (E-T2)

### 1. aiPattern 소비 — 타겟 선택 정책
- 적 공격 타겟 선정 지점(enemyActionsSlice)에서 템플릿 `aiPattern` 분기:
  - `aggressive`: 생존 파티 중 **최저 HP** 타겟(마무리 성향).
  - `smart`: 생존 파티 중 **유효 def 최저** 타겟(약점 공략) — effectiveStat(def) 기준.
  - `balanced`(및 미지정): 기존 로직(랜덤/현행) 유지.
- 회귀 금지: 기존 타겟 로직이 어디서 결정되는지 먼저 확인하고 그 지점만 분기.

### 2. 적 → 파티 독 부여(purify 실효화)
- ENEMY_ATTACK_PROFILES에 옵션 필드 `applyStatus?: { type: string; duration: number; value: number; chance: number }` 추가.
- 데이터: witch·frost_witch에 `{type:"poison", duration:2, value:8, chance:0.35}`, shade_beast에 `{type:"poison", duration:3, value:10, chance:0.4}`.
- `applyEnemyHitDamage`에서 피해 적용 후 chance 롤 성공 시 대상 파티원에 `applyStatusEffect` + 팝업(`☠️ 중독!`). 완전 방어(패리 성공 등 피해 0)면 미부여.
- 이로써 purify_elixir(파티 정화)·독 틱이 실전 의미 획득.

### 3. preferredAttack 변형 사용
- 소비처는 이미 존재(ModelAvatar attack/shoot/punch 애니 분기). 데이터 지정: DEFAULT_PARTY 테오 `preferredAttack: "shoot"`(지팡이 발사 모션), 로티 `"punch"`(프라이팬 콘셉 — punch 애니가 어색하면 로티는 attack 유지하고 적측만: mage/witch/frost_witch/gear_devourer 템플릿에 `"shoot"`). EnemyMesh가 템플릿 preferredAttack을 ModelAvatar로 전달하는지 확인 — 미전달이면 전달 배선 추가.

## ③ 도감·일지·보상 확장 (E-T3)

### 1. unlockedEquipment 실사용 — 장비 도감
- 기록: bagSlice `addItem`에서 id가 EQUIPMENT에 존재하고 목록에 없으면 `unlockedEquipment`에 push(스토어 상태 신설 — SaveV1 필드는 이미 존재. turnSlice snapshot이 `s.unlockedEquipment ?? []` 저장, applySave가 `d.unlockedEquipment ?? []` 복원하도록 교체 — 기존 하드코딩 `[]` 제거). `_pN` 파생은 base id로 정규화해 기록.
- CodexPane에 **장비 섹션**(기본 장비 20종): 획득 이력 있으면 이름, 없으면 "???".

### 2. unlockedSkills 실사용 — 기술 도감
- 기록: 스킬 사용 성공 시(resolvePlayerAction 스킬 실효 지점) skillId를 `unlockedSkills`에 push(중복 방지). snapshot/applySave 동일 교체.
- CodexPane에 **기술 섹션**(SKILLS 18종): 사용해본 기술 이름/미사용 "???".

### 3. 퀘스트 일지 — 죽은 Quest 상태 정리 + 파생 일지
- 스토어 `quests: []` 상태·`Quest` 타입·SaveV1.quests는 **일지 시스템으로 대체**: MenuUI에 "일지" 탭 추가(도감 탭 옆) — SIDE_QUESTS 9종을 flags 기반 상태(미수락/진행 중/완료)로 나열(진행 중이면 조건 요약: needs 잔여 수량·kills 잔여). BOUNTIES 진행도 함께 표시(killCounts 기반 — BountyPanel 로직 재사용 수준의 요약).
- 죽은 저장 필드 `SaveV1.quests`/스토어 `quests`/`Quest` 타입은 이 라운드에서 **제거**(파생 일지가 완전 대체 — applySave의 `d.quests || []` 라인 제거, 구세이브 필드는 단순 무시됨).

### 4. 소품 활성화
- **legendary 사용**: 신규 액세서리 `champion_medal` "관장의 증표"(legendary, stats atk 15·def 15·luck 15, ITEM_PRICES 800, 비매품) — 투기장 **웨이브 10 최초 클리어 시 1회 지급**(ArenaMaster 보상 지급부에서 `n === 9 && !flags.arena_champion` → addItem + 플래그).
- **self 스킬**: `lotti_snack` 간식 타임 — lotti 전용 lv12, type heal, targetType self, damage -60, etherCost 1, statusEffect `{type:"regen", duration:2, value:8}`, description 한국어. SKILL_ANIMATIONS "skill2", QTE_PLANS `[1]`.
- **earth 엘리먼트**: `arin_whirl`(회전 베기)에 `element: "earth"` 지정(히트 FX 색 분기 — turnSlice element 색 맵에 earth 색상(#b45309 계열) 추가 필요 시 추가).
- **투기장 관장 대사**: 첫 상호작용 시 1회 인사 대화(speaker "투기장 관장" — NPC_SPEAKERS 기존 항목 사용, `flags.arena_met` 1회성, 재봉사 quest_tailor_met 선례) 후 이후 E부터 즉시 전투.
- **GORGE_BOSS_ARENA 역연결**: storyData의 하드코딩 {268.5, 42.5} 2곳이 placementData `GORGE_BOSS_ARENA`를 import해 참조.
- **초기 목표 좌표 정정**: storySlice 초기 `story.target` {x:4,z:-4} → `{x:12.8, z:-14}`(프롤로그 목표와 일치).

## ④ 순수 잔재 정리 (E-T4 — 기능이 아닌 것들)

- combatSlice 그림자 정의 5건(endPlayerTurn/endEnemyTurn/moveTargetIndex/cancelTargeting/nextTurn — turnSlice/targetSlice 실정의는 유지, nextTurn은 양쪽 제거) + setBattleIndex/setSubMenuIndex + defenseTimeoutId.
- 데드 헬퍼: gameStoreHelpers PARRY_ANIMATION_STATE/getAnimationForAction/getSkillAnimationState/firstAliveEnemyId, useGameStore 재수출/미사용 타입 import, playerSlice getAvailableSkills named export, battleActionsSlice popupSeq·미사용 import, statusSlice/targetSlice 미사용 import.
- 데드 컴포넌트/파일: FieldElements의 FieldEnemy·FieldSpawnMarker, hooks/useRuntimeNavMesh.ts 삭제, placementData zoneOf.
- 데드 데이터 키: QTE_PLANS skill1/skill2, SKILL_ANIMATIONS "parry", CombatAction.qteType+QTEType 타입(write-only) 제거.
- RpgGame: 미사용 import(exportToFile/importFromFile/load/THREE)·미사용 셀렉터(applySave/exitBattle)·saves 상태 제거. SmithPanel baseId 구조분해 축소.
- public 보일러플레이트 SVG 5종 삭제(file/globe/next/vercel/window.svg — src 참조 0 확인 후).
- **유지(예약/안전망)**: rarity·element·targetType 유니온의 나머지 예약값, 방어 폴백 3건(BattleUI 휴리스틱·profileFor 폴백·EnemyMesh 폴백).

## 검증 계약 (헤드리스, E-T5)

1. 철갑 부수기 → 적 statusEffects에 debuff_def, 이후 아군 피해 증가(유효 def 감소 수치 확인).
2. 치명타: luck 90 주입 시 표본 10회 중 치명 발생·1.5× 피해 관측(통계적 여유 허용), 팝업 표시.
3. 진형: front/back 설정 시 동일 공격 피해 ±10% 반영, 메뉴 토글 UI 동작, 세이브 왕복 유지.
4. 도주: 메뉴에 표시 → 성공 시 필드 복귀(보상·defeated 없음), 실패 시 턴 소모. 스토리 전투 도주 후 재발동 가능.
5. MP 연계: mage_staff+mage_robes 장착 테오 전투 시작 에테르 5(3+2). UI MP 표기 교체.
6. 독: witch전에서 파티 중독 발생(확률 — 반복 허용) → purify_elixir로 해제.
7. AI: aggressive 적이 최저 HP 파티원 공격(표본), smart는 최저 def.
8. 도감: 장비 획득 → 장비 섹션 공개, 스킬 사용 → 기술 섹션 공개, 세이브 왕복 유지. 일지 탭: 퀘스트 상태 3분류 표시.
9. 투기장: 첫 E 인사 대화(관장 화자) → 재E 전투; (웨이브 10 메달은 데이터 검증 — killCounts 주입).
10. tsc ≤ 26(감소 허용), 정리 후 회귀 없음(진입·전투·상점 스모크).
