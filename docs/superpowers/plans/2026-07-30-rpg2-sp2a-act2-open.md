# RPG 2.0 SP2a — 2막 개막 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2막을 열다 — 막간① 컷신, 항구 「멈춘 파도」 재발 챕터, 바람 언덕 「반복되는 하루」 챕터, 아린·로티 서사 개시, 레벨 커브 확장. 스펙: `docs/superpowers/specs/2026-07-30-rpg2-sp2a-act2-open-design.md` (각 태스크의 콘텐츠 정본).

**Architecture:** SP0/SP1 시스템 위 데이터·저작 중심. 프레임워크 확장 2건뿐(FrozenVillager awake2 분기·ZONE_PHENOMENA 배열 우선순위). 스테이지는 `STAGE_ORDER` 뒤 append.

**Tech Stack:** 기존 동일. 검증: ts-node + 헤드리스(qa-lib).

## Global Constraints (SP1 누적 규약 승계 — verbatim)

- tsc ≤ 26(리포 루트 측정·증가 금지). eslint 신규 0 — 슬라이스/게이트 관례 any 예외. 드로우콜 ≤ 500.
- 신규 좌표는 **이원 검증**(`__navFindWalkable` 스냅 드리프트 ≤1.2m + 플레이어 텔레포트 착지) + 배치 감사(상호작용점 3.5m+·로머 캠프 8m+) 위반 0.
- 컷신: 트리거에 battle 스텝 이관 시 트리거 `battle` 필드 병기(재도전 게이트) / battle 잔여 연출은 승리 복귀만 / battle 컷신에 giveGold·giveItems 금지 / 스킵은 미승리 battle로 점프(프레임워크가 처리) / 카메라는 walkable 앵커+수평 시선(부감 금지·확정 샷 보관) / battle 뒤 camReset 금지.
- 보스: 적 전용 스킬 신설(파티 스킬 재사용 금지)·gimmick.every ≥ 1·TTK 게이트는 **양방향 ±10%**(T4 산식: 파티→보스 TTK, 보스→파티 3턴 사이클 평균 출력).
- 대사 톤: 로티 감성·요리 비유 / 테오 분석 존댓말("흥미롭네요" 남발 금지) / 아린 절제 군인체. 시점: 시간 이상 존 내부만 각 현상 톤(전역 "밤" 규칙은 1막 해소로 종료 — 2막은 지역별 이상. 단 과거 회상은 "그 밤" 유지).
- 세이브: 신규 스테이지는 STAGE_ORDER append·신규 플래그만. 구세이브(에필로그·1막 중반) 호환 필수.
- 커밋: main 직행·한국어 `[feat]/[fix]`·태스크당 1커밋(+리뷰 수정 관행).
- 헤드리스: qa-lib(`enterGame(url?)` 기본 3010·`cleanState`·Runner) — **공용 파일 수정 금지**. 신규 세션 cs_opening 자동 발동(상태 주입 전 cutscene/dialogue 선정리). 클린 재기동 후 웜업 1회. 메모리 압박 시 2회 연속 PASS. 스크립트는 스크래치패드에서 `NODE_PATH=<repo>/node_modules node <스크립트>`. 전부 동기 실행(run_in_background 금지).

**스펙 해석 노트**: §①의 `act2_intro` 스테이지는 단순화를 위해 생략 — 막간① 트리거(stage "epilogue")가 `nextStage: "act2_port"` 직행. 컷신 수는 7종(스펙 "9종" 표기는 오기).

---

### Task 1: 프레임워크 확장 + 2막 개막(막간①)

**Files:**
- Modify: `src/app/games/rpg/data/storyData.ts` (STAGE_ORDER에 `"act2_port", "act2_hill"` append + 막간① 트리거)
- Modify: `src/app/games/rpg/data/frozenData.ts` (타입 확장만: `awake2From?: string; awake2?: DialogueLine[];`)
- Modify: `src/app/games/rpg/field/FrozenVillager.tsx` (각성 대사 선택: `awake2From && stageAtLeast(stage, awake2From) && awake2` → awake2, 아니면 awake)
- Modify: `src/app/games/rpg/data/zonePhenomena.ts` (주석 1건: "배열 순서 = 우선순위 — 같은 존의 활성 항목 중 앞이 이김"과 `phenomenonAt`이 실제로 첫 매치를 반환하는지 확인·아니면 수정)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (`cs_act2_omen`)

