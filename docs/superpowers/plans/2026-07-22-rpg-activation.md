# 활성화 라운드(E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 미사용 감사 항목 전면 실동작화(치명타·진형·도주·디버프·MP연계·적AI·독·도감/일지·소품) + 순수 잔재 정리.

## Global Constraints
- 스펙 단일 진실: `docs/superpowers/specs/2026-07-22-rpg-activation-design.md` — 수치·공식·정책 verbatim.
- tsc ≤ 26(감소 허용·증가 금지), 세이브: unlockedSkills/unlockedEquipment 실전환(형태 불변), SaveV1.quests 제거(구세이브 필드 무시), 그 외 무변경.
- 전투 산식 변경은 rollDamage 헬퍼로 일원화 — 3개 호출처 외 산식 중복 금지.

### Task 1: 전투 코어 (스펙 §①)
**Files:** RpgTypes.ts, gameStoreHelpers.ts(rollDamage), statusSlice.ts, gameData.ts(guard_break), turnSlice.ts, targetSlice.ts, enemyActionsSlice.ts, combatSlice.ts(battleMenu·startCombat ether), battleActionsSlice.ts(Escape 분기), BattleUI.tsx(도주 라벨), playerSlice.ts(setFormation), MenuUI.tsx(진형 토글·MP 표기)
- [ ] §① 1~5 구현. 커밋 `[feat] 전투 코어 활성화 — 치명타(luck)·진형·도주·방어 디버프·MP→에테르 연계`

### Task 2: 적 AI·프로필 (스펙 §②)
**Files:** enemyActionsSlice.ts(aiPattern 타겟·applyStatus 롤), gameData.ts(프로필 applyStatus·preferredAttack), EnemyMesh.tsx(전달 확인), 파티 데이터(테오 shoot)
- [ ] §② 1~3 구현. 커밋 `[feat] 적 AI 활성화 — 패턴별 타겟팅·중독 공격·공격 모션 변형`

### Task 3: 도감·일지·소품 (스펙 §③)
**Files:** bagSlice.ts(unlockedEquipment 기록), turnSlice.ts(unlockedSkills 기록·snapshot/applySave 교체·quests 제거), RpgTypes.ts(Quest·SaveV1.quests 제거), CodexPane.tsx(장비·기술 섹션), MenuUI.tsx(일지 탭), gameData.ts(champion_medal·lotti_snack·arin_whirl earth), ArenaMaster.tsx(인사·메달), storyData.ts(GORGE_BOSS_ARENA 역연결), storySlice.ts(초기 target)
- [ ] §③ 1~4 구현. 커밋 `[feat] 도감 확장(장비·기술)·퀘스트 일지·전설 훈장·간식 타임`

### Task 4: 잔재 정리 (스펙 §④)
- [ ] §④ 목록 전부 제거(유지 목록 제외). tsc 감소 확인. 커밋 `[chore] 데드코드 정리 — 그림자 정의·데드 헬퍼·미사용 임포트·보일러플레이트`

### Task 5: 헤드리스 검증 + 최종 리뷰 (컨트롤러)
- [ ] 스펙 검증 계약 10항목 → 최종 리뷰 → 수정 웨이브 → 완료 보고.
