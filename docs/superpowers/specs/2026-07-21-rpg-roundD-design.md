# 라운드D — 도감·업적/칭호 + 투기장 + 유대 에피소드

## 배경/목표

이미 추적 중인 데이터(killCounts·flags)를 보여주는 수집 화면과 달성 목표(업적/칭호), 반복 전투 무대(투기장), 파티 서사(유대 에피소드 3건)를 추가한다. 좌표는 전부 착지 프로브 검증 완료. 세이브 포맷 무변경(killCounts/flags만).

**확인된 기반 사실**: MenuUI 가방 탭은 카테고리 필터 방식 — "도감" 탭은 `tab === "codex" ? <CodexPane/> : 기존 목록` 분기로 추가(오버레이 신설 불필요). `startCombat` group의 합성 fieldId는 승리 시 `defeated_${fieldId}` 플래그가 무조건 기록됨(스토리 전투 선례) — 투기장 재사용. FieldLorePoint가 1회성 E-대화 트리거의 템플릿. 어획/제작 기록은 FishingPanel(레어 :96/일반 :103 뒤), ShopPanel cook(:91 뒤)·craft(:111 뒤), TailorPanel 제작 성공 지점에 삽입.

---

## ① 기록 훅 + 도감 탭 + 업적/칭호

### 기록 (killCounts 네임스페이스 — 세이브 자동 영속)

- `caught_${fishId}`: FishingPanel 어획 성공 2경로에서 `+1` (rare는 table.rare, common은 table.common).
- `made_${id}`: ShopPanel cook()(r.id)·craft()(r.id) 및 TailorPanel 제작 성공(r.id) 직후 `+1`.
- 기록 방식은 기존 규약: `useGame.setState((st) => ({ killCounts: { ...st.killCounts, [key]: (st.killCounts[key] ?? 0) + 1 } }))`.

### 데이터 (`data/achievementData.ts` 신규)

```ts
// rpg/data/achievementData.ts — 업적/칭호 (조건은 상태 순수 함수 — 표시 시 평가, 저장 안 함)
export type Achievement = {
    id: string;
    name: string;      // 칭호명 겸용
    icon: string;
    desc: string;
    check: (s: { killCounts: Record<string, number>; flags: Record<string, boolean> }) => boolean;
};
```

ACHIEVEMENTS 12종(정의 순서 = 칭호 우선순위, 뒤가 상위):

| id | 칭호 | icon | 조건 |
|---|---|---|---|
| slayer_100 | 백전의 용사 | ⚔️ | killCounts["*"] ≥ 100 |
| trade_regular | 단골 거래처 | 🐟 | fish_trade ≥ 10 |
| quest_solver | 마을의 해결사 | 📜 | 사이드퀘 9종 `quest_${id}_done` 전부 |
| feast_master | 전설의 미식가 | 🍖 | feast_maxHp/atk/def/speed 전부 ≥ 5 |
| codex_monster | 마물 박사 | 📕 | ENEMY_TEMPLATES 14종 전부 killCounts > 0 |
| codex_fish | 전설의 낚시꾼 | 🎣 | 어종 8종 전부 caught_ > 0 |
| codex_maker | 공방의 명장 | 🛠️ | made_ 25종(요리12+연금9+재봉4) 전부 |
| zone_pioneer | 노라의 개척자 | 🗺️ | zone_done 8존 전부 |
| rebuild_patron | 재건의 은인 | 🏛️ | flags.donation_max |
| bond_leader | 유대 깊은 대장 | 💫 | bond_arin/theo/lotti 전부 |
| arena_hero | 투기장의 용사 | 🏟️ | arena_wave ≥ 5 |
| story_hero | 노라의 영웅 | 🕰️ | flags.chapter_epilogue |

칭호 = 달성 항목 중 **배열의 마지막(최상위)** name. 미달성 시 "여행자".

### 도감 탭 (`menu/MenuUI.tsx` + `menu/CodexPane.tsx` 신규)

- BagTab union에 `"codex"` 추가, TAB_LABEL `도감`, tabCounts는 도감 달성 수 표시(임의 — 업적 달성 수). 콘텐츠 영역: `tab === "codex" ? <CodexPane /> : (기존 tabItems 목록)`.
- CodexPane 구성(스크롤): ⑴ 칭호 헤더("칭호: {최상위 칭호}") ⑵ 몬스터 도감 그리드 — 14종: killCounts>0이면 이름+처치 수, 아니면 "???" ⑶ 어종 8종(caught_) ⑷ 제작 25종(made_ — 요리/연금/재봉 구분 라벨) ⑸ 업적 12종 목록(달성 ✓ 강조/미달성 흐림 + desc). 표시명은 기존 맵(ENEMY_TEMPLATES name·FISH_NAMES·RECIPES/ALCHEMY/TAILOR name) 재사용.

## ② 투기장