**Interfaces (Produces):**
- 스테이지 `"act2_port"`, `"act2_hill"` (STAGE_ORDER 순서 보장 — `stageAtLeast(stage, "act2_port")`로 2막 게이트).
- 트리거 `act2_omen`: `{ id: "act2_omen", stage: "epilogue", near: 광장(12.8,-14 반경 8), cutscene: "cs_act2_omen", nextStage: "act2_port", objective: "항구로 — 파도가 다시 멈췄다", target: { x: 218.6, z: -14.7 } }`.
- `cs_act2_omen`: 재건 광장 배경 — 시계탑 헛도는 징조(fx+say) → 전갈 낭독(화자 "전령" — NPC_SPEAKERS에 아이콘 추가) → 파티 3인 반응(6~9줄) → 항구행 결의. set 스텝 없음.
- awake2 규약: `awake2From` 스테이지 도달 시 awake 대신 awake2 표시(E 반복 가능·플래그/보상 없음 — awake와 동일 계약).

- [ ] Step 1: 구현(위 인터페이스 verbatim — cs_act2_omen 카메라는 SP1 워크플로로 확정 샷 1장).
- [ ] Step 2: 헤드리스 `sp2a-t1-omen.js` — 에필로그 상태 주입→광장 접근→omen 발동·완주→stage act2_port·objective/target 갱신 / 1막 중반(ch3) 상태에선 미발동 / awake2 스모크(임시 데이터 1건 주입 후 분기 확인·제거) / phenomenonAt 우선순위 ts-node 단위 검증.
- [ ] Step 3: tsc·커밋 `[feat] SP2a 2막 개막 — 막간① 징조 컷신·act2 스테이지·awake2 분기·현상 우선순위`

### Task 2: 항구 챕터 서사 (현상 재발·조사 아크·아린 서신)

**Files:**
- Modify: `src/app/games/rpg/data/zonePhenomena.ts` (`phen_port2` — port 존, phen_port 항목 **앞에** 배치: fog `#46626f`/near 10/far 55·dirIntensity 2.2·particles 550/`#dceaf2`/0.07)
- Modify: `src/app/games/rpg/data/storyData.ts` (트리거 체인 4개: port2_arrival(도착 컷신+phen_port2 점등 set)·port2_witness(증언 2곳 완료 flagsAll)·port2_vortex(소용돌이 발견—던전 개방 플래그)·port2_arin(아린 서신 컷신))
- Modify: `src/app/games/rpg/data/frozenData.ts` (f_porter·f_sailor에 `awake2From: "act2_port"` + awake2 증언 2~3줄)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (`cs_port2_arrival`(set: phen_port2 true)·`cs_arin_letter`)

**Interfaces:** Consumes T1(act2_port·awake2). Produces: `flags.port2_vortex_found`(T3 던전 게이트 조건), `story_port2_arin`. 증언은 awake2 E 조사 시 `witness_porter/witness_sailor` 플래그를 FrozenVillager가… **아님** — FrozenVillager는 플래그 계약이 없으므로 증언 완료 판정은 트리거 near(두 주민 위치 순차 방문)로 단순화: port2_witness 트리거는 near(부두 중간)+flagsAll 없이 스테이지·순서 게이트만. 구현 시 이 단순화 유지(주민 E는 연출, 진행은 트리거).
- 아린 서신: `cs_arin_letter` — 전령 조우·봉인 서신 낭독(화자 "왕도 전령")·아린 갈등 대사. "그분" 직접 명명 금지.

- [ ] Step 1: 저작+데이터(카메라 확정 샷 2장 — 얼어붙은 파도 위 정지 갈매기 프레이밍은 부두 수면 방향 수평 샷으로).
- [ ] Step 2: `sp2a-t2-port.js` — act2_port 주입→항구 진입→arrival 컷신·phen_port2 활성(fog 색 실측)→증언 주민 2명 awake2 대사→vortex 트리거→arin 컷신. phen_port(구플래그)와 공존 시 port2 우선 실측.
- [ ] Step 3: tsc·배치 감사·커밋 `[feat] SP2a 항구 챕터 서사 — 멈춘 파도 재발·증언·소용돌이·아린 서신`

### Task 3: 미니 던전 「침수 창고」

