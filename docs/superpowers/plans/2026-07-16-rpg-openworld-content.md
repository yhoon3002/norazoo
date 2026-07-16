# RPG 오픈월드 콘텐츠 확장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 튜토리얼을 짧게 압축하고, 트레일 밖 맵 전역에 콘텐츠(리스폰 배회 몬스터·황금 약초·전망 POI·숨은 보물·사이드 퀘스트 4종·항구 낚시)를 배치한다.

**Architecture:** 콘텐츠는 전부 데이터 선언(gameData/poiData/questData) + 범용 필드 컴포넌트(RespawnController/FieldPoi/FieldQuestNpc/FishingSpot). 리스폰은 비영속 `fieldSlice` 타이머(키 = 되살릴 플래그들의 `|` 연결 문자열). 지도(미니맵/전체지도)에 "?"/❗ 마커 연동.

**Tech Stack:** 기존 스택 그대로 (Next.js + R3F + drei + zustand). 신규 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-07-16-rpg-openworld-content-design.md`

## Global Constraints

- 테스트 러너 없음. 검증 = `npx tsc --noEmit 2>&1 | grep -c "error TS"` ≤ **28** (기준선) + 브라우저 확인은 사용자 최종 검증으로 위임.
- 코드 스타일: 4칸 들여쓰기, 한국어 주석, 파일 헤더 `// rpg/<경로> — <설명>`, 클라이언트 컴포넌트 `"use client"`.
- 커밋: 태스크별 명시된 파일만 `git add` (작업 트리에 무관한 변경 존재). `git add -A`/`.` 금지. 메시지는 `[feat]/[fix]` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 캐릭터 보이스(대사 작성 시): 아린=짧고 단호한 반말, 테오=수다스러운 존댓말("흥미롭네요"), 로티=밝은 반말·음식 비유·요리사를 "사부님"이라 부름. NPC 대사는 `speaker`, 파티원 대사는 `speakerId`만 설정.
- 위치 좌표는 navFindWalkable(최근접 walkable 나선 탐색, 반경 10m)이 스냅해 주므로 ±수 m 오차 허용. 단 FieldTreasure는 스냅 없이 데이터 y 그대로 사용 — 반드시 검증된 지면 높이(마을 -33.25, 항구 -38.25, 항구길 중간 -37.25/-34.25)를 쓴다.

---

### Task 1: 튜토리얼 압축 (스폰 이동 + 트레일 축소)

**Files:**
- Modify: `src/app/games/rpg/presenter/slices/playerSlice.ts` (PLAYER_INITIAL.pos)
- Modify: `src/app/games/rpg/data/storyData.ts` (TRAIL_TOWN 교체)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (데이터만). 해방된 어귀~광장 길(x 28~93)은 Task 2~4의 콘텐츠 배치 지역.

- [ ] **Step 1: 스폰 이동**

playerSlice.ts의 `PLAYER_INITIAL` 좌표와 주석을 교체:

```ts
const PLAYER_INITIAL: Player = {
    // 광장 초입 — 요리사(광장)까지 ~20m. 튜토리얼을 짧게 끝내고
    // 마을 어귀~광장 길(동쪽 81m)은 자유 탐험 지역으로 해방한다.
    pos: { x: 28, y: -33.2, z: -24 },
    party: DEFAULT_PARTY.slice(0, 3).map(calculateStats),
    activeCharacter: 0,
    gold: 0,
    formation: "balanced",
};
```

- [ ] **Step 2: TRAIL_TOWN 축소**

storyData.ts의 `TRAIL_TOWN` 배열 전체(25포인트)를 광장 초입→광장 구간만 남기고 교체 (주석 포함):

```ts
// 벽 여유거리 가중 경로(길 중앙) + 수면·지하층·적 캠프 회피, 전 구간 도보 검증.
// [x, y(지면), z] — y는 렌더 시 navmesh로 재보정.
// 튜토리얼 압축: 스폰(광장 초입)→광장 구간만 안내한다.
export const TRAIL_TOWN: Array<[number, number, number]> = [
    [28, -33.25, -24],
    [28, -33.25, -20.5],
    [27.3, -33.25, -17.7],
    [24.5, -33.25, -17],
    [18.2, -33.25, -17],
    [14.7, -33.25, -17],
];
```

(`TRAIL_PORT_ROAD`, `TRAIL_BY_STAGE`는 변경하지 않는다.)

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: ≤ 28.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/rpg/presenter/slices/playerSlice.ts src/app/games/rpg/data/storyData.ts
git commit -m "[feat] 튜토리얼 압축 — 광장 초입 스폰(요리사까지 ~20m), 어귀 길 자유 탐험 지역으로 해방

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 리스폰 시스템 + 배회 몬스터 + 신규 아이템

**Files:**
- Create: `src/app/games/rpg/presenter/slices/fieldSlice.ts`
- Create: `src/app/games/rpg/field/RespawnController.tsx`
- Modify: `src/app/games/rpg/presenter/useGameStore.ts` (fieldSlice 통합)
- Modify: `src/app/games/rpg/data/gameData.ts` (FIELD_ENEMIES respawn 타입+배회 무리, GOLDEN_HERB_SPOTS, ITEM_PRICES, ENEMY_TEMPLATES 드롭)
- Modify: `src/app/games/rpg/field/FieldGatherable.tsx` (respawnMs prop)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (RespawnController·황금 약초 마운트, respawnMs 전달)
- Modify: `src/app/games/rpg/menu/MenuUI.tsx` (MATERIALS 신규 항목)

**Interfaces:**
- Consumes: `flags` (defeated_*/gather_*), `FIELD_ENEMIES`
- Produces:
  - `fieldRespawn: Record<string, number>` — 키 = 리스폰 시 지울 플래그들을 `|`로 연결한 문자열, 값 = 리스폰 예정 시각(ms)
  - `scheduleRespawn(key: string, delayMs: number): void`
  - `consumeRespawns(): void`
  - `FIELD_ENEMIES` 항목의 `respawn?: number`(ms)
  - `GOLDEN_HERB_SPOTS: Array<{ x: number; y: number; z: number }>`
  - `FieldGatherable`의 새 prop `respawnMs?: number`
  - 아이템 id: `monster_core`, `golden_herb`, `fish_common`, `fish_rare`, `kite` (가격/표시명 등록 — fish/kite는 Task 4·5에서 사용)