- `field/ArenaMaster.tsx` 신규 — NPC (8.5, -33.25, -24.5), model `/character/Ninja_Female.fbx`, 라벨 "투기장 관장", 🏟️ Html. `stageAtLeast(stage, "ch2_cleanup")` 게이트. E 가드는 최신 규약(6오버레이+combat+dialogue).
- `data/arenaData.ts` 신규:

```ts
export const ARENA_WAVES: string[][] = [
    ["slime", "slime"], ["wild_dog", "wild_dog", "slime"], ["orc", "slime"],
    ["ghoul", "zombie"], ["orc", "orc"], ["witch", "mad_bull"],
    ["ninja", "ninja"], ["frost_witch", "ghoul", "ghoul"], ["clockwork_soldier", "clockwork_soldier"],
    ["shade_beast", "clockwork_soldier", "clockwork_soldier"],
];
export const arenaWaveOf = (n: number) => ARENA_WAVES[Math.min(n, ARENA_WAVES.length - 1)];
export const arenaReward = (n: number) => ({ gold: 100 + 50 * n, item: n % 3 === 2 ? ["monster_core", "silver_ore", "dark_crystal"][(Math.floor(n / 3)) % 3] : null });
```

- 흐름: E → 대화("웨이브 {n+1} 도전!") → `startCombat({group: arenaWaveOf(n).map((t,i)=>({template:t, fieldId:`arena${n}_${i}`}))})` (n = killCounts.arena_wave ?? 0). 승리 → 필드 복귀 → ArenaMaster의 useFrame(60프레임 스로틀, combat idle 시)이 `defeated_arena${n}_0..k` 전부 true 감지 → 보상 지급(arenaReward: gainGold + item이면 addItem) + `killCounts.arena_wave = n+1` + **해당 defeated_ 플래그 삭제**(bounty claim의 키 삭제 선례 — 다음 도전 재사용) + spawnPopup(`🏟️ 웨이브 ${n+1} 클리어!`). 패배 시 플래그 미기록 → 재도전(같은 n).
- 10웨이브 이후는 최종 구성 반복(보상 골드는 계속 점증) — 무한 반복 전투 콘텐츠.

## ③ 유대 에피소드 3건

### 데이터 (`data/bondData.ts` 신규)

```ts
export type BondEpisode = {
    id: string;            // flags[`bond_${id}`]
    charId: "arin" | "theo" | "lotti";
    x: number; y: number; z: number;
    label: string;         // 지도/프롬프트 라벨
    availableFrom: string; // stageAtLeast
    lines: DialogueLine[]; // 6-8줄
    reward: { gold: number; items?: Array<{ id: string; qty: number }> };
};
```

| id | 위치(검증) | availableFrom | 콘셉트 | 보상 |
|---|---|---|---|---|
| arin | (88.5, -33.25, -26.5) 성문 옆 | ch4_hill | 파수꾼과 왕도 기사단 시절 — 아린이 검을 잡은 이유 | 200G |
| theo | (-121.5, -13.75, -144.5) 옛길 관측소 | ch4_hill | 스승의 옛 관측 기록 발견 — 태엽학의 뿌리 | 150G + mana_crystal×3 |
| lotti | (14.5, -32.25, -33.5) 광장 화덕 | ch3_port | 사부의 화덕 앞 회상 — 검과 요리 둘 다 택한 이유 | 150G + golden_salad용 재료(golden_herb×1 + forest_mushroom×2) |

- 대사는 구현 시 한국어 6-8줄(해당 파티원 speakerId 중심 + 다른 파티원 1-2줄 리액션), 캐릭터 설정(아린 kn기사 대장/테오 태엽학자/로티 견습 요리사 검사) 일관.
- `field/BondEpisode.tsx` 신규 — FieldLorePoint 템플릿(근접 E, `e.repeat` 가드 포함): 발동 시 startDialogue + 보상 + `flags[bond_${id}]` 1회성. `stageAtLeast` 게이트 + `bond_` 완료 시 마커 숨김. 시각 표현: 파티원 초상 대신 💫 Html 마커(모델 배치 없음 — 회상 지점 콘셉).
- 지도 마커: FullMapPanel·MiniMap에 BOND_EPISODES 순회 추가 — 미완료·스테이지 도달 시 💫 표시(SIDE_QUESTS ❗ 패턴 미러).

## 통합 규약

- tsc ≤ 26, 세이브 무변경, 표시명 기존 맵 재사용, 오버레이 신설 없음(도감은 MenuUI 내부 탭).

## 검증 계약 (헤드리스)

1. 기록: 낚시 1회 → caught_ 증가; 요리 1회 → made_ 증가.
2. 도감: 인벤토리(i) → 도감 탭 → "???"/공개 항목 렌더, killCounts 주입 후 몬스터 전부 공개 + 업적 ✓ 증가 + 칭호 변경.
3. 투기장: E → 웨이브0 전투(arena0_*) → 승리 주입 → 복귀 후 보상(+100G)·arena_wave=1·플래그 삭제 확인 → 재도전 시 웨이브1 구성.
4. 유대: ch4 주입 → 아린 지점 E → 대사+200G+bond_arin; 재E 시 재발동 없음.