**Files:**
- Modify: `src/app/games/rpg/data/dungeonData.ts` (`port_warehouse` DungeonDef + DUNGEON_DOORS 2개)
- Modify: `src/app/games/rpg/data/gameData.ts` (정예 템플릿 `ghoul_drowned` — ghoul 기반 Lv+2·스탯 1.25×·청록 tint 상시(비주얼은 tint 필드)·FIELD_ENEMIES에 던전 내 2팩 배치)

**Interfaces:** Consumes T1·T2(`port2_vortex_found`). Produces: 던전 내부 보스 진입 지점 좌표(T4 트리거가 사용 — 보고서에 명기). 게이트 E는 `flags.port2_vortex_found` 조건 추가(DungeonController 게이트 확장 — 조건 없으면 기존 동작·optional `requireFlag?: string` 필드).

- [ ] Step 1: 항구층(-38) 하부 실측 프로브 → 게이트 1쌍(XZ 10m+ 오프셋 규약)·문/스위치 2개·정예 2팩 좌표 확정(이원 검증+감사).
- [ ] Step 2: 구현+`sp2a-t3-warehouse.js` — vortex 전 게이트 잠김→발견 후 왕복·조명·문 2개 개폐·정예 전투 1회(승리)·미니맵 지하 라벨.
- [ ] Step 3: tsc·커밋 `[feat] SP2a 침수 창고 던전 — 게이트 조건·정예 팩·이원 검증 좌표`

### Task 4: 항구 보스 「파도를 삼킨 자」 + 유물①

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts` (SKILLS: `wave_snap`/`wave_surge`/`tide_swallow`(freeze 1턴 라이더) + ENEMY_TEMPLATES `wave_devourer` — ghoul 모델·scale 1.6·Lv13·boss 2페이즈(70% 격노 tint `#3f8fa3`·smart / 30% scaleMul 1.15 tint `#2b6b7d`)·gimmick every 3 `tide_swallow` warning "🌊 파도가 삼켜진다")
- Modify: `src/app/games/rpg/data/storyData.ts` (던전 최심부 보스 트리거 — cutscene `cs_port2_relic`을 boss_done 트리거에·**battle 필드 병기 규약**)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (`cs_port2_relic` — battle 스텝(보스전) 포함 진입 컷신 + 격파 후 유물 회수·파도 풀림·set { phen_port2: false })

**Interfaces:** Consumes T3 보스 진입 좌표. Produces: `defeated_port2_boss_0`·`flags.relic_wave`(유물① — T8 검증·SP2b 게이트), act2_hill 전이는 relic 트리거의 nextStage.
- 수치 게이트: 보스→파티 3턴 사이클 출력 = 마수(gear_devourer) 대비 **+10~15%**, 파티→보스 TTK는 Lv13 파티 근사 기준 마수전 ±10%. ts-node 양방향 표 필수.

- [ ] Step 1: 데이터+TTK 시뮬 → Step 2: `sp2a-t4-waveboss.js`(페이즈·기믹·freeze 실부여·승리 실경로·패배 재도전·relic 후 phen_port2 소등·act2_hill 전이) → Step 3: 커밋 `[feat] SP2a 파도를 삼킨 자 — 2페이즈·조수 기믹·유물①·항구 시간 복구`

### Task 5: 언덕 챕터 서사 (반복되는 하루·로티 서사)

**Files:** zonePhenomena(`phen_hill` — hill 존: dirIntensity 3.2·ambientColor `#e8c890`·fog `#c9a86a`/14/80·particles 300/`#f5e6c8`/0.05) · storyData(체인 4: hill2_arrival(컷신+점등)·hill2_witness·hill2_source·hill2_lotti(컷신)) · frozenData(f_shepherd·f_hermit awake2From "act2_hill"+증언) · cutsceneData(`cs_hill2_arrival`·`cs_lotti_home` — 사부 조리 노트 낭독, 공방 장인 교차 복선 1줄, 로티 톤 전환)

**Interfaces:** Consumes T1·T4(act2_hill 전이). Produces: `flags.hill2_source_found`(T6 던전 게이트). T2와 동일 패턴 — 저작·검증·커밋 구조 동일(스크립트 `sp2a-t5-hill.js`). 커밋 `[feat] SP2a 언덕 챕터 서사 — 반복되는 하루·증언·로티의 조리 노트`

### Task 6: 제단 지하 던전 + 「새벽을 삼킨 자」 + 유물② + 브리지

