# RPG 2.0 SP0 — 연출·전투 기반 공사 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2.0 리메이크 전체가 얹힐 4개 기반 시스템 — 컷신/이벤트, 보스 프레임워크, 던전 프레임워크, 존 현상 툴킷 — 을 구축하고 각각 테스트 콘텐츠로 헤드리스 검증한다.

**Architecture:** 전부 기존 패턴 위에 얹는다 — zustand 슬라이스(신규 cutsceneSlice), 필드 컨트롤러 컴포넌트(FieldScene 마운트, 스로틀 useFrame), 데이터 주도(data/*.ts 선언), 헤드리스 검증(qa-lib). 마스터 스펙: `docs/superpowers/specs/2026-07-27-rpg-2.0-remake-design.md`.

**Tech Stack:** Next.js + R3F + zustand + three-mesh-bvh. 테스트: ts-node 순수 로직 assert + puppeteer 헤드리스(qa-lib).

## Global Constraints

- tsc 에러 ≤ 26 유지(감소 허용·증가 금지). eslint 신규 에러 0 — 단, zustand 슬라이스 시그니처 관례 `(set: any, get: any)`와 그 내부 `(s: any)` 캐스트는 리포 전역 관례(기존 13개 슬라이스 동일)로 예외. (T1 리뷰에서 발견된 플랜 자기모순 정정 — verbatim 코드가 우선)
- 필드 드로우콜 ≤ 500 (현재 ~160). 신규 상시 useFrame은 스로틀(`frame % N`) 필수.
- 신규 세이브 필드는 전부 optional — 구세이브 무손상. 컷신 상태는 세이브 미포함(transient).
- 신규 배치 좌표는 헤드리스 착지 검증(`__navFindWalkable` 스냅 드리프트 ≤1.2m) 필수.
- 커밋: main 직행, 한국어 `[feat]/[fix]` 컨벤션, 태스크당 1커밋.
- 헤드리스 규약: 크롬 플래그 5종(`rpg-headless-harness` 메모리), `NODE_PATH=$PWD/node_modules`, qa-lib의 `enterGame()`(베이크 대기 포함)·`cleanState()` 재사용. 스크립트 위치는 세션 스크래치패드.
- 대사 소거·로머 난입·베이크 rAF 정지 등 플레이크 대응은 qa-lib 규약 준수.

---

### Task 1: 컷신 데이터 모델 + cutsceneSlice

**Files:**
- Create: `src/app/games/rpg/data/cutsceneData.ts`
- Create: `src/app/games/rpg/presenter/slices/cutsceneSlice.ts`
- Modify: `src/app/games/rpg/presenter/useGameStore.ts` (슬라이스 통합 — import·타입 유니온·spread 3곳)

**Interfaces:**
- Produces: `CutsceneStep` 유니온, `CUTSCENES: Record<string, CutsceneStep[]>`, 슬라이스 상태 `cutscene: null | { id: string; index: number }`, 액션 `startCutscene(id: string): void`, `advanceCutsceneStep(): void`, `skipCutscene(): void`.
- 설계 결정: **`set` 스텝(플래그·스토리·보상)은 `startCutscene`에서 전부 선적용(트랜잭션)** — 컷신 도중 세이브/이탈해도 상태 유실 없음. 재생은 순수 연출. 스킵은 대사·카메라 정리만.

- [ ] **Step 1: cutsceneData.ts 작성**

```ts
// rpg/data/cutsceneData.ts — 컷신 시퀀스 선언 (연출 타임라인, 데이터 주도)
import type { Vec3 } from "../types/RpgTypes";
import type { DialogueLine } from "./storyData";
import type { StoryState } from "../presenter/slices/storySlice";

export type CutsceneStep =
    | { type: "say"; line: DialogueLine }
    /** 카메라 이동 — pos 생략 시 현 위치 고정, lookAt만 전환. ms 동안 보간 후 hold ms 유지 */
    | { type: "cam"; pos?: Vec3; lookAt: Vec3; ms: number; hold?: number }
    /** 3인칭 카메라로 복귀 보간 */
    | { type: "camReset"; ms: number }
    | { type: "wait"; ms: number }
    | { type: "fx"; popup: { text: string; color: string } }
    /** 상태 변경 — startCutscene에서 선적용됨(재생 순서와 무관) */
    | {
          type: "set";
          flags?: Record<string, boolean>;
          story?: Partial<StoryState>;
          giveGold?: number;
          giveItems?: Array<{ id: string; qty: number }>;
      }
    /** 이벤트 전투 — 진입 즉시 다음 인덱스로 저장되어 전투 복귀 후 이어서 재생 */
    | { type: "battle"; id: string; templates: string[] };

export const CUTSCENES: Record<string, CutsceneStep[]> = {
    // SP0 검증용 — SP1에서 실제 컷신으로 교체·확장
    sp0_test: [
        { type: "set", flags: { sp0_cutscene_seen: true }, giveGold: 1 },
        { type: "cam", pos: { x: 16, y: -28, z: -18 }, lookAt: { x: 12.8, y: -32, z: -14 }, ms: 1200, hold: 400 },
        { type: "say", line: { speakerId: "arin", text: "(SP0 테스트) 광장이 보인다." } },
        { type: "fx", popup: { text: "✨ 연출 테스트", color: "#7dd3fc" } },
        { type: "wait", ms: 300 },
        { type: "camReset", ms: 800 },
    ],
    sp0_test_battle: [
        { type: "say", line: { speakerId: "theo", text: "(SP0 테스트) 기척입니다 — 전투!" } },
        { type: "battle", id: "sp0_evt", templates: ["slime"] },
        { type: "say", line: { speakerId: "lotti", text: "(SP0 테스트) 전투 후에도 이어진다!" } },
        { type: "set", flags: { sp0_battle_cutscene_done: true } },
    ],
};
```

- [ ] **Step 2: cutsceneSlice.ts 작성**

```ts
// rpg/presenter/slices/cutsceneSlice.ts — 컷신 재생 상태 (transient — 세이브 미포함)
"use client";

import { CUTSCENES } from "../../data/cutsceneData";

export const cutsceneSlice = (set: any, get: any) => ({
    cutscene: null as null | { id: string; index: number },

    startCutscene: (id: string) => {
        const steps = CUTSCENES[id];
        if (!steps || get().cutscene) return;
        // set 스텝 선적용 — 도중 세이브/이탈에도 상태 유실 없음 (재생은 순수 연출)
        for (const st of steps) {
            if (st.type !== "set") continue;
            if (st.flags) set((s: any) => ({ flags: { ...s.flags, ...st.flags } }));
            if (st.story) get().setStory(st.story);
            if (st.giveGold) get().gainGold(st.giveGold);
            if (st.giveItems) for (const it of st.giveItems) get().addItem(it.id, it.qty);
        }
        set({ cutscene: { id, index: 0 } });
    },

    /** 현재 스텝 완료 → 다음으로. 끝이면 종료. battle 스텝은 컨트롤러가 진입 "전"에 호출해 둔다. */
    advanceCutsceneStep: () => {
        const c = get().cutscene;
        if (!c) return;
        const steps = CUTSCENES[c.id] ?? [];
        const next = c.index + 1;
        set({ cutscene: next >= steps.length ? null : { id: c.id, index: next } });
    },

    skipCutscene: () => {
        if (!get().cutscene) return;
        set({ cutscene: null, dialogue: [] }); // set 스텝은 이미 선적용됨
    },
});
```

- [ ] **Step 3: useGameStore.ts 통합** — import 목록에 `import { cutsceneSlice } from "./slices/cutsceneSlice";`, `GameState` 유니온에 `ReturnType<typeof cutsceneSlice> &`, create 본문에 `...cutsceneSlice(set, get),` (기존 슬라이스 3곳 패턴 그대로).

- [ ] **Step 4: 순수 로직 검증 (ts-node) — 실패 확인 후 통과**

```bash
npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' -e "
const { cutsceneSlice } = require('./src/app/games/rpg/presenter/slices/cutsceneSlice');
let state: any = { flags: {}, dialogue: [], player: { gold: 0 } };
const set = (p: any) => { state = { ...state, ...(typeof p === 'function' ? p(state) : p) }; };
const get: any = () => ({ ...state, ...api,
  setStory: (x: any) => (state.story = x),
  gainGold: (g: number) => (state.player.gold += g),
  addItem: () => {} });
const api: any = cutsceneSlice(set, get);
api.startCutscene('sp0_test');
console.assert(state.cutscene?.index === 0, 'start');
console.assert(state.flags.sp0_cutscene_seen === true, 'set 선적용');
console.assert(state.player.gold === 1, 'giveGold 선적용');
for (let i = 0; i < 6; i++) api.advanceCutsceneStep();
console.assert(state.cutscene === null, '종료');
api.startCutscene('sp0_test'); api.skipCutscene();
console.assert(state.cutscene === null && state.dialogue.length === 0, 'skip');
console.log('cutsceneSlice OK');
"
```
Expected: 구현 전 모듈 없음 실패 → 구현 후 `cutsceneSlice OK`, assert 경고 0.

- [ ] **Step 5: tsc 게이트 후 커밋**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ 26 확인
git add src/app/games/rpg/data/cutsceneData.ts src/app/games/rpg/presenter/slices/cutsceneSlice.ts src/app/games/rpg/presenter/useGameStore.ts
git commit -m "[feat] SP0 컷신 데이터 모델·슬라이스 — set 스텝 선적용 트랜잭션"
```

---

### Task 2: CutsceneController — 카메라 연출·입력 게이트·스킵

**Files:**
- Create: `src/app/games/rpg/field/CutsceneController.tsx`
- Modify: `src/app/games/rpg/camera/ThirdPersonCamera.tsx` (useFrame 첫 줄 게이트)
- Modify: `src/app/games/rpg/field/FieldPlayer.tsx` (이동 입력 게이트 — useFrame 초입의 대화 게이트와 같은 위치)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (`<CutsceneController />` 마운트 — `<ThirdPersonCamera />` 직전)
- Modify: `src/app/games/rpg/ui/DialogueUI.tsx` (컷신 중 하단 힌트 "Enter 길게: 스킵")

**Interfaces:**
- Consumes: Task 1의 `cutscene` 상태·`CUTSCENES`·`advanceCutsceneStep`·`skipCutscene`, 기존 `startDialogue`.
- Produces: 컷신 중 `scene.userData.__cutsceneCam = true`(다른 시스템 참조용). say 스텝은 `startDialogue([line])`로 기존 대사 UI 재사용.

- [ ] **Step 1: CutsceneController 작성**

```tsx
// rpg/field/CutsceneController.tsx — 컷신 스텝 실행기 (카메라 보간·대사 대기·스킵)
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { CUTSCENES } from "../../data/cutsceneData"; // 경로 주의: field/ 기준 ../data
// (실경로: ../data/cutsceneData — 구현 시 확인)

const SKIP_HOLD_MS = 800;

export function CutsceneController() {
    const { camera, scene } = useThree();
    const stepRef = useRef<{ key: string; startedAt: number; phase: "run" | "hold"; from?: THREE.Vector3; fromLook?: THREE.Vector3 } | null>(null);
    const savedCam = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
    const holdStart = useRef<number | null>(null);
    const _look = useRef(new THREE.Vector3());

    // Enter 홀드 스킵
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key !== "Enter" || !useGame.getState().cutscene) return;
            if (holdStart.current === null) holdStart.current = performance.now();
        };
        const up = (e: KeyboardEvent) => {
            if (e.key !== "Enter") return;
            if (holdStart.current !== null && performance.now() - holdStart.current >= SKIP_HOLD_MS) {
                useGame.getState().skipCutscene();
                stepRef.current = null;
                savedCam.current = null;
                scene.userData.__cutsceneCam = false;
            }
            holdStart.current = null;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, [scene]);

    useFrame(() => {
        const g = useGame.getState();
        const c = g.cutscene;
        if (!c) {
            if (scene.userData.__cutsceneCam) scene.userData.__cutsceneCam = false;
            stepRef.current = null;
            return;
        }
        scene.userData.__cutsceneCam = true;
        const steps = CUTSCENES[c.id] ?? [];
        const step = steps[c.index];
        if (!step) { g.advanceCutsceneStep(); return; }
        const key = `${c.id}:${c.index}`;
        const now = performance.now();

        // 스텝 진입 처리 (1회)
        if (stepRef.current?.key !== key) {
            stepRef.current = { key, startedAt: now, phase: "run" };
            if (!savedCam.current) {
                savedCam.current = { pos: camera.position.clone(), look: camera.position.clone().add(camera.getWorldDirection(_look.current).clone().multiplyScalar(3)) };
            }
            if (step.type === "say") g.startDialogue([step.line]);
            if (step.type === "fx") { g.spawnPopup({ side: "ally", ...step.popup }); g.advanceCutsceneStep(); return; }
            if (step.type === "set") { g.advanceCutsceneStep(); return; } // 선적용됨 — 재생 시 무시
            if (step.type === "battle") {
                g.advanceCutsceneStep(); // 복귀 후 다음 스텝부터 재개되도록 먼저 전진
                g.startCombat({ group: step.templates.map((template, i) => ({ template, fieldId: `${step.id}_${i}` })) });
                return;
            }
            if (step.type === "cam" || step.type === "camReset") {
                stepRef.current.from = camera.position.clone();
                stepRef.current.fromLook = savedCam.current.look.clone();
            }
        }
        const st = stepRef.current!;
        const elapsed = now - st.startedAt;

        if (step.type === "say") {
            if (g.dialogue.length === 0) g.advanceCutsceneStep();
            return;
        }
        if (step.type === "wait") {
            if (elapsed >= step.ms) g.advanceCutsceneStep();
            return;
        }
        if (step.type === "cam") {
            const t = Math.min(1, elapsed / step.ms);
            const e = t * t * (3 - 2 * t); // smoothstep
            if (step.pos) camera.position.lerpVectors(st.from!, new THREE.Vector3(step.pos.x, step.pos.y, step.pos.z), e);
            _look.current.lerpVectors(st.fromLook!, new THREE.Vector3(step.lookAt.x, step.lookAt.y, step.lookAt.z), e);
            camera.lookAt(_look.current);
            if (t >= 1) {
                st.fromLook = new THREE.Vector3(step.lookAt.x, step.lookAt.y, step.lookAt.z);
                if (elapsed >= step.ms + (step.hold ?? 0)) g.advanceCutsceneStep();
            }
            return;
        }
        if (step.type === "camReset") {
            const t = Math.min(1, elapsed / step.ms);
            const e = t * t * (3 - 2 * t);
            camera.position.lerpVectors(st.from!, savedCam.current!.pos, e);
            _look.current.lerpVectors(st.fromLook!, savedCam.current!.look, e);
            camera.lookAt(_look.current);
            if (t >= 1) { savedCam.current = null; g.advanceCutsceneStep(); }
            return;
        }
    });

    return null;
}
```

- [ ] **Step 2: ThirdPersonCamera 게이트** — `useFrame((_, dt) => {` 직후에 추가:

```ts
        // 컷신 중에는 CutsceneController가 카메라를 소유
        if (useGame.getState().cutscene) return;
```

- [ ] **Step 3: FieldPlayer 이동 게이트** — useFrame 초입(펜딩 텔레포트 처리 이후, 이동 입력 처리 이전)의 기존 게이트 나열부에 컷신 게이트 추가. 기존 대사 중 이동 정지 처리가 있는 지점을 찾아(`dialogue.length` 검색) 같은 조건에 `|| gState.cutscene`를 추가한다. 대사 게이트가 없다면 이동 벡터 계산 직전에:

```ts
        if (gState.cutscene) {
            // 컷신 중 이동·상호작용 정지 (연출 카메라와 충돌 방지)
            return;
        }
```

- [ ] **Step 4: FieldScene 마운트** — import 추가 후 `<ThirdPersonCamera …/>` 윗줄에 `<CutsceneController />`.

- [ ] **Step 5: DialogueUI 스킵 힌트** — `useGame((s) => s.cutscene)` 구독 추가, 하단 "Space ▸" 옆에 컷신 중일 때 `<span className="ml-2">| Enter 길게: 스킵</span>`.

- [ ] **Step 6: 헤드리스 검증 스크립트 작성·실행** (스크래치패드 `sp0-t2-cutscene.js`)

```js
const { enterGame, cleanState } = require("./qa-lib");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const { browser, page } = await enterGame();
    await cleanState(page);
    const camBefore = await page.evaluate(() => {
        const c = window.__fieldScene.userData; return null; // 카메라는 R3F 내부 — 위치 대신 상태로 검증
    });
    await page.evaluate(() => window.__game.getState().startCutscene("sp0_test"));
    await wait(500);
    const mid = await page.evaluate(() => ({
        active: !!window.__game.getState().cutscene,
        camFlag: !!window.__fieldScene.userData.__cutsceneCam,
        gold: window.__game.getState().player.gold,
        flag: !!window.__game.getState().flags.sp0_cutscene_seen,
    }));
    console.log("진행 중:", JSON.stringify(mid)); // active·camFlag true, set 선적용(gold≥1, flag true)
    // 대사 스텝 도달 대기 → 스페이스로 진행
    for (let i = 0; i < 20; i++) {
        await wait(400);
        const d = await page.evaluate(() => window.__game.getState().dialogue.length);
        if (d > 0) { await page.keyboard.press("Space"); }
        const done = await page.evaluate(() => !window.__game.getState().cutscene);
        if (done) break;
    }
    const end = await page.evaluate(() => ({
        active: !!window.__game.getState().cutscene,
        camFlag: !!window.__fieldScene.userData.__cutsceneCam,
    }));
    console.log("종료:", JSON.stringify(end), end.active === false && end.camFlag === false ? "PASS" : "FAIL");
    // 스킵 검증
    await page.evaluate(() => window.__game.getState().startCutscene("sp0_test"));
    await wait(300);
    await page.keyboard.down("Enter"); await wait(1000); await page.keyboard.up("Enter");
    const skipped = await page.evaluate(() => !window.__game.getState().cutscene);
    console.log("스킵:", skipped ? "PASS" : "FAIL");
    await browser.close();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
```
Expected: 진행 중 active/camFlag true + 선적용 확인, 종료·스킵 PASS.

- [ ] **Step 7: tsc·eslint 게이트 후 커밋** — `[feat] SP0 컷신 컨트롤러 — 카메라 연출·입력 게이트·Enter 홀드 스킵`

---

### Task 3: 컷신 이벤트 전투 — 전투 경유 재개

**Files:**
- Test only (구현은 Task 1·2에 이미 포함 — battle 스텝 선전진 + 상태 보존): 스크래치패드 `sp0-t3-battle-cutscene.js`

**Interfaces:**
- Consumes: `sp0_test_battle` 컷신, 승리 주입 규약(적 hp 0 → `checkCombatEnd()` → `exitBattle()`).

- [ ] **Step 1: 헤드리스 검증 — 전투 진입·복귀·재개**

```js
const { enterGame, cleanState } = require("./qa-lib");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const { browser, page } = await enterGame();
    await cleanState(page);
    await page.evaluate(() => window.__game.getState().startCutscene("sp0_test_battle"));
    // 대사 1 진행 → battle 스텝 → 전투 진입 대기
    for (let i = 0; i < 20; i++) {
        await wait(400);
        if ((await page.evaluate(() => window.__game.getState().dialogue.length)) > 0)
            await page.keyboard.press("Space");
        if ((await page.evaluate(() => window.__game.getState().combat.phase)) !== "idle") break;
    }
    const inBattle = await page.evaluate(() => ({
        phase: window.__game.getState().combat.phase,
        cutsceneIndex: window.__game.getState().cutscene?.index,
    }));
    console.log("전투 진입:", JSON.stringify(inBattle)); // phase !== idle, index는 battle 다음(2)
    // 승리 주입 → 필드 복귀 → 컷신 재개 확인
    await wait(2000);
    await page.evaluate(() => {
        const s = window.__game.getState();
        s.combat.enemies?.forEach((e) => (e.stats.hp = 0));
        s.checkCombatEnd();
    });
    await wait(1000);
    await page.evaluate(() => { const s = window.__game.getState(); if (s.combat.phase === "victory") s.exitBattle(); });
    // 복귀 후 남은 대사 진행 → 종료 플래그
    for (let i = 0; i < 20; i++) {
        await wait(500);
        if ((await page.evaluate(() => window.__game.getState().dialogue.length)) > 0)
            await page.keyboard.press("Space");
        if (await page.evaluate(() => !window.__game.getState().cutscene)) break;
    }
    const done = await page.evaluate(() => ({
        flag: !!window.__game.getState().flags.sp0_battle_cutscene_done,
        idle: window.__game.getState().combat.phase === "idle",
        over: !window.__game.getState().cutscene,
    }));
    console.log("재개·완료:", JSON.stringify(done), done.flag && done.idle && done.over ? "PASS" : "FAIL");
    await browser.close();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
```
Expected: 전투 진입 시 cutsceneIndex=2(battle 다음), 복귀 후 로티 대사 재생·플래그 true·PASS. 실패 시 CutsceneController의 battle 분기(선전진 순서)를 점검.

- [ ] **Step 2: 커밋** — `[feat] SP0 컷신 이벤트 전투 검증 — 전투 경유 재개 확인` (스크립트는 스크래치패드 — 코드 변경 없으면 검증만 기록하고 커밋 생략 가능)

---

### Task 4: 보스 프레임워크 — 페이즈 전이·비주얼 변형

**Files:**
- Modify: `src/app/games/rpg/types/RpgTypes.ts` (Enemy 확장 + BossDef)
- Create: `src/app/games/rpg/presenter/bossHelpers.ts`
- Modify: `src/app/games/rpg/presenter/slices/turnSlice.ts:100` (applyDamage에 페이즈 전이)
- Modify: `src/app/games/rpg/actors/ModelAvatar.tsx` (`tint?: string` prop — 지정 시 머티리얼 배열 복제 후 color 곱)
- Modify: `src/app/games/rpg/battle/EnemyMesh.tsx` (enemy.tint/phaseScale → ModelAvatar 전달)
- Modify: `src/app/games/rpg/data/gameData.ts` (ENEMY_TEMPLATES에 `sp0_test_boss` 추가)

**Interfaces:**
- Produces (RpgTypes):

```ts
export type BossPhase = {
    /** 이 페이즈로 전이되는 HP 비율 상한 — hp/maxHp ≤ hpPct 이면 해당 페이즈 이상 */
    hpPct: number;
    announce?: string;
    skills?: string[];
    aiPattern?: Enemy["aiPattern"];
    tint?: string;
    scaleMul?: number;
};
export type BossDef = {
    phases: BossPhase[]; // hpPct 내림차순 정렬 가정 (예: [0.7, 0.3])
    gimmick?: { type: "countdown"; every: number; skillId: string; warning: string };
};
// Enemy에 추가: boss?: BossDef; tint?: string; phase?: number; gimmickCharge?: number;
```
- Produces (bossHelpers): `bossPhaseIndex(hpRatio: number, phases: BossPhase[]): number` — 현재 도달한 최고 페이즈 인덱스(-1 = 기본).

- [ ] **Step 1: bossHelpers.ts + ts-node assert (실패 → 구현 → 통과)**

```ts
// rpg/presenter/bossHelpers.ts — 보스 페이즈 순수 계산
import type { BossPhase } from "../types/RpgTypes";

/** hpRatio(0~1)가 넘어선 마지막 페이즈 인덱스. 못 넘었으면 -1 */
export function bossPhaseIndex(hpRatio: number, phases: BossPhase[]): number {
    let idx = -1;
    for (let i = 0; i < phases.length; i++) {
        if (hpRatio <= phases[i].hpPct) idx = i;
    }
    return idx;
}
```

```bash
npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' -e "
const { bossPhaseIndex } = require('./src/app/games/rpg/presenter/bossHelpers');
const P = [{ hpPct: 0.7 }, { hpPct: 0.3 }];
console.assert(bossPhaseIndex(1.0, P) === -1);
console.assert(bossPhaseIndex(0.7, P) === 0);
console.assert(bossPhaseIndex(0.31, P) === 0);
console.assert(bossPhaseIndex(0.3, P) === 1);
console.assert(bossPhaseIndex(0.01, P) === 1);
console.log('bossHelpers OK');
"
```

- [ ] **Step 2: applyDamage 페이즈 전이** — turnSlice.applyDamage에서 대상이 적이고 `enemy.boss`가 있으면 hp 갱신 직후:

```ts
            // 보스 페이즈 전이 — hp 임계 통과 시 스킬셋/패턴/비주얼 교체 + 선언 연출
            if (enemy.boss) {
                const ratio = enemy.stats.hp / enemy.stats.maxHp;
                const next = bossPhaseIndex(ratio, enemy.boss.phases);
                const cur = enemy.phase ?? -1;
                if (next > cur) {
                    const ph = enemy.boss.phases[next];
                    enemy.phase = next;
                    if (ph.skills) enemy.skills = ph.skills;
                    if (ph.aiPattern) enemy.aiPattern = ph.aiPattern;
                    if (ph.tint) enemy.tint = ph.tint;
                    if (ph.scaleMul) enemy.scale = (ENEMY_TEMPLATES[enemy.template!]?.scale ?? 1) * ph.scaleMul;
                    if (ph.announce)
                        get().spawnPopup({ side: "enemy", text: ph.announce, color: "#f87171" });
                    get().triggerFX?.({ side: "enemy", intensity: 1 });
                }
            }
```
(주의: applyDamage의 기존 set 콜백 구조에 맞춰 불변 업데이트로 작성 — enemies 배열 map으로 교체. 위 코드는 로직 명세이며 실제로는 `combat.enemies.map(e => e.id === id ? {...e, phase: next, skills: ..., tint: ...} : e)` 형태로 구현.)

- [ ] **Step 3: ModelAvatar tint prop** — Props에 `tint?: string;` 추가. root useMemo 뒤 `useEffect([tint])`에서:

```ts
    // 페이즈 틴트 — 공유 머티리얼 오염 방지: tint 지정 시에만 인스턴스 복제 후 착색
    useEffect(() => {
        if (!tint || !groupRef.current) return;
        const c = new THREE.Color(tint);
        groupRef.current.traverse((o: any) => {
            if (!o.isMesh && !o.isSkinnedMesh) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            const cloned = mats.map((m: any) => {
                const cm = m.clone();
                cm.color?.multiply(c);
                if (cm.emissive) { cm.emissive.set(tint); cm.emissiveIntensity = 0.25; }
                return cm;
            });
            o.material = Array.isArray(o.material) ? cloned : cloned[0];
        });
    }, [tint]);
```

- [ ] **Step 4: EnemyMesh 전달** — ModelAvatar 호출부(245행 부근)에 `tint={enemy.tint}` 추가, scale 계산에 enemy.scale 반영(기존 templateScale 자리 — 이미 scale을 쓰면 enemy.scale 우선으로).

- [ ] **Step 5: sp0_test_boss 템플릿** — gameData ENEMY_TEMPLATES에 추가:

```ts
    sp0_test_boss: {
        name: "시험의 수문장",
        model: "/character/Zombie_Male.fbx",
        level: 8,
        stats: { hp: 900, maxHp: 900, mp: 0, maxMp: 0, atk: 18, def: 8, speed: 10, luck: 5 },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: { exp: 200, gold: 150, items: [] },
        scale: 1.8,
        boss: {
            phases: [
                { hpPct: 0.7, announce: "…수문장이 격노한다!", tint: "#ff6b6b", aiPattern: "smart", skills: ["slash", "clockwork_burst"] },
                { hpPct: 0.3, announce: "…시간이 일그러진다!", tint: "#c084fc", scaleMul: 1.2 },
            ],
            gimmick: { type: "countdown", every: 3, skillId: "clockwork_burst", warning: "⏳ 태엽이 감긴다" },
        },
    },
```
(`clockwork_burst` = 기존 "태엽 폭발" 스킬 id — gameData에서 실제 id 확인 후 사용. 없으면 기존 적 스킬 id로 대체.)

- [ ] **Step 6: 헤드리스 검증** (`sp0-t4-boss.js`) — `startCombat({ group: [{ template: "sp0_test_boss", fieldId: "sp0_boss_0" }] })` → `applyDamage("sp0_boss_0", 300)` (70% 통과) → enemies[0].phase===0·tint 설정·announce 팝업 확인 → 추가 400 데미지(30% 통과) → phase===1·scale 확대 확인 → hp 0 → victory → exitBattle. PASS/FAIL 출력. (스크립트 골격은 Task 3과 동일 — evaluate로 상태 주입·검증.)

- [ ] **Step 7: tsc 게이트 후 커밋** — `[feat] SP0 보스 프레임워크 — HP 임계 페이즈 전이·틴트/스케일 변형·선언 연출`

---

### Task 5: 보스 카운트다운 기믹 + 보스 UI

**Files:**
- Modify: `src/app/games/rpg/presenter/slices/enemyActionsSlice.ts` (`startEnemyTelegraph` 초입 — 보스 기믹 차지/강제 스킬)
- Modify: `src/app/games/rpg/ui/DamageFeedUI.tsx:81` (`EnemyHealthBarTop` — 페이즈 마커·기믹 카운터)

**Interfaces:**
- Consumes: Task 4의 `Enemy.boss.gimmick`·`gimmickCharge`.
- Produces: 보스 턴마다 `gimmickCharge` 증가, `charge % every === 0`인 턴에 `gimmick.skillId` 강제 사용 + 직전 턴들에 `warning (N턴 전)` 팝업.

- [ ] **Step 1: startEnemyTelegraph 수정** — 행동 스킬 선택 로직 앞에:

```ts
        // 보스 카운트다운 기믹 — every턴마다 지정 스킬 강제, 그 외 턴엔 경고
        const enemy = getEnemyById(s, enemyId)!;
        let forcedSkillId: string | null = null;
        if (enemy.boss?.gimmick) {
            const gk = enemy.boss.gimmick;
            const charge = (enemy.gimmickCharge ?? 0) + 1;
            // (불변 업데이트로 enemies 배열에 gimmickCharge 반영)
            if (charge % gk.every === 0) {
                forcedSkillId = gk.skillId;
            } else {
                const left = gk.every - (charge % gk.every);
                get().spawnPopup({ side: "enemy", text: `${gk.warning} — ${left}턴`, color: "#fbbf24" });
            }
        }
```
이후 기존 스킬 선택 결과 대신 `forcedSkillId`가 있으면 그것을 사용.

- [ ] **Step 2: EnemyHealthBarTop 확장** — 보스(enemy.boss 존재)일 때: HP바 위에 페이즈 임계 위치 세로 마커(`left: hpPct*100%`), 우측에 `⏳ N` 카운터(`every - (gimmickCharge % every)`).

- [ ] **Step 3: 헤드리스 검증** (`sp0-t5-gimmick.js`) — 보스전 진입 → 파티 hp 넉넉히 → 플레이어 턴마다 공격으로 턴 소비 ×3회전 → 팝업 로그에 warning 2회·3번째 보스 턴에 `clockwork_burst` 사용 확인(combat 로그/popups·enemyResolve 시 action.skillId), DOM에 ⏳ 표시 존재. PASS/FAIL.

- [ ] **Step 4: 커밋** — `[feat] SP0 보스 카운트다운 기믹·보스 UI(페이즈 마커·카운터)`

---

### Task 6: 던전 프레임워크 — 게이트 왕복·조명 프로파일·지하 미니맵

**Files:**
- Create: `src/app/games/rpg/data/dungeonData.ts`
- Create: `src/app/games/rpg/field/DungeonController.tsx`
- Modify: `src/app/games/rpg/environment/InteriorLighting.tsx` (`scene.userData.__lightOverride` 소비)
- Modify: `src/app/games/rpg/ui/MiniMap.tsx` (지하 모드 — 베이크 대신 어두운 패널+라벨)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)

