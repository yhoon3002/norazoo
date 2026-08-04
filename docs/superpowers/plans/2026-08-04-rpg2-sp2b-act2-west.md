# RPG 2.0 SP2b — 2막 서부·북부(대삼림·숲길·수변) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2막 두 번째 묶음 — 대삼림·숲길·수변 존 챕터 3(현상·아크·던전 2·보스 3·유물 ③④⑤), 테오 서사 2장, 빌런 복선, SP2c 브리지.

**Architecture:** SP0 4계(컷신·보스·던전·존 현상) + SP1/SP2a 확장(트리거 cutscene/setFlags/battle 병기·FrozenVillager awake2·DungeonDef requireFlag/lockedLine) 위에 순수 데이터 저작. 신규 프레임워크 0.

**Tech Stack:** Next.js + React Three Fiber + zustand. 헤드리스 검증은 puppeteer + SwiftShader(공용 qa-lib.js).

**스펙:** docs/superpowers/specs/2026-08-04-rpg2-sp2b-act2-west-design.md (수치·대사 소재·플래그 명칭의 원본 — 태스크 서술과 다르면 스펙이 우선)

## Global Constraints

- tsc 기준선 26(**리포 루트에서 실행** — 스크래치패드 실행 시 가짜 0), eslint 신규 0(기존 slice 관례 `any` 제외).
- 프레임워크/전투 로직 신규 코드 0 — 데이터 저작만. 라이더는 기존 StatusEffect 타입 재사용(burn/debuff_def/poison — 스펙 §②③④ 배정).
- 존 챕터 트리거는 **보스 포함 전 구간 순서 게이트**(flagsAll `story_<이전id>`) — SP2a 최종 리뷰 F1 규약.
- 던전 내부 스토리 트리거(보스)는 **문2 플래그 병기**(door_*_2) 또는 y 게이트 — SP2a 최종 리뷰 F2 규약. 야외 보스(숲길)는 순서 게이트만으로 충분.
- 보스 트리거에 battle 필드 병기(재도전 게이트) / relic 회수·현상 소등·전이는 defeated_* 게이트 별도 트리거 / battle 컷신 giveGold 금지.
- 신규 좌표 전부 이원 검증(navFindWalkable 드리프트 ≤1.2m + 실텔레포트 착지, **y 명시**) + 배치 감사(상호작용물 3.5m+ / 로머·정예 캠프 8m+ / 보스 트리거↔정예 8m+).
- 게이트 XZ 10m+ 오프셋. 컷신 카메라 walkable 앵커+수평 시선(부감 금지)+rAF drawImage 확정 샷.
- TTK 양방향 게이트 연쇄: season vs dawn_devourer +5~10% / path vs season +0~5% / flow vs path +5~10%, 파티→보스 ±10%(ts-node 표 필수, sp2a-t4/t6-ttk.ts 산식 구조 재사용).
- 헤드리스: 공용 qa-lib.js **수정 금지**(enterGame/cleanState/Runner), caffeinate -di nohup, 상태 주입 전 cutscene/dialogue 선정리, 전투 진입 직후 combat.enemies undefined 레이스 방어, 전부 동기 실행, 실패 1회 재실행 플레이크 판정.
- 스테이지 append-only·신규 플래그만(세이브 호환). NPC_SPEAKERS 화자 전수 등록(보스 포함).

---

### Task 1: 개막·스테이지 + 대삼림 서사 체인 (테오 1장)

**Files:**
- Modify: `src/app/games/rpg/data/storyData.ts` (STAGE_ORDER append `act2_forest`/`act2_woods`/`act2_water` + 트리거 체인: forest_arrival(stage act2_hill·flagsAll act2a_done·근접 대삼림 접근로·cutscene cs_forest_arrival·nextStage act2_forest) → forest_herbalist(증언 대사) → forest_rift(`forest_rift_found` setFlags) → forest_theo(cutscene cs_theo_camp) — 각 flagsAll 순서 게이트. NPC_SPEAKERS 신규 화자 등록)
- Modify: `src/app/games/rpg/data/zonePhenomena.ts` (`phen_forest` — west_forest 존: fog `#9fb86a`/12/70·dirIntensity 2.6·particles 450/`#e8c06a`/0.06)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (`cs_forest_arrival`(첫 set 스텝 phen_forest:true·사계 혼재 연출)·`cs_theo_camp`(스승 연구 캠프 — 에테르 계측 기구 잔해·노트 낭독·테오 학자 시절 개시))

