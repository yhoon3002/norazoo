# 라운드D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 도감·업적/칭호(MenuUI 탭) + 투기장(반복 웨이브) + 유대 에피소드 3건.

## Global Constraints
- 스펙 단일 진실: `docs/superpowers/specs/2026-07-21-rpg-roundD-design.md` — 업적 12종·웨이브 10종·좌표·보상 verbatim.
- tsc ≤ 26, 세이브 무변경(killCounts/flags만), 좌표 수정 금지.

### Task 1: 기록 훅 + 도감 탭 + 업적/칭호
**Files:** achievementData.ts(신규), CodexPane.tsx(신규), MenuUI.tsx(탭 분기), FishingPanel.tsx(caught_ 2곳), ShopPanel.tsx(made_ cook/craft), TailorPanel.tsx(made_)
- [ ] 스펙 §① 그대로. tsc ≤ 26. 커밋 `[feat] 도감·업적/칭호 — 수집 현황 탭·기록 훅(어획/제작)`

### Task 2: 투기장
**Files:** arenaData.ts(신규), ArenaMaster.tsx(신규), FieldScene.tsx(마운트)
- [ ] 스펙 §② 그대로(합성 fieldId `arena${n}_${i}`, 승리 감지→보상→플래그 삭제). 커밋 `[feat] 투기장 — 반복 웨이브 전투·랭크 보상`

### Task 3: 유대 에피소드 3건 + 지도 마커
**Files:** bondData.ts(신규), BondEpisode.tsx(신규), FieldScene.tsx(마운트), FullMapPanel.tsx·MiniMap.tsx(💫 마커)
- [ ] 스펙 §③ 그대로(대사 6-8줄 한국어). 커밋 `[feat] 파티 유대 에피소드 3건 — 아린·테오·로티 개인 서사`

### Task 4: 헤드리스 검증 + 라운드 최종 리뷰 (컨트롤러)
- [ ] 스펙 검증 계약 4항목 → 최종 리뷰 → 수정 웨이브 → 완료 보고.