- [ ] **Step 1: fieldSlice.ts 생성**

```ts
// rpg/presenter/slices/fieldSlice.ts — 필드 리스폰 타이머 (비영속 — 세이브에 저장하지 않는다)
"use client";

export const fieldSlice = (set: any, get: any) => ({
    /** key = 리스폰 시 지울 플래그들을 '|'로 연결한 문자열, 값 = 예정 시각(ms) */
    fieldRespawn: {} as Record<string, number>,

    scheduleRespawn: (key: string, delayMs: number) =>
        set((s: any) => ({
            fieldRespawn: { ...s.fieldRespawn, [key]: Date.now() + delayMs },
        })),

    /** 만료된 타이머를 소거하고 해당 플래그를 지워 리스폰시킨다 */
    consumeRespawns: () => {
        const now = Date.now();
        const due = Object.entries(
            get().fieldRespawn as Record<string, number>
        ).filter(([, at]) => now >= at);
        if (!due.length) return;
        set((st: any) => {
            const fieldRespawn = { ...st.fieldRespawn };
            const flags = { ...st.flags };
            for (const [key] of due) {
                delete fieldRespawn[key];
                for (const f of key.split("|")) delete flags[f];
            }
            return { fieldRespawn, flags };
        });
    },
});
```

- [ ] **Step 2: useGameStore.ts에 통합**

import 목록에 추가하고, `GameState` 교차 타입과 스토어 스프레드 양쪽에 넣는다 (storySlice와 같은 패턴):

```ts
import { fieldSlice } from "./slices/fieldSlice";
// GameState: ... & ReturnType<typeof fieldSlice> & { ... }
// 스토어: ...fieldSlice(set, get),
```

- [ ] **Step 3: gameData.ts — 타입/배회 무리/황금 약초/아이템**

`FIELD_ENEMIES` 선언 타입에 `respawn?: number`를 추가:

```ts
export const FIELD_ENEMIES: Array<
    | { id: string; pos: THREE.Vector3; templates: string[]; respawn?: number }
    | { id: string; pos: THREE.Vector3; template: string; respawn?: number }
> = [
```

기존 e1~e3 항목 뒤에 추가:

```ts
    // ===== 배회 몬스터 — 길 밖 필드 라이프 (3분 리스폰) =====
    { id: "r1", pos: new THREE.Vector3(46, -33.25, -30), templates: ["slime", "slime"], respawn: 180_000 },
    { id: "r2", pos: new THREE.Vector3(68, -33.25, -33), template: "orc", respawn: 180_000 },
    { id: "r3", pos: new THREE.Vector3(88, -33.25, -22), templates: ["slime", "mage"], respawn: 180_000 },
    { id: "r4", pos: new THREE.Vector3(126, -33.25, -20), template: "orc", respawn: 180_000 },
    { id: "r5", pos: new THREE.Vector3(196, -37.25, 2), templates: ["slime", "slime", "slime"], respawn: 180_000 },
    // 파수꾼 퀘스트 전용 무리 (리스폰 없음 — Task 4에서 사용)
    { id: "bounty1", pos: new THREE.Vector3(52, -33.25, -46), templates: ["orc", "orc"] },
];
```

`FIELD_GATHERABLES` 아래에 추가:

```ts
// ===== 황금 약초 — 필드 진입마다 후보 3곳 중 랜덤 1곳 스폰 (3분 리스폰) =====
export const GOLDEN_HERB_SPOTS: Array<{ x: number; y: number; z: number }> = [
    { x: 52, y: -33.25, z: -24 },
    { x: 112, y: -33.25, z: -32 },
    { x: 205, y: -38.25, z: 8 },
];
```

`ITEM_PRICES`에 추가:

```ts
    monster_core: 45,
    golden_herb: 60,
    fish_common: 18,
    fish_rare: 90,
```

`ENEMY_TEMPLATES`의 `orc`와 `mage`의 `rewards.items` 배열에 각각 추가 (배열이 없으면 만든다):

```ts
                { id: "monster_core", chance: 0.15 },
```

- [ ] **Step 4: MenuUI.tsx MATERIALS 등록**

`MATERIALS` 테이블에 추가:

```ts
    monster_core: { name: "마물 결정" },
    golden_herb: { name: "황금 약초" },
    fish_common: { name: "생선" },
    fish_rare: { name: "월광어" },
    kite: { name: "연" },
```

- [ ] **Step 5: RespawnController.tsx 생성**

```tsx
// rpg/field/RespawnController.tsx — 필드 리스폰 관리 (전멸 무리 예약 + 만료 소거)
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../presenter/useGameStore";
import { FIELD_ENEMIES } from "../data/gameData";

export function RespawnController() {
    const frame = useRef(0);

    useFrame(() => {
        frame.current++;
        if (frame.current % 60 !== 0) return; // ~1초 주기
        const g = useGame.getState() as any;
        if (g.combat.phase !== "idle") return;

        // 1) 전멸한 리스폰 무리 → 타이머 예약
        for (const s of FIELD_ENEMIES) {
            if (!s.respawn) continue;
            const ids =
                "templates" in s && s.templates
                    ? (s.templates as string[]).map(
                          (_, i) => `defeated_${s.id}_${i}`
                      )
                    : [`defeated_${s.id}`];
            const key = ids.join("|");
            if (g.fieldRespawn[key] !== undefined) continue;
            if (ids.every((f: string) => g.flags[f])) {
                g.scheduleRespawn(key, s.respawn);
            }
        }

        // 2) 만료 타이머 소거 → 플래그 부활(리스폰)
        g.consumeRespawns();
    });

    return null;
}
```