**Interfaces:** Consumes SP2a(`act2a_done`, STAGE_ORDER 말단 act2_hill). Produces: `forest_rift_found`(T2 던전 게이트)·`story_forest_theo`(T3 보스 순서 게이트)·3 스테이지(전 태스크 공용). 증언 NPC 앵커: 약초술사(-212.5, -18.25, 106.5) 기존재(questData).

- [ ] Step 1: 대삼림 접근로·체인 4지점 실측(이원 검증+감사, 다층 y 명시. 약초술사 인근 트리거는 기존 퀘스트 NPC 상호작용 반경과 3.5m+ 이격) → 데이터 저작(대사·연출은 스펙 §② 소재. 로어: 1막 확립 체계·테오 기존 말투(경어·기록 애호) 유지).
- [ ] Step 2: `sp2b-t1-forest.js` — act2a_done 세이브에서 전이 발동, 체인 4 순서(선행 미충족 미발동 포함 양방향), 점등 실측, act2_hill(SP2a 상태)에서 신규 트리거 미발동, 컷신 2종 완주+샷, 페이지 에러 0.
- [ ] Step 3: tsc·eslint → 커밋 `[feat] SP2b 대삼림 개막 — 3스테이지·계절 현상·조사 아크·테오의 캠프`

### Task 2: 미니 던전 「뿌리 굴」

**Files:**
- Modify: `src/app/games/rpg/data/dungeonData.ts` (`forest_rootcave` DungeonDef — requireFlag `forest_rift_found`·lockedLine 대삼림 소재 문구·게이트 1쌍 XZ 10m+·심녹 조명 + DUNGEON_DOORS 문/스위치 2)
- Modify: `src/app/games/rpg/data/gameData.ts` (정예 `zombie_seasoned` — zombie Lv+2·스탯 1.25×·금녹 tint·FIELD_ENEMIES 던전 내 2팩)

**Interfaces:** Consumes T1(`forest_rift_found`). Produces: 보스 진입 지점 export(T3 트리거 좌표)·`door_forest_rootcave_2` 플래그(T3 보스 트리거 병기).

- [ ] Step 1: 대삼림 하부 실측 개척(T3/T6 방법 계승: 그리드 프로브→방 폭·자연 벽·상층 우회층 파악. 상층 우회층 있으면 도달성 판정(TERRAIN_STEP_MAX 2.1m BFS+실WASD) 먼저 — T3 전례) → 좌표 확정(이원 검증+감사, 문 span 실벽까지·높이 상층 커버).
- [ ] Step 2: `sp2b-t2-rootcave.js` — rift 전 잠김(+lockedLine 문구)→발견 후 왕복·조명·문 2 개폐(우회 불가)·정예 1승·미니맵 라벨.
- [ ] Step 3: tsc → 커밋 `[feat] SP2b 뿌리 굴 던전 — 게이트 조건·정예 팩·이원 검증 좌표`

### Task 3: 「계절을 삼킨 자」 + 유물③

**Files:**
- Modify: `src/app/games/rpg/data/gameData.ts` (SKILLS 적 전용 `season_snap`/`season_veil`/`season_swallow`(burn 1턴 라이더) + ENEMY_TEMPLATES `season_devourer` — mage 모델·scale 1.5·Lv15·2페이즈(70% 금녹 격노 smart/30% scaleMul 1.15 틴트 심화)·gimmick every 3 warning "🍂 계절이 삼켜진다")
- Modify: `src/app/games/rpg/data/storyData.ts` (forest_boss 트리거 — flagsAll [forest_rift_found, story_forest_theo, door_forest_rootcave_2]·battle 병기·cutscene cs_forest_boss + forest_relic 트리거 — flagsAll [defeated_forest_boss_0]·phen_forest 소등·`relic_season`·nextStage 없음(사냥꾼 전언 트리거가 act2_woods 전이) + forest_to_woods 전언 트리거(relic_season 게이트·nextStage act2_woods))
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (cs_forest_boss(battle 스텝)·cs_forest_relic(유물③ 회수·사계가 제철로 돌아오는 연출))