**Interfaces:**
- Produces: `DUNGEONS: DungeonDef[]`, `dungeonAt(x: number, y: number, z: number): DungeonDef | null`(y·XZ 박스 판정), `scene.userData.__lightOverride: { ambient: number; lamp: number } | undefined`, `scene.userData.__dungeonActive: string | undefined`(미니맵 소비).

```ts
export type DungeonDef = {
    id: string;
    label: string;
    /** 지상↔지하 게이트 쌍 — E 상호작용으로 왕복 */
    gates: Array<{ overworld: { x: number; y: number; z: number }; underground: { x: number; y: number; z: number } }>;
    /** XZ 박스 + y 상한(이 아래면 던전 내부로 판정) */
    region: { minX: number; maxX: number; minZ: number; maxZ: number; yMax: number };
    light: { ambient: number; lamp: number; fogColor: string; fogNear: number; fogFar: number };
};
```

- [ ] **Step 1: 지하 수로층 실측 프로브** — 헤드리스에서 마을 아래 지하층 y밴드·유효 좌표를 실측한다:

```js
// scratchpad/sp0-t6-probe.js — enterGame 후:
const rows = await page.evaluate(() => {
    const g = window.__fieldScene.userData.__navGroundAt;
    const out = [];
    for (const [x, z] of [[12, -14], [20, -10], [30, -20], [40, -30], [10, 0], [0, -10]]) {
        // 지상(-33) 아래 밴드로 지하 표면 수색
        for (const refY of [-40, -45, -50, -55]) {
            const y = g(x, z, refY, 3, 3);
            if (y !== null && y < -36) out.push({ x, z, y: +y.toFixed(2) });
        }
    }
    return out;
});
```
출력된 지하 표면 좌표 2곳을 골라(서로 8m+ 이격, `__navFindWalkable` 스냅 드리프트 ≤1.2m 확인) 게이트 underground 좌표와 region(yMax = 지상 지면 -35 부근, 실측값 기준)을 확정하고 dungeonData에 기록한다. 지상 게이트는 광장 근처 실측 walkable 지점 사용. **이 실측값이 나오기 전에는 dungeonData를 커밋하지 않는다.**