- [ ] **Step 6: FieldGatherable.tsx — respawnMs prop**

props에 `respawnMs?: number`를 추가하고, E키 획득 핸들러에서 플래그 설정 직후 예약:

```ts
            s.addItem(item, qty);
            useGame.setState((st: any) => ({
                flags: { ...st.flags, [`gather_${id}`]: true },
            }));
            // 리스폰 예약 — RespawnController가 만료 시 플래그를 지워 되살린다
            if (respawnMs) (s as any).scheduleRespawn(`gather_${id}`, respawnMs);
```

(컴포넌트 함수 시그니처의 구조분해에 `respawnMs`를 추가하고, useEffect deps에도 추가.)

- [ ] **Step 7: FieldScene.tsx — 마운트/전달**

import 추가:

```tsx
import { RespawnController } from "./RespawnController";
import { FIELD_ENEMIES, FIELD_TREASURES, FIELD_GATHERABLES, GOLDEN_HERB_SPOTS } from "../data/gameData";
```

(기존 gameData import 줄에 `GOLDEN_HERB_SPOTS`만 병합.)

컴포넌트 상단에 황금 약초 랜덤 선택 (hydration 안전하게 lazy state):

```tsx
    const [goldenIdx] = useState(() =>
        Math.floor(Math.random() * GOLDEN_HERB_SPOTS.length)
    );
```

(`useState`를 react import에 병합.)

`FIELD_GATHERABLES` 매핑에 `respawnMs={180_000}`을 추가하고, 그 아래 황금 약초와 RespawnController를 마운트:

```tsx
            {FIELD_GATHERABLES.map((g) => (
                <FieldGatherable
                    key={g.id}
                    id={g.id}
                    x={g.pos.x}
                    y={g.pos.y}
                    z={g.pos.z}
                    item={g.item}
                    qty={g.qty}
                    respawnMs={180_000}
                />
            ))}
            {/* 황금 약초 — 진입마다 후보 중 1곳 */}
            <FieldGatherable
                id={`golden_${goldenIdx}`}
                x={GOLDEN_HERB_SPOTS[goldenIdx].x}
                y={GOLDEN_HERB_SPOTS[goldenIdx].y}
                z={GOLDEN_HERB_SPOTS[goldenIdx].z}
                item="golden_herb"
                qty={1}
                respawnMs={180_000}
            />
            <RespawnController />
```

FieldGatherable의 `ITEM_LABEL`/`ITEM_COLOR`에 황금 약초 추가 (FieldGatherable.tsx):

```ts
    golden_herb: "황금 약초",
// ITEM_COLOR:
    golden_herb: "#fbbf24",
```

- [ ] **Step 8: 타입 체크 + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: ≤ 28.

```bash
git add src/app/games/rpg/presenter/slices/fieldSlice.ts src/app/games/rpg/presenter/useGameStore.ts src/app/games/rpg/field/RespawnController.tsx src/app/games/rpg/data/gameData.ts src/app/games/rpg/field/FieldGatherable.tsx src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/menu/MenuUI.tsx
git commit -m "[feat] 필드 라이프 — 배회 몬스터 5무리·3분 리스폰 시스템·황금 약초·마물 결정 드롭

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 탐험 POI (전망 포인트 + 숨은 보물 + 지도 "?")

**Files:**
- Create: `src/app/games/rpg/data/poiData.ts`
- Create: `src/app/games/rpg/field/FieldPoi.tsx`
- Modify: `src/app/games/rpg/data/gameData.ts` (FIELD_TREASURES t11~t16)
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (FieldPoi 마운트)
- Modify: `src/app/games/rpg/ui/MiniMap.tsx` ("?" 마커)
- Modify: `src/app/games/rpg/menu/FullMapPanel.tsx` (발견 POI 아이콘)

**Interfaces:**
- Consumes: `spawnPopup({side,text,color})`, `gainGold`, `gainExp(charId, exp)`, `navFindWalkable`, `flags`
- Produces:
  - `POIS: Poi[]`, `type Poi = { id, x, z, y?, label, desc, rewardGold, rewardExp }`
  - `HIDDEN_TREASURE_IDS: string[]` (poiData.ts에서 export — 지도 "?" 대상)
  - 발견 플래그 `poi_${id}`

- [ ] **Step 1: poiData.ts 생성**

```ts
// rpg/data/poiData.ts — 탐험 보상 포인트 (전망 포인트 + 숨은 보물 지도 연동)
// 발견: flags[`poi_${id}`] — 반경 접근 시 자동 발견, 보상 지급

export type Poi = {
    id: string;
    x: number;
    z: number;
    /** 의도 층 지면 y (없으면 플레이어 층 기준 스냅) */
    y?: number;
    label: string;
    desc: string;
    rewardGold: number;
    rewardExp: number;
};

export const POIS: Poi[] = [
    {
        id: "pier_end",
        x: 224.9, z: -16.1, y: -38.25,
        label: "부두 끝",
        desc: "시간이 멈춘 바다가 한눈에 들어온다",
        rewardGold: 80, rewardExp: 40,
    },
    {
        id: "hill_path",
        x: 0, z: -170,
        label: "바람 언덕 초입",
        desc: "마을 너머 벌판으로 멈춘 바람의 결이 보인다",
        rewardGold: 80, rewardExp: 40,
    },
    {
        id: "east_coast",
        x: 150, z: 6, y: -35,
        label: "동쪽 해안",
        desc: "굳은 파도가 유리처럼 반짝인다",
        rewardGold: 80, rewardExp: 40,
    },
];