**Interfaces:** Consumes T2(보스 진입 좌표·door2 플래그). Produces: `relic_season`·`defeated_forest_boss_0`·act2_woods 전이. TTK: dawn_devourer 대비 +5~10% 양방향(`sp2b-t3-ttk.ts`).

- [ ] Step 1: 데이터+TTK 표 → Step 2: `sp2b-t3-seasonboss.js`(페이즈·기믹 burn 실부여·순서/문 게이트 양방향·승리·패배 재도전 시 phen 유지·relic 후 소등·전언 전이) → Step 3: 커밋 `[feat] SP2b 계절을 삼킨 자 — 2페이즈·burn 기믹·유물③`

### Task 4: 숲길 경량 챕터 — 추적 아크·야외 보스·유물④·빌런 복선

**Files:**
- Modify: `src/app/games/rpg/data/zonePhenomena.ts` (`phen_woods` — north_woods: fog `#7a8fa6`/10/60·dirIntensity 1.8·파티클 역류 설정(불가 시 색·밀도 대체 근거 명기))
- Modify: `src/app/games/rpg/data/storyData.ts` (체인: woods_arrival(cutscene cs_woods_arrival·점등) → woods_hunter(증언) → woods_trace1·woods_trace2(흔적 2구간 — trace2에 `woods_trace_found` setFlags·태엽 부품 공방 각인 대사) → woods_boss(야외 정점·flagsAll 순서 게이트 전체·battle 병기·cutscene cs_woods_boss) → woods_relic(defeated 게이트·phen_woods 소등·`relic_path`·**빌런 실루엣 1프레임 연출**) → woods_to_water 전언(nextStage act2_water))
- Modify: `src/app/games/rpg/data/gameData.ts` (적 전용 `path_snap`/`path_veil`/`path_swallow`(debuff_def 2턴) + `path_devourer` — frost_witch·scale 1.45·Lv15·2페이즈·gimmick every 3 warning "🌫 길이 삼켜진다" + 정예 `witch_rewound`(witch Lv+2) 추적로 1팩)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (cs_woods_arrival(발자국 역재생 연출)·cs_woods_boss·cs_woods_relic(노인 뒷모습 1프레임 — cam 스텝 구도로 표현, 직접 명명 금지))

**Interfaces:** Consumes T3(act2_woods 전이). Produces: `relic_path`·act2_water 전이. 사냥꾼 앵커(-139.5,-31.25,-215.5) 기존재. TTK: season 대비 +0~5%.

- [ ] Step 1: 추적로 4지점+정점 실측(이원+감사·보스 트리거↔정예 8m+) → 저작(빌런 복선: 명명 금지·각인·실루엣) → Step 2: `sp2b-t4-woods.js`(체인 순서 양방향·점등/소등·debuff_def 실부여·야외 보스 게이트·유물④) + TTK 표 → Step 3: 커밋 `[feat] SP2b 숲길 — 역류 추적·길을 삼킨 자·유물④·빌런 복선`

### Task 5: 수변 서사 체인 (테오 2장)

**Files:**
- Modify: `src/app/games/rpg/data/zonePhenomena.ts` (`phen_water` — ne_water: fog `#5a7f8f`/12/65·dirIntensity 2.0·particles 400/`#bfe4f0`/0.05)
- Modify: `src/app/games/rpg/data/storyData.ts` (체인: water_arrival(cutscene cs_water_arrival·점등) → water_fisher(강태공 증언) → water_gate(`water_gate_found` setFlags) → water_theo(cutscene cs_theo_master))
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (cs_water_arrival(상승 수류 연출)·cs_theo_master(스승 노트 — "탑을 세운 이가 찾아왔다…" 빌런 교차·스승 행방 미해결로 열어 둠))

**Interfaces:** Consumes T4(act2_water 전이). Produces: `water_gate_found`(T6 던전 게이트)·`story_water_theo`(T6 보스 순서 게이트). 강태공 앵커(233.5,-47.25,-261.5) 기존재.