- [ ] **Step 2: dungeonData.ts 작성** — Step 1 실측 좌표로 `sp0_waterway`(수로 시험 구간) 1건 + `dungeonAt` 헬퍼(박스+y 판정, 순수 함수).

- [ ] **Step 3: DungeonController 작성** — 8프레임 스로틀 useFrame: `__playerWorldPos`로 `dungeonAt` 판정 → 진입 시 `scene.userData.__dungeonActive = d.id`, `__lightOverride = { ambient: d.light.ambient, lamp: d.light.lamp }`, `scene.fog = new THREE.Fog(d.light.fogColor, d.light.fogNear, d.light.fogFar)`; 이탈 시 전부 원복(`scene.fog = null`, delete). 게이트: 각 게이트 양단 2.6m 내 E키(기존 FieldSmith 키 핸들러 패턴 — combat idle·dialogue 0·패널 닫힘 게이트 동일) → `requestTeleport(반대편)` + `spawnPopup`.

- [ ] **Step 4: InteriorLighting 소비** — targetAmb/targetLamp 계산 직후:

```ts
        const ov = scene.userData.__lightOverride as { ambient: number; lamp: number } | undefined;
        const targetAmb2 = ov ? ov.ambient : targetAmb;
        const targetLamp2 = ov ? ov.lamp : targetLamp;
```
이후 lerp 대상을 targetAmb2/targetLamp2로 교체.