/** 지도 '?' 표시 대상인 숨은 보물 (FIELD_TREASURES의 t11~t16) */
export const HIDDEN_TREASURE_IDS = ["t11", "t12", "t13", "t14", "t15", "t16"];
```

- [ ] **Step 2: gameData.ts — 숨은 보물 6개 추가**

`FIELD_TREASURES` 배열 끝에 추가 (y는 검증된 지면 높이만 사용):

```ts
    // ===== 숨은 보물 — 길 밖 탐험 보상 (지도에 25m 접근 시 '?') =====
    { id: "t11", pos: new THREE.Vector3(30, -33.25, -48), items: [{ id: "mana_crystal", qty: 2 }, { id: "health_potion", qty: 1 }] },
    { id: "t12", pos: new THREE.Vector3(58, -33.25, -12), items: [{ id: "monster_core", qty: 2 }] },
    { id: "t13", pos: new THREE.Vector3(78, -33.25, -50), items: [{ id: "herb", qty: 3 }, { id: "health_potion", qty: 1 }] },
    { id: "t14", pos: new THREE.Vector3(66, -33.25, -8), items: [{ id: "kite", qty: 1 }] }, // 소년 퀘스트: 잃어버린 연
    { id: "t15", pos: new THREE.Vector3(150, -34.25, 2), items: [{ id: "mana_potion", qty: 2 }] },
    { id: "t16", pos: new THREE.Vector3(226, -38.25, -4), items: [{ id: "orc_tusk", qty: 3 }, { id: "golden_herb", qty: 1 }] },
```

- [ ] **Step 3: FieldPoi.tsx 생성**

```tsx
// rpg/field/FieldPoi.tsx — 전망 포인트 (반경 접근 시 자동 발견 — 배너 + 골드/경험치)
"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import type { Poi } from "../data/poiData";

const DISCOVER_RANGE = 3.2;

export function FieldPoi({ poi }: { poi: Poi }) {
    const groupRef = useRef<THREE.Group>(null);
    const snapped = useRef(false);
    const frame = useRef(0);
    const [banner, setBanner] = useState(false);
    const discovered = useGame((s) => !!s.flags[`poi_${poi.id}`]);

    useFrame((state) => {
        const g = groupRef.current;
        if (!g) return;

        // 지면 스냅 (깃발과 동일 패턴)
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(poi.x, poi.z, poi.y ?? p.y);
            if (found) g.position.set(found.x, found.y, found.z);
            else g.position.set(poi.x, poi.y ?? p.y, poi.z);
            snapped.current = true;
            return;
        }

        // 발견 판정 (8프레임 스로틀)
        frame.current++;
        if (frame.current % 8 !== 0 || discovered) return;
        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!p) return;
        if (
            Math.hypot(p.x - g.position.x, p.z - g.position.z) >
                DISCOVER_RANGE ||
            Math.abs(p.y - g.position.y) > 3
        )
            return;

        const s = useGame.getState();
        useGame.setState((st: any) => ({
            flags: { ...st.flags, [`poi_${poi.id}`]: true },
        }));
        s.gainGold(poi.rewardGold);
        for (const c of s.player.party) s.gainExp(c.id, poi.rewardExp);
        (s as any).spawnPopup({
            side: "ally",
            text: `🏞️ ${poi.label} 발견! +${poi.rewardGold}G`,
            color: "#7dd3fc",
        });
        setBanner(true);
        setTimeout(() => setBanner(false), 2600);
    });

    return (
        <group ref={groupRef}>
            {/* 미발견 안내 — 은은한 빛기둥(목표 비콘보다 얇고 옅게) */}
            {!discovered && (
                <mesh position={[0, 1.4, 0]}>
                    <cylinderGeometry args={[0.12, 0.3, 2.8, 8, 1, true]} />
                    <meshBasicMaterial
                        color="#fef3c7"
                        transparent
                        opacity={0.18}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}
            {banner && (
                <Html position={[0, 2.6, 0]} center distanceFactor={10}>
                    <div className="whitespace-nowrap rounded-xl border border-sky-300/60 bg-black/80 px-4 py-2 text-center">
                        <div className="font-bold text-sky-300">
                            🏞️ {poi.label}
                        </div>
                        <div className="text-xs text-gray-300">{poi.desc}</div>
                    </div>
                </Html>
            )}
        </group>
    );
}
```

- [ ] **Step 4: FieldScene.tsx 마운트**

```tsx
import { FieldPoi } from "./FieldPoi";
import { POIS } from "../data/poiData";
...
            {POIS.map((poi) => (
                <FieldPoi key={poi.id} poi={poi} />
            ))}
```

(`<RespawnController />` 근처, STORY_FLAGS 매핑 아래에 추가.)

- [ ] **Step 5: MiniMap.tsx — "?" 마커**

import 추가:

```tsx
import { POIS, HIDDEN_TREASURE_IDS } from "../data/poiData";
import { MERCHANT_POS, FIELD_TREASURES } from "../data/gameData";
```

markers 계산부(상인 push 아래)에 추가:

```tsx
    // 미발견 탐험 요소 — 25m 이내 접근 시 '?'로 호기심 유도
    for (const poi of POIS) {
        if (flags[`poi_${poi.id}`]) continue;
        if (Math.hypot(poi.x - px, poi.z - pz) <= 25)
            markers.push({ x: poi.x, z: poi.z, icon: "❓" });
    }
    for (const tid of HIDDEN_TREASURE_IDS) {
        if (flags[`treasure_${tid}`]) continue;
        const t = FIELD_TREASURES.find((tt) => tt.id === tid);
        if (t && Math.hypot(t.pos.x - px, t.pos.z - pz) <= 25)
            markers.push({ x: t.pos.x, z: t.pos.z, icon: "❓" });
    }
```

- [ ] **Step 6: FullMapPanel.tsx — 발견 POI 아이콘**

import 추가 후(`POIS` from `../data/poiData`) 상인 마커 아래에 추가:

```tsx
                    {/* 발견한 전망 포인트 */}
                    {POIS.filter((p) => flags[`poi_${p.id}`]).map((p) => (
                        <div
                            key={p.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px]"
                            style={pct(p.x, p.z)}
                            title={p.label}
                        >
                            🏞️
                        </div>
                    ))}