- [ ] Step 1: 체인 4지점 실측+저작(테오 톤 일관·1막 무모순) → Step 2: `sp2b-t5-water.js`(T1 구조 동일) → Step 3: 커밋 `[feat] SP2b 수변 서사 — 상승 수류·증언·수문·스승의 노트`

### Task 6: 「수문 하부」 던전 + 「흐름을 삼킨 자」 + 유물⑤ + 2c 브리지

**Files:**
- Modify: `src/app/games/rpg/data/dungeonData.ts` (`water_underflow` — requireFlag `water_gate_found`·lockedLine 수변 문구·게이트 XZ 10m+·청색 조명·문/스위치 2)
- Modify: `src/app/games/rpg/data/gameData.ts` (정예 `ninja_upstream`(ninja Lv+2) 2팩 + 적 전용 `flow_snap`/`flow_veil`/`flow_swallow`(poison 2턴) + `flow_devourer` — ninja·scale 1.55·Lv16·2페이즈·gimmick every 3 warning "🌊 흐름이 삼켜진다")
- Modify: `src/app/games/rpg/data/storyData.ts` (water_boss — flagsAll [water_gate_found, story_water_theo, door_water_underflow_2]·battle 병기 + water_relic — defeated 게이트·phen_water 소등·`relic_flow` + act2b_bridge — 대사·`act2b_done` setFlags·남부 해안 예고·nextStage 없음)
- Modify: `src/app/games/rpg/data/cutsceneData.ts` (cs_water_boss·cs_water_relic(물이 제 길로 돌아오는 연출))

**Interfaces:** Consumes T5. Produces: `relic_flow`·`act2b_done`(SP2c 진입점). TTK: path 대비 +5~10%.

- [ ] Step 1: 수변 하부 실측 개척(T2 방법) → Step 2: `sp2b-t6-flowboss.js`(T3 구조 + 던전 왕복·브리지 발동·act2b_done) + TTK 표 → Step 3: 커밋 `[feat] SP2b 수문 하부·흐름을 삼킨 자 — 유물⑤·수변 시간 복구·2c 브리지`

### Task 7: 통합 검증 + 최종 전체 리뷰

- [ ] Step 1: `sp2b-t7-full.js` — act2a_done 세이브 → 대삼림(아크→던전→보스→유물③)→숲길(추적→야외 보스→유물④)→수변(아크→던전→보스→유물⑤)→브리지 실경로, 2회 연속.
- [ ] Step 2: 회귀 — SP2a(sp2a-t2-port·sp2a-t8-full)·SP1(sp1-t7-full-act1)·sp0 스모크(t2·t4-boss)·구세이브 2종(act2a_done·에필로그)·드로우콜 3존 현상 점등 상태 ≤500·tsc·eslint. 복원본 스크립트 실패 시 회귀 vs 아티팩트 판별.
- [ ] Step 3: 원장·보고 → 최종 전체 리뷰(fable)는 컨트롤러가 별도 파견.

---

## Self-Review 결과

- 스펙 커버리지: §①=T1(전이)+T3/T4(전언 전이)+T6(브리지), §②=T1~T3, §③=T4, §④=T5~T6, §⑤=T2/T4/T6(정예)+T3/T4/T6(TTK 연쇄)+커브 무변경 확인(T7에 expToNext 재확인 편입), §⑥=전 태스크+T7. 컷신 합계 10(아크 7+보스 3) — 스펙 "7종+보스 3종 별도"와 일치.
- 플레이스홀더: 좌표는 실측 산출(방법·게이트 명시), 대사는 스펙 소재+로어 제약으로 구속, 수치는 상대 게이트로 구속 ✓.
- 타입 일관성: forest_rift_found/water_gate_found(T1/T5↔T2/T6 requireFlag), door_forest_rootcave_2/door_water_underflow_2(T2/T6↔T3/T6 보스 병기), relic_season/path/flow·act2b_done(T3/T4/T6↔T7·SP2c), story_forest_theo/story_water_theo(T1/T5↔T3/T6 순서 게이트) 교차 확인 ✓.