- [ ] **Step 5: MiniMap 지하 모드** — view 갱신 setInterval에서 `sc?.userData.__dungeonActive` 읽어 state에 포함. active면 `<img>` 대신 `bg-slate-950/90` 패널 + 중앙 라벨(던전 label) + 플레이어 화살표만 렌더.

- [ ] **Step 6: 헤드리스 검증** (`sp0-t6-dungeon.js`) — 지상 게이트로 텔레포트 → E → 플레이어 y가 지하 밴드(실측값 ±2) 도달·`__dungeonActive` 설정·`scene.fog` 존재·미니맵 DOM에 던전 라벨 → 지하 게이트에서 E → 지상 복귀·오버라이드 해제. PASS/FAIL.

- [ ] **Step 7: 커밋** — `[feat] SP0 던전 프레임워크 — 게이트 왕복·조명 프로파일·지하 미니맵 (지하 수로 실측 좌표)`

---

### Task 7: 스위치-문 프리미티브

**Files:**
- Modify: `src/app/games/rpg/data/dungeonData.ts` (`DUNGEON_DOORS` 추가)
- Create: `src/app/games/rpg/field/DungeonDoor.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (DUNGEON_DOORS map 마운트)

**Interfaces:**
- Produces: `DUNGEON_DOORS: Array<{ id: string; flag: string; door: { pos: Vec3; size: [number, number, number] }; switch: { pos: Vec3; label: string } }>`. 문 닫힘 = 메시가 `scene.userData.__environmentMeshes`에 등록되어 플레이어 벽 레이캐스트에 걸림. 스위치 E → `flags[flag] = true` → 문 개방(메시 제거·목록 제거).

- [ ] **Step 1: DungeonDoor 작성** — 닫힘 상태: boxGeometry 메시(색 어두운 청동, `userData.__type = "environment"`) 렌더 + 마운트 시 `ensureBoundsTree` 후 `__environmentMeshes.push(mesh)`, 언마운트/개방 시 배열에서 제거(splice). 스위치: 기존 FieldSmith E 패턴(inRange 2.6m·게이트 동일) → 플래그 set + `spawnPopup("🔓 " + label)`. `flags[flag]` 구독으로 개방 반영.
- [ ] **Step 2: 테스트 도어 1건** — Task 6 실측 지하 구간 통로에 배치(문·스위치 좌표 모두 walkable 검증). 데이터에 `sp0_door`.
- [ ] **Step 3: 헤드리스 검증** (`sp0-t7-door.js`) — 닫힘: `__environmentMeshes`에 문 메시 존재 + 문 너머로 이동 시도(문 앞 0.5m에서 `moveTo` 반복 or 벽 레이 확인 — 간단히는 문 위치로 카메라 레이캐스트 hit 확인) → 스위치 E → 플래그 true·메시 목록에서 제거. PASS/FAIL.
- [ ] **Step 4: 커밋** — `[feat] SP0 스위치-문 프리미티브 — 플래그 구동 통행 차단/개방`

---

### Task 8: 존 현상 툴킷 + 항구 「멈춘 파도」 프로토타입

**Files:**
- Create: `src/app/games/rpg/data/zonePhenomena.ts`
- Create: `src/app/games/rpg/field/ZonePhenomenon.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)