```

범례 문구에 `· 🏞️ 전망` 추가.

- [ ] **Step 7: 타입 체크 + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: ≤ 28.

```bash
git add src/app/games/rpg/data/poiData.ts src/app/games/rpg/field/FieldPoi.tsx src/app/games/rpg/data/gameData.ts src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/ui/MiniMap.tsx src/app/games/rpg/menu/FullMapPanel.tsx
git commit -m "[feat] 탐험 POI — 전망 포인트 3곳(발견 보상)·숨은 보물 6개·지도 '?' 연동

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 사이드 퀘스트 NPC 4명

**Files:**
- Create: `src/app/games/rpg/data/questData.ts`
- Create: `src/app/games/rpg/field/FieldQuestNpc.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (마운트)
- Modify: `src/app/games/rpg/ui/MiniMap.tsx` (❗ 마커)
- Modify: `src/app/games/rpg/menu/FullMapPanel.tsx` (❗ 마커)
- Modify: `src/app/games/rpg/actors/ModelAvatar.tsx` (신규 모델 preload)

**Interfaces:**
- Consumes: `stageAtLeast`, `DialogueLine`, `startDialogue`, `addItem`, `gainGold`, `bag`, `flags` (defeated_bounty1_0/1, 아이템 kite/monster_core/fish_common)
- Produces:
  - `SIDE_QUESTS: SideQuest[]` — 상태 플래그 `quest_${id}`(수락), `quest_${id}_done`(완료)
  - `type SideQuest` (아래 정의)

- [ ] **Step 1: questData.ts 생성**

```ts
// rpg/data/questData.ts — 사이드 퀘스트 (NPC/조건/대사/보상 전부 데이터 선언)
// 상태: flags[`quest_${id}`] = 수락, flags[`quest_${id}_done`] = 완료

import type { DialogueLine } from "./storyData";

export type SideQuest = {
    id: string;
    npc: {
        x: number;
        z: number;
        /** 의도 층 지면 y (없으면 플레이어 층 기준 스냅) */
        y?: number;
        label: string;
        model: string;
    };
    /** 이 스테이지부터 등장 (stageAtLeast) */
    availableFrom: string;
    accept: DialogueLine[];
    progress: DialogueLine[];
    complete: DialogueLine[];
    /** 납품 조건 — 완료 시 가방에서 차감 */
    needs?: Array<{ id: string; qty: number }>;
    /** 처치 조건 — defeated_${fieldId} 플래그 전부 true */
    kills?: string[];
    rewards: Array<{ id: string; qty: number }>;
    rewardGold: number;
};

export const SIDE_QUESTS: SideQuest[] = [
    {
        id: "guard_bounty",
        npc: { x: 91, z: -29.5, y: -33.25, label: "파수꾼", model: "/character/VikingHelmet.fbx" },
        availableFrom: "ch2_cleanup",
        accept: [
            { speaker: "파수꾼", text: "성문 밖 초소라 시계탑 종소리가 닿지 않아 화를 면했지. …그런데 남쪽 숲에 오크 둘이 진을 쳤어." },
            { speaker: "파수꾼", text: "놈들 때문에 순찰을 못 돌아. 정리해 주면 사례하지." },
            { speakerId: "arin", text: "위치는 파악했다. 맡겨라." },
        ],
        progress: [
            { speaker: "파수꾼", text: "남쪽 숲이야. 놈들이 먼저 움직이기 전에 부탁하네." },
        ],
        complete: [
            { speaker: "파수꾼", text: "확실하군! 이제 순찰을 돌 수 있겠어. 약속한 보수다." },
            { speakerId: "lotti", text: "든든한 아저씨네. 마을 사람들이 깨어나면 좋아하겠다!" },
        ],
        kills: ["bounty1_0", "bounty1_1"],
        rewards: [{ id: "health_potion", qty: 2 }],
        rewardGold: 150,
    },
    {
        id: "smith_core",
        npc: { x: 43.5, z: -26.5, y: -33.25, label: "견습 대장장이", model: "/character/Viking_Female.fbx" },
        availableFrom: "ch3_port",
        accept: [
            { speaker: "견습 대장장이", text: "스승님이 굳은 뒤로 화로를 못 지폈어요… 마물 결정 2개와 슬라임 젤 2개면 특제 풀무를 돌릴 수 있는데." },
            { speakerId: "theo", text: "마물 결정이라면 오크나 마법사 마물이 떨어뜨리죠. 풀무 연료라니, 흥미롭네요." },
        ],
        progress: [
            { speaker: "견습 대장장이", text: "마물 결정 2개, 슬라임 젤 2개예요. 들판의 마물들이 갖고 있을 거예요." },
        ],
        complete: [
            { speaker: "견습 대장장이", text: "이거예요! 화로가 다시 숨을 쉬네요. …스승님 서랍에 있던 반지, 당신에게 어울려요." },
        ],
        needs: [
            { id: "monster_core", qty: 2 },
            { id: "slime_gel", qty: 2 },
        ],
        rewards: [{ id: "power_ring", qty: 1 }],
        rewardGold: 80,
    },
    {
        id: "boy_kite",
        npc: { x: 26, z: -19, y: -33.25, label: "소년", model: "/character/Cowboy_Hair.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "소년", text: "깨어나 보니 내 연이 없어요! 분명 북쪽 들판 쪽으로 날아갔는데…" },
            { speakerId: "lotti", text: "북쪽 들판? 알았어, 우리가 찾아볼게. 울지 마!" },
        ],
        progress: [
            { speaker: "소년", text: "북쪽 들판 어딘가에 떨어졌을 거예요… 부탁해요." },
        ],
        complete: [
            { speaker: "소년", text: "내 연이다! 정말 고마워요! 이건 엄마가 챙겨 준 건데, 드릴게요." },
        ],
        needs: [{ id: "kite", qty: 1 }],
        rewards: [{ id: "health_potion", qty: 1 }],
        rewardGold: 60,
    },
    {
        id: "fisher_fish",
        npc: { x: 207, z: 3, y: -38.25, label: "어부", model: "/character/Elf.fbx" },
        availableFrom: "ch4_hill",
        accept: [
            { speaker: "어부", text: "…어라, 몸이 움직여! 당신들 덕인가. 그물이 다 삭아버렸으니, 생선 3마리만 잡아다 주게." },
            { speaker: "어부", text: "부두 끝에 낚시하기 좋은 자리가 있어. 낚싯대는 꽂아 뒀네." },
        ],
        progress: [
            { speaker: "어부", text: "부두 끝 낚시터에서 생선 3마리 — 마커가 초록 존에 올 때 낚아채면 되네." },
        ],
        complete: [
            { speaker: "어부", text: "싱싱하군! 이제 다시 바다에 나갈 수 있겠어. 받게 — 뱃일하며 모은 걸세." },
        ],
        needs: [{ id: "fish_common", qty: 3 }],
        rewards: [{ id: "mana_crystal", qty: 2 }],
        rewardGold: 100,
    },
];
```

- [ ] **Step 2: FieldQuestNpc.tsx 생성**

```tsx
// rpg/field/FieldQuestNpc.tsx — 사이드 퀘스트 NPC (E: 수락/진행/완료, 머리 위 ❗/❓)
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { stageAtLeast } from "../data/storyData";
import type { SideQuest } from "../data/questData";

