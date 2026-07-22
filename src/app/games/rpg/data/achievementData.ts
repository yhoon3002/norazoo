// rpg/data/achievementData.ts — 업적/칭호 (조건은 상태 순수 함수 — 표시 시 평가, 저장 안 함)
// 파생 목록(몬스터/어종/제작/사이드퀘)은 전부 실제 데이터에서 import — 하드코딩 금지(데이터 추가 시 자동 반영)
import { ENEMY_TEMPLATES, FISHING_SPOTS } from "./gameData";
import { ZONE_DEFS } from "./placementData";
import { SIDE_QUESTS } from "./questData";
import { RECIPES, FEAST_DEFS, FEAST_MAX } from "./recipeData";
import { ALCHEMY_RECIPES } from "./alchemyData";
import { TAILOR_RECIPES } from "./tailorData";

export type Achievement = {
    id: string;
    name: string; // 칭호명 겸용
    icon: string;
    desc: string;
    check: (s: { killCounts: Record<string, number>; flags: Record<string, boolean> }) => boolean;
};

/** ===== 도감 파생 목록 — 실제 데이터에서 산출 (데이터 추가 시 자동 반영) ===== */

/** 마물 14종 — ENEMY_TEMPLATES 키 전부 */
export const MONSTER_IDS: string[] = Object.keys(ENEMY_TEMPLATES);

/** 어종 8종 — FISHING_SPOTS의 common/rare 테이블 값 전부 중복 제거 */
export const FISH_IDS: string[] = Array.from(
    FISHING_SPOTS.reduce((set, sp) => {
        set.add(sp.table.common);
        set.add(sp.table.rare);
        return set;
    }, new Set<string>())
);

/** 제작 25종 — 요리 12 + 연금 9 + 재봉 4 */
export const COOK_IDS: string[] = RECIPES.map((r) => r.id);
export const ALCHEMY_IDS: string[] = ALCHEMY_RECIPES.map((r) => r.id);
export const TAILOR_IDS: string[] = TAILOR_RECIPES.map((r) => r.id);
export const MAKE_IDS: string[] = [...COOK_IDS, ...ALCHEMY_IDS, ...TAILOR_IDS];

/** 사이드 퀘스트 9종 — SIDE_QUESTS id 전부 */
export const SIDE_QUEST_IDS: string[] = SIDE_QUESTS.map((q) => q.id);

/** ===== 업적 12종 (정의 순서 = 칭호 우선순위, 뒤가 상위) ===== */
export const ACHIEVEMENTS: Achievement[] = [
    {
        id: "slayer_100",
        name: "백전의 용사",
        icon: "⚔️",
        desc: "누적 처치 100회 달성",
        check: (s) => (s.killCounts["*"] ?? 0) >= 100,
    },
    {
        id: "trade_regular",
        name: "단골 거래처",
        icon: "🐟",
        desc: "어부에게 생선 10회 납품",
        check: (s) => (s.killCounts["fish_trade"] ?? 0) >= 10,
    },
    {
        id: "quest_solver",
        name: "마을의 해결사",
        icon: "📜",
        desc: "사이드 퀘스트 전부 완료",
        check: (s) => SIDE_QUEST_IDS.every((id) => !!s.flags[`quest_${id}_done`]),
    },
    {
        id: "feast_master",
        name: "전설의 미식가",
        icon: "🍖",
        desc: "만찬 4종 전부 최고 경지 달성",
        check: (s) => FEAST_DEFS.every((d) => (s.killCounts[`feast_${d.stat}`] ?? 0) >= FEAST_MAX),
    },
    {
        id: "codex_monster",
        name: "마물 박사",
        icon: "📕",
        desc: "모든 마물을 처치해 도감에 등록",
        check: (s) => MONSTER_IDS.every((id) => (s.killCounts[id] ?? 0) > 0),
    },
    {
        id: "codex_fish",
        name: "전설의 낚시꾼",
        icon: "🎣",
        desc: "모든 어종을 낚아 도감에 등록",
        check: (s) => FISH_IDS.every((id) => (s.killCounts[`caught_${id}`] ?? 0) > 0),
    },
    {
        id: "codex_maker",
        name: "공방의 명장",
        icon: "🛠️",
        desc: "모든 요리·조합·재봉 레시피 제작",
        check: (s) => MAKE_IDS.every((id) => (s.killCounts[`made_${id}`] ?? 0) > 0),
    },
    {
        id: "zone_pioneer",
        name: "노라의 개척자",
        icon: "🗺️",
        desc: "모든 존을 정화",
        check: (s) => ZONE_DEFS.every((zd) => !!s.flags[`zone_done_${zd.id}`]),
    },
    {
        id: "rebuild_patron",
        name: "재건의 은인",
        icon: "🏛️",
        desc: "광장 재건 기부 최고 단계 달성",
        check: (s) => !!s.flags.donation_max,
    },
    {
        id: "bond_leader",
        name: "유대 깊은 대장",
        icon: "💫",
        desc: "파티원 전원과 유대 에피소드 완료",
        check: (s) => !!s.flags.bond_arin && !!s.flags.bond_theo && !!s.flags.bond_lotti,
    },
    {
        id: "arena_hero",
        name: "투기장의 용사",
        icon: "🏟️",
        desc: "투기장 5웨이브 돌파",
        check: (s) => (s.killCounts["arena_wave"] ?? 0) >= 5,
    },
    {
        id: "story_hero",
        name: "노라의 영웅",
        icon: "🕰️",
        desc: "노라의 이야기를 끝까지 완주",
        check: (s) => !!s.flags.chapter_epilogue,
    },
];

/** 칭호 = 달성 항목 중 배열의 마지막(최상위) name. 미달성 시 "여행자". */
export function currentTitle(s: { killCounts: Record<string, number>; flags: Record<string, boolean> }): string {
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(s));
    return unlocked.length > 0 ? unlocked[unlocked.length - 1].name : "여행자";
}