**Interfaces:**
- Produces:

```ts
export type PhenomenonDef = {
    zone: string;            // ZONE_DEFS id
    flag: string;            // 이 플래그가 true인 동안 활성 (SP2에서 스토리로 제어)
    fog?: { color: string; near: number; far: number };
    dirIntensity?: number;   // 디렉셔널 라이트 강도 오버라이드
    ambientColor?: string;   // 앰비언트 틴트
    particles?: { count: number; color: string; size: number; yBand: [number, number] };
};
export const ZONE_PHENOMENA: PhenomenonDef[];
export function phenomenonAt(x: number, z: number, flags: Record<string, boolean>): PhenomenonDef | null;
```
- `phenomenonAt`: ZONE_DEFS 최근접 중심(보로노이) 존 → 그 존의 활성(flag true) 현상. 던전 내부(`__dungeonActive`)면 항상 null(던전 조명 우선).

- [ ] **Step 1: zonePhenomena.ts** — port 항목:

```ts
export const ZONE_PHENOMENA: PhenomenonDef[] = [
    {
        zone: "port",
        flag: "phen_port",
        fog: { color: "#5b7a8c", near: 12, far: 70 },
        dirIntensity: 2.6, // 기본 5.2의 절반 — 멈춘 새벽빛
        ambientColor: "#a8c4d4",
        particles: { count: 400, color: "#cfe8f5", size: 0.06, yBand: [-38, -30] },
    },
];
```
- [ ] **Step 2: ZonePhenomenon.tsx** — 10프레임 스로틀 useFrame으로 `phenomenonAt` 판정. 활성 전이 시: `scene.fog` 설정, 디렉셔널 라이트(마운트 시 1회 `scene.traverse`로 DirectionalLight 획득) intensity 저장 후 오버라이드, ambientColor는 자체 `<ambientLight>` 추가 렌더. 파티클: `<points>` — 존 중심 주변 반경 60m에 yBand 내 정적 부유(회전·낙하 없음 = "멈춘 시간" 연출), BufferGeometry 1회 생성. 비활성 전이 시 전부 원복·언마운트. Fog는 DungeonController와 소유권 충돌 방지: `__dungeonActive`면 양보(현상 쪽이 양보).
- [ ] **Step 3: 헤드리스 검증** (`sp0-t8-phenomenon.js`) — `flags.phen_port = true` 주입 + 항구(200, -38, 1) 텔레포트 → `scene.fog` 색 `#5b7a8c`·파티클 Points 존재·디렉셔널 intensity 2.6 확인 → 마을로 텔레포트 → 원복(fog null·intensity 5.2) 확인 → 스크린샷 1장(rAF 내 drawImage 방식 — CDP screenshot 금지) 저장해 육안 확인. PASS/FAIL.
- [ ] **Step 4: 커밋** — `[feat] SP0 존 현상 툴킷 — 선언적 환경 오버라이드 + 항구 멈춘 파도 프로토타입`

