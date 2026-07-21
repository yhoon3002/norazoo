# 마을 재건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 아낙 재봉소(신규 오버레이)·어부 반복 납품·광장 기부함으로 에필로그 NPC 역할화 + 최종 골드 싱크.

## Global Constraints
- 스펙 단일 진실: `docs/superpowers/specs/2026-07-21-rpg-rebuild-design.md` — 좌표·레시피·수치 verbatim, 좌표 수정 금지.
- tsc ≤ 26, 세이브 무변경(killCounts/flags/baseStats만), 오버레이 배선은 smithOpen 등장 지점 전수 미러.

### Task 1: 아낙 재봉소 (tailorData + EQUIPMENT 4종 + FieldTailor + TailorPanel + 6사이트 배선)
- [ ] 스펙 §① 그대로. smithOpen을 grep해 배선 지점 전수 확인 후 tailorOpen 추가. 대사 한국어(아낙 각성 인사 + 재봉 안내).
- [ ] tsc ≤ 26, 커밋 `[feat] 아낙 재봉소 — 재봉 장비 4종·에필로그 해금 오버레이`

### Task 2: 어부 반복 납품 + 광장 기부함 (FieldFishTrade + DonationBox + FieldScene 마운트)
- [ ] 스펙 §②③ 그대로. 보너스 순환은 n%3(비랜덤). 기부 데코는 donation_lv 조건부 렌더.
- [ ] tsc ≤ 26, 커밋 `[feat] 어부 반복 납품·광장 재건 기부함 — 반복 골드 싱크·영구 보너스`

### Task 3: 헤드리스 검증 + 최종 리뷰 (컨트롤러)
- [ ] 스펙 검증 계약 5항목 → 라운드 최종 리뷰 → 수정 웨이브 → 완료.