const INTERACT_RANGE = 2.6;

export function FieldQuestNpc({ quest }: { quest: SideQuest }) {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    const stage = useGame((s) => s.story.stage);
    const accepted = useGame((s) => !!s.flags[`quest_${quest.id}`]);
    const done = useGame((s) => !!s.flags[`quest_${quest.id}_done`]);
    const visible = stageAtLeast(stage, quest.availableFrom);

    useFrame((state) => {
        if (!visible || !groupRef.current) return;

        // 지면 스냅 — 상인과 동일 패턴
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(
                quest.npc.x,
                quest.npc.z,
                quest.npc.y ?? p.y
            );
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
            snapped.current = true;
            return;
        }

        // 근접 판정 (8프레임 스로틀)
        frame.current++;
        if (frame.current % 8 !== 0) return;
        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!p) return;
        const near =
            Math.hypot(
                p.x - groupRef.current.position.x,
                p.z - groupRef.current.position.z
            ) <= INTERACT_RANGE &&
            Math.abs(p.y - groupRef.current.position.y) <= 2;
        if (near !== inRangeRef.current) {
            inRangeRef.current = near;
            setInRange(near);
        }
    });

    // E키 상호작용 — 수락 → 진행 → 완료
    useEffect(() => {
        if (!inRange || !visible || done) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen) return;

            if (!s.flags[`quest_${quest.id}`]) {
                useGame.setState((st: any) => ({
                    flags: { ...st.flags, [`quest_${quest.id}`]: true },
                }));
                s.startDialogue(quest.accept);
                return;
            }

            const killsOk = (quest.kills ?? []).every(
                (fid) => s.flags[`defeated_${fid}`]
            );
            const needsOk = (quest.needs ?? []).every(
                (n) =>
                    (s.bag.find((b: { id: string; qty: number }) => b.id === n.id)?.qty ?? 0) >= n.qty
            );
            if (!killsOk || !needsOk) {
                s.startDialogue(quest.progress);
                return;
            }

            // 납품 아이템 차감 → 보상 → 완료
            if (quest.needs?.length) {
                useGame.setState((st: any) => {
                    let bag = [...st.bag];
                    for (const n of quest.needs!) {
                        bag = bag
                            .map((b: { id: string; qty: number }) =>
                                b.id === n.id
                                    ? { ...b, qty: b.qty - n.qty }
                                    : b
                            )
                            .filter(
                                (b: { id: string; qty: number }) => b.qty > 0
                            );
                    }
                    return { bag };
                });
            }
            for (const r of quest.rewards) s.addItem(r.id, r.qty);
            s.gainGold(quest.rewardGold);
            useGame.setState((st: any) => ({
                flags: { ...st.flags, [`quest_${quest.id}_done`]: true },
            }));
            s.startDialogue(quest.complete);
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange, visible, done, quest]);

    if (!visible) return null;

    return (
        <group ref={groupRef} position={[quest.npc.x, quest.npc.y ?? 0, quest.npc.z]}>
            <Suspense fallback={null}>
                <ModelAvatar
                    url={quest.npc.model}
                    state="idle"
                    scale={0.005}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>

            {/* 퀘스트 상태 마커 — 완료 후엔 표시하지 않는다 (NPC는 남는다) */}
            {!done && (
                <Html position={[0, 2.4, 0]} center distanceFactor={9}>
                    <div style={{ fontSize: 20 }}>{accepted ? "❓" : "❗"}</div>
                </Html>
            )}

            {inRange && !done && (
                <Html position={[0, 2.0, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#fde68a",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #fde68a",
                            fontSize: 14,
                        }}
                    >
                        E: 대화 — {quest.npc.label}
                    </div>
                </Html>
            )}
        </group>
    );
}
```

- [ ] **Step 3: ModelAvatar.tsx — 모델 preload 추가**

파일 하단 preload 목록에 추가:

```ts
useFBX.preload("/character/VikingHelmet.fbx");
useFBX.preload("/character/Viking_Female.fbx");
useFBX.preload("/character/Cowboy_Hair.fbx");
useFBX.preload("/character/Elf.fbx");
```

- [ ] **Step 4: FieldScene.tsx 마운트**

```tsx
import { FieldQuestNpc } from "./FieldQuestNpc";
import { SIDE_QUESTS } from "../data/questData";
...
            {SIDE_QUESTS.map((q) => (
                <FieldQuestNpc key={q.id} quest={q} />
            ))}
```

- [ ] **Step 5: 지도 ❗ 마커**

MiniMap.tsx — import에 `SIDE_QUESTS`(`../data/questData`)와 `stageAtLeast`(`../data/storyData`) 추가, 구독에 `const stage = useGame((s) => s.story.stage);` 추가, markers 계산부에:

```tsx
    for (const q of SIDE_QUESTS) {
        if (!stageAtLeast(stage, q.availableFrom)) continue;
        if (flags[`quest_${q.id}_done`]) continue;
        markers.push({ x: q.npc.x, z: q.npc.z, icon: "❗" });
    }