---

### Task 9: 통합 회귀·성능 게이트·마무리

**Files:** 없음 (검증·기록만)

- [ ] **Step 1: tsc·eslint 최종 게이트** — `npx tsc --noEmit | grep -c "error TS"` ≤ 26, 변경 파일 eslint 신규 에러 0(main 대비 stash 비교).
- [ ] **Step 2: 기존 QA 스모크 재실행** — qa1-combat.js(전투 코어)·verify-bake.js(베이크·네브메시·채집) 재실행 전부 PASS 확인. 신규 컨트롤러 4개(Cutscene·Dungeon·Door·Phenomenon)가 비활성 상태에서 프레임 갭에 영향 없는지 perf-startup-gpu.js 정지 타임라인이 이전과 동급인지 확인.
- [ ] **Step 3: 드로우콜 확인** — perf-probe.js 재실행: 필드 드로우콜 ≤ 500 (파티클 Points +1콜 수준).
- [ ] **Step 4: 메모리 갱신** — rpg-economy-rounds(또는 신규 rpg2-progress 메모리)에 SP0 완료·다음 SP1 기록.
- [ ] **Step 5: 최종 커밋** — 잔여 변경 정리 커밋 후 SP0 완료 보고.

---

## Self-Review 결과

- **스펙 커버리지**: SP0 4개 시스템(컷신 T1-3 / 보스 T4-5 / 던전 T6-7 / 현상 T8) + 스펙의 "항구 현상 선검증" T8 + 성능 예산·검증 원칙 T9. 누락 없음.
- **플레이스홀더**: 던전 좌표만 실측 의존 — T6 Step 1에 실측 절차·커밋 게이트 명시(측정 전 커밋 금지)로 처리.
- **타입 일관성**: `advanceCutsceneStep`(T1↔T2), `BossPhase.hpPct`·`bossPhaseIndex`(T4↔T5), `__lightOverride`·`__dungeonActive`(T6↔T8) 교차 확인 완료.