**Files:** dungeonData(`hill_undercroft` + 문 2·requireFlag hill2_source_found) · gameData(정예 `bull_altar`(mad_bull Lv+2·호박 tint) + SKILLS `dawn_snap`/`dawn_flare`/`dawn_swallow`(stun 1턴) + `dawn_devourer` — mad_bull·scale 1.5·Lv14·2페이즈(tint `#d98e2b`→`#b26a10`)·gimmick every 3 warning "🌅 새벽이 삼켜진다") · storyData(보스 트리거 battle 병기 + relic 트리거 cutscene `cs_hill2_relic`(set { phen_hill: false }) + SP2b 브리지 대사 트리거(다음 이상 징후 — 서부 숲 예고, nextStage 없음·`flags.act2a_done` setFlags)) · cutsceneData(`cs_hill2_relic`)

**Interfaces:** Consumes T5. Produces: `defeated_hill2_boss_0`·`flags.relic_dawn`·`flags.act2a_done`(SP2b 진입점). 수치: 항구 보스 대비 +5~10%(양방향 게이트 동일). T3·T4 패턴 준용(실측·감사·TTK·헤드리스 `sp2a-t6-hillboss.js`). 커밋 `[feat] SP2a 제단 지하·새벽을 삼킨 자 — 유물②·언덕 시간 복구·2b 브리지`

### Task 7: 레벨 커브 확장 — 신규 스킬 3종·expToNext 확인

**Files:** gameData(SKILLS 3종: `arin_bulwark`(방어기 — 파티 피해감소 버프·unlockLevel 14·QTE 플랜 기존 재사용)·`theo_tempest`(광역 마법·unlockLevel 14)·`lotti_cheer`(지원 — 파티 buff_atk·unlockLevel 14) — 수치는 기존 Lv12 스킬 대비 +15~25% 상향·TTK 시뮬로 확정) · playerSlice 확인(expToNext 커브가 Lv16+까지 유효한지 — 부족 시 연장, 변경 시 근거 명기)

- [ ] Step 1: ts-node — 기존 스킬 테이블 상대 수치 표 + 신규 3종 배치·양방향 TTK 재확인(보스 2기 상대) → Step 2: 헤드리스 — Lv14 도달 주입 후 3종 습득·전투 사용(QTE 경로) 각 1회 → Step 3: 커밋 `[feat] SP2a 레벨 커브 — 파티 신규 스킬 3종(Lv14)·커브 검증`

### Task 8: 통합 검증 + 최종 전체 리뷰

- [ ] Step 1: `sp2a-t8-full.js` — 에필로그 세이브 → 막간①→항구(현상·아크·던전·보스·유물·아린)→언덕(동일+로티)→브리지, awake2 분기(1막 상태 awake vs 2막 awake2), 실경로 우선. 2회 연속.
- [ ] Step 2: 회귀 — SP1 배터리(sp1-t3·t5·t5b·t7-full-act1)·sp0 스모크(t2·t4-boss)·drawcall(항구 현상+던전 측정점)·구세이브 2종(에필로그·ch3) 호환·tsc·eslint.
- [ ] Step 3: 원장·보고 → 최종 전체 리뷰(fable)는 컨트롤러가 별도 파견.

---

## Self-Review 결과

- 스펙 커버리지: §①=T1(act2_intro 생략은 해석 노트로 명기), §②=T2·T3·T4, §③=T5·T6, §④=T1(omen)+T2/T5(서사 편입)+귀환 보고 대사(→T5·T6의 storyData 작업에 요리사 분기 1비트씩 포함 — T2/T6 Files의 storyData 수정에 접합), §⑤=T7(+T4/T6의 TTK), §⑥=전 태스크+T8. 누락: 요리사 귀환 보고를 T4(항구 완료 후)·T6(언덕 완료 후) Step 1에 각 1비트 명기 — 반영함(FieldMerchant 분기, stage 게이트).
- 플레이스홀더: 좌표·대사 본문은 실측·저작 산출물(방법·게이트 명시). 보스 수치는 상대 게이트(±10%·+10~15%/+5~10%)로 구속 ✓.
- 타입 일관성: awake2From/awake2(T1↔T2/T5), requireFlag(T3↔T6), relic_wave/relic_dawn/act2a_done(T4/T6↔T8), phen_port2/phen_hill(T2/T5↔T4/T6 소등) 교차 확인 ✓.