```

FullMapPanel.tsx — 같은 import + `const stage = useGame((s) => s.story.stage);` 구독, 발견 POI 아래에:

```tsx
                    {/* 진행 가능한 사이드 퀘스트 */}
                    {SIDE_QUESTS.filter(
                        (q) =>
                            stageAtLeast(stage, q.availableFrom) &&
                            !flags[`quest_${q.id}_done`]
                    ).map((q) => (
                        <div
                            key={q.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px]"
                            style={pct(q.npc.x, q.npc.z)}
                            title={q.npc.label}
                        >
                            ❗
                        </div>
                    ))}
```

범례에 `· ❗ 의뢰` 추가.

- [ ] **Step 6: 타입 체크 + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: ≤ 28.

```bash
git add src/app/games/rpg/data/questData.ts src/app/games/rpg/field/FieldQuestNpc.tsx src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/ui/MiniMap.tsx src/app/games/rpg/menu/FullMapPanel.tsx src/app/games/rpg/actors/ModelAvatar.tsx
git commit -m "[feat] 사이드 퀘스트 4종 — 파수꾼 토벌·대장장이 납품·소년의 연·어부의 생선 (데이터 선언식)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 항구 낚시 미니게임

**Files:**
- Modify: `src/app/games/rpg/presenter/slices/uiSlice.ts` (fishingOpen)
- Create: `src/app/games/rpg/field/FishingSpot.tsx`
- Create: `src/app/games/rpg/menu/FishingPanel.tsx`
- Modify: `src/app/games/rpg/field/FieldScene.tsx` (FishingSpot 마운트)
- Modify: `src/app/games/rpg/container/RpgGame.tsx` (FishingPanel 마운트 + M/I 가드 + 미니맵 조건)
- Modify: `src/app/games/rpg/field/FieldPlayer.tsx` (낚시 중 이동 잠금)

**Interfaces:**
- Consumes: `addItem`, `spawnPopup`, `closeAll`, fish 아이템(Task 2에서 등록)
- Produces: `ui.fishingOpen: boolean`, `toggleFishing(): void`

- [ ] **Step 1: uiSlice — fishingOpen**

state ui 객체와 `closeAll`의 ui 객체 양쪽에 `fishingOpen: false` 추가, `toggleMap` 아래에 액션 추가:

```ts
    // ===== 낚시 (부두 낚시터) =====
    toggleFishing: () =>
        set((s: any) => ({ ui: { ...s.ui, fishingOpen: !s.ui.fishingOpen } })),
```

- [ ] **Step 2: FishingSpot.tsx 생성**

```tsx
// rpg/field/FishingSpot.tsx — 부두 낚시터 (E: 낚시 미니게임)
"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

const SPOT = { x: 222.5, y: -38.25, z: -18.9 }; // 부두 끝 근처
const INTERACT_RANGE = 2.6;

export function FishingSpot() {
    const groupRef = useRef<THREE.Group>(null);
    const [inRange, setInRange] = useState(false);
    const inRangeRef = useRef(false);
    const snapped = useRef(false);
    const frame = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;
        if (!snapped.current) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((px: number, pz: number, preferY?: number) => { x: number; y: number; z: number } | null)
                | undefined;
            const p = state.scene.userData.__playerWorldPos as
                | THREE.Vector3
                | undefined;
            if (!navFindWalkable || !p) return;
            const found = navFindWalkable(SPOT.x, SPOT.z, SPOT.y);
            if (found)
                groupRef.current.position.set(found.x, found.y, found.z);
            snapped.current = true;
            return;
        }
        frame.current++;
        if (frame.current % 8 !== 0) return;
        const p = state.scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!p) return;
        const near =
            Math.hypot(
                p.x - groupRef.current.position.x,
                p.z - groupRef.current.position.z
            ) <= INTERACT_RANGE &&
            Math.abs(p.y - groupRef.current.position.y) <= 2;
        if (near !== inRangeRef.current) {
            inRangeRef.current = near;
            setInRange(near);
        }
    });

    useEffect(() => {
        if (!inRange) return;
        const h = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "e" && e.code !== "KeyE") return;
            const s = useGame.getState();
            if (s.combat.phase !== "idle") return;
            if (s.dialogue.length > 0) return;
            const ui = s.ui as any;
            if (ui.mapOpen || ui.shopOpen || ui.fishingOpen) return;
            document.exitPointerLock?.();
            (s as any).toggleFishing();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [inRange]);

    return (
        <group ref={groupRef} position={[SPOT.x, SPOT.y, SPOT.z]}>
            {/* 꽂아 둔 낚싯대 */}
            <mesh position={[0.2, 0.7, 0]} rotation={[0, 0, -0.7]} castShadow>
                <cylinderGeometry args={[0.02, 0.03, 1.6, 6]} />
                <meshStandardMaterial color="#7c5a3a" />
            </mesh>
            {/* 표시 링 */}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.62, 24]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {inRange && (
                <Html position={[0, 1.8, 0]} center distanceFactor={8}>
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            background: "rgba(0,0,0,0.75)",
                            color: "#7dd3fc",
                            padding: "4px 12px",
                            borderRadius: 8,
                            border: "1px solid #7dd3fc",
                            fontSize: 14,
                        }}
                    >
                        E: 낚시 🎣
                    </div>
                </Html>
            )}
        </group>
    );
}
```

- [ ] **Step 3: FishingPanel.tsx 생성**

```tsx
// rpg/menu/FishingPanel.tsx — 낚시 미니게임 (왕복 마커를 초록 존에서 Space 3회)
"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "../presenter/useGameStore";

const ROUNDS = 3;

export function FishingPanel() {
    const open = useGame((s) => (s.ui as any).fishingOpen);
    const closeAll = useGame((s) => s.closeAll);
    const addItem = useGame((s) => s.addItem);
    const [round, setRound] = useState(0);
    const [hits, setHits] = useState<number[]>([]); // 라운드별 정확도(0~1)
    const posRef = useRef(0);
    const dirRef = useRef(1);
    const barRef = useRef<HTMLDivElement>(null);

    // 열릴 때 초기화
    useEffect(() => {
        if (open) return;
        setRound(0);
        setHits([]);
        posRef.current = 0;
        dirRef.current = 1;
    }, [open]);

    // 마커 왕복 — 라운드가 오를수록 빨라진다
    useEffect(() => {
        if (!open) return;
        let raf = 0;
        let last = performance.now();
        const speed = 1.2 + round * 0.5;
        const tick = (t: number) => {
            const dt = (t - last) / 1000;
            last = t;
            posRef.current += dirRef.current * dt * speed;
            if (posRef.current > 1) {
                posRef.current = 1;
                dirRef.current = -1;
            }
            if (posRef.current < 0) {
                posRef.current = 0;
                dirRef.current = 1;
            }
            if (barRef.current)
                barRef.current.style.left = `${posRef.current * 100}%`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [open, round]);

    // Space 판정
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key !== " ") return;
            e.preventDefault();
            const acc = 1 - Math.min(1, Math.abs(posRef.current - 0.5) / 0.5);
            const newHits = [...hits, acc];
            setHits(newHits);
            if (newHits.length < ROUNDS) {
                setRound((r) => r + 1);
                return;
            }
            // 결과 — 성공(정확도>0.35)당 생선 1, 퍼펙트(>0.8) 2회 이상이면 월광어
            const s = useGame.getState() as any;
            const perfect = newHits.filter((a) => a > 0.8).length;
            const catches = newHits.filter((a) => a > 0.35).length;
            if (catches === 0) {
                s.spawnPopup({
                    side: "enemy",
                    text: "🐟 물고기가 도망갔다…",
                    color: "#94a3b8",
                });
            } else if (perfect >= 2) {
                addItem("fish_rare", 1);
                s.spawnPopup({
                    side: "ally",
                    text: "🌕 월광어를 낚았다!",
                    color: "#7dd3fc",
                });
            } else {
                addItem("fish_common", catches);
                s.spawnPopup({
                    side: "ally",
                    text: `🐟 생선 ×${catches}`,
                    color: "#8fd67a",
                });
            }
            closeAll();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, hits, addItem, closeAll]);

    if (!open) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 pb-24">
            <div className="w-[26rem] max-w-[90vw] rounded-2xl border border-sky-400/60 bg-black/85 p-5">
                <div className="mb-1 text-center text-xs tracking-[0.3em] text-sky-300">
                    FISHING
                </div>
                <div className="mb-3 text-center text-sm text-white">
                    마커가 초록 존에 올 때 Space! ({hits.length + 1}/{ROUNDS})
                </div>
                <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="absolute inset-y-0 left-[35%] w-[30%] bg-emerald-500/40" />
                    <div className="absolute inset-y-0 left-[46%] w-[8%] bg-emerald-400/80" />
                    <div
                        ref={barRef}
                        className="absolute top-0 h-6 w-1.5 -translate-x-1/2 rounded bg-white"
                        style={{ left: "0%" }}
                    />
                </div>
                <div className="mt-3 text-center text-xs text-gray-400">
                    ESC: 그만두기
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: FieldScene.tsx 마운트**

```tsx
import { FishingSpot } from "./FishingSpot";
...
            <FishingSpot />
```

- [ ] **Step 5: RpgGame.tsx — 마운트 + 가드**

- import: `import { FishingPanel } from "../menu/FishingPanel";`
- `{combat.phase === "idle" && <FullMapPanel />}` 아래: `{combat.phase === "idle" && <FishingPanel />}`
- ESC 분기 조건에 `ui.fishingOpen` 추가: `if (ui.shopOpen || ui.fastTravelOpen || ui.mapOpen || ui.fishingOpen) { closeAll(); return; }`
- `m`키 가드에 fishing 추가: `if (u.pauseOpen || u.inventoryOpen || u.shopOpen || u.fastTravelOpen || u.fishingOpen) return;`
- `i`키 가드에 fishing 추가: `if (u.mapOpen || u.shopOpen || u.fastTravelOpen || u.fishingOpen) return;`
- 미니맵 표시 조건에 `!ui.fishingOpen &&` 추가.

- [ ] **Step 6: FieldPlayer.tsx — 낚시 중 이동 잠금**

이동 잠금 계산을 낚시까지 확장:

```ts
        // 대화 중·전체지도/낚시 중에는 이동 잠금
        const gState = useGame.getState();
        const inDialogue =
            gState.dialogue.length > 0 ||
            (gState.ui as any).mapOpen === true ||
            (gState.ui as any).fishingOpen === true;
```

- [ ] **Step 7: StoryTriggers.tsx — 오버레이 중 트리거 보류**

낚시/전체지도 중 스토리 트리거가 발동하면 대사가 오버레이 뒤에 깔리고 Space 입력이 겹친다. `src/app/games/rpg/field/StoryTriggers.tsx`의 useFrame 초입 가드에 한 줄 추가:

```ts
        if (g.combat.phase !== "idle") return;
        if (g.dialogue.length > 0) return; // 대화 중엔 다음 트리거 보류
        const ui = g.ui as { mapOpen?: boolean; fishingOpen?: boolean };
        if (ui.mapOpen || ui.fishingOpen) return; // 오버레이 중에도 보류
```

- [ ] **Step 8: 타입 체크 + Commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: ≤ 28.

```bash
git add src/app/games/rpg/presenter/slices/uiSlice.ts src/app/games/rpg/field/FishingSpot.tsx src/app/games/rpg/menu/FishingPanel.tsx src/app/games/rpg/field/FieldScene.tsx src/app/games/rpg/container/RpgGame.tsx src/app/games/rpg/field/FieldPlayer.tsx src/app/games/rpg/field/StoryTriggers.tsx
git commit -m "[feat] 항구 낚시 미니게임 — 타이밍 바 3라운드, 생선/월광어 획득 (어부 퀘스트 연계)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
