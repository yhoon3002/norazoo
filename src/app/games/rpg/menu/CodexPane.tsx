// rpg/menu/CodexPane.tsx — 도감 탭(MenuUI 인벤토리 내부): 칭호·몬스터·어종·제작·업적 수집 현황
"use client";
import { useGame } from "../presenter/useGameStore";
import { EQUIPMENT, ENEMY_TEMPLATES, FISH_NAMES, SKILLS } from "../data/gameData";
import { RECIPES } from "../data/recipeData";
import { ALCHEMY_RECIPES } from "../data/alchemyData";
import { TAILOR_RECIPES } from "../data/tailorData";
import { ACHIEVEMENTS, MONSTER_IDS, FISH_IDS, currentTitle } from "../data/achievementData";

// 자동 강화 파생(_p1~_p5)을 제외한 기본 장비 id — 장비 도감은 기본형 기준으로만 집계
const EQUIPMENT_BASE_IDS = Object.keys(EQUIPMENT).filter((id) => !/_p[1-5]$/.test(id));
const SKILL_IDS = Object.keys(SKILLS);

const GOLD = "#c9a86a";
const IVORY = "#efe6d0";
const MUTED = "#8b8474";


function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="mb-1.5 mt-4 text-[9px] uppercase tracking-[0.3em] first:mt-0"
            style={{ color: MUTED }}
        >
            {children}
        </div>
    );
}

/** 몬스터/어종/제작 공용 카드 — killCounts > 0 이면 이름+수치, 아니면 "???" */
function CodexCard({
    known,
    name,
    countLabel,
}: {
    known: boolean;
    name: string;
    countLabel?: string;
}) {
    return (
        <div
            className={`border px-2 py-1.5 text-[10px] ${
                known ? "border-white/[0.08]" : "border-white/[0.04]"
            }`}
        >
            <div
                className="truncate"
                style={{ color: known ? IVORY : "rgba(255,255,255,0.25)" }}
            >
                {known ? name : "???"}
            </div>
            {known && countLabel && (
                <div className="tabular-nums" style={{ color: MUTED }}>
                    {countLabel}
                </div>
            )}
        </div>
    );
}

const MAKE_GROUPS = [
    { label: "요리", list: RECIPES, nameOf: (r: { id: string; name: string }) => r.name },
    { label: "연금", list: ALCHEMY_RECIPES, nameOf: (r: { id: string; name: string }) => r.name },
    {
        label: "재봉",
        list: TAILOR_RECIPES,
        nameOf: (r: { id: string }) => EQUIPMENT[r.id]?.name ?? r.id,
    },
] as const;

const TOTAL_MAKE = MAKE_GROUPS.reduce((n, g) => n + g.list.length, 0);

export function CodexPane() {
    const killCounts = useGame((s) => s.killCounts);
    const flags = useGame((s) => s.flags);
    const unlockedEquipment = useGame((s) => s.unlockedEquipment);
    const unlockedSkills = useGame((s) => s.unlockedSkills);
    const state = { killCounts, flags };

    const title = currentTitle(state);
    const unlockedCount = ACHIEVEMENTS.filter((a) => a.check(state)).length;
    const monsterKnown = MONSTER_IDS.filter((id) => (killCounts[id] ?? 0) > 0).length;
    const fishKnown = FISH_IDS.filter((id) => (killCounts[`caught_${id}`] ?? 0) > 0).length;
    const makeKnown = MAKE_GROUPS.reduce(
        (n, g) => n + g.list.filter((r) => (killCounts[`made_${r.id}`] ?? 0) > 0).length,
        0
    );

    return (
        <>
            {/* 칭호 헤더 */}
            <div className="border border-[#c9a86a]/30 bg-[#c9a86a]/[0.05] px-3 py-2.5 text-center">
                <div
                    className="text-[9px] uppercase tracking-[0.3em]"
                    style={{ color: MUTED }}
                >
                    칭호
                </div>
                <div
                    className="mt-0.5 text-sm tracking-[0.15em]"
                    style={{ color: GOLD }}
                >
                    {title}
                </div>
            </div>

            {/* 마물 도감 14종 */}
            <GroupLabel>
                마물 도감 · {monsterKnown}/{MONSTER_IDS.length}
            </GroupLabel>
            <div className="grid grid-cols-2 gap-1">
                {MONSTER_IDS.map((id) => {
                    const n = killCounts[id] ?? 0;
                    return (
                        <CodexCard
                            key={id}
                            known={n > 0}
                            name={ENEMY_TEMPLATES[id].name}
                            countLabel={`처치 ${n}`}
                        />
                    );
                })}
            </div>

            {/* 장비 도감 — 기본 장비 전체 (강화 파생 제외) */}
            <GroupLabel>
                장비 도감 · {unlockedEquipment.length}/{EQUIPMENT_BASE_IDS.length}
            </GroupLabel>
            <div className="grid grid-cols-2 gap-1">
                {EQUIPMENT_BASE_IDS.map((id) => {
                    const known = unlockedEquipment.includes(id);
                    return (
                        <CodexCard
                            key={id}
                            known={known}
                            name={EQUIPMENT[id].name}
                        />
                    );
                })}
            </div>

            {/* 기술 도감 — 전 스킬(캐릭터 전용 포함) */}
            <GroupLabel>
                기술 도감 · {unlockedSkills.length}/{SKILL_IDS.length}
            </GroupLabel>
            <div className="grid grid-cols-2 gap-1">
                {SKILL_IDS.map((id) => {
                    const known = unlockedSkills.includes(id);
                    return (
                        <CodexCard
                            key={id}
                            known={known}
                            name={SKILLS[id].name}
                        />
                    );
                })}
            </div>

            {/* 어종 8종 */}
            <GroupLabel>
                어종 · {fishKnown}/{FISH_IDS.length}
            </GroupLabel>
            <div className="grid grid-cols-2 gap-1">
                {FISH_IDS.map((id) => {
                    const n = killCounts[`caught_${id}`] ?? 0;
                    return (
                        <CodexCard
                            key={id}
                            known={n > 0}
                            name={FISH_NAMES[id] ?? id}
                            countLabel={`어획 ${n}`}
                        />
                    );
                })}
            </div>

            {/* 제작 25종 — 요리/연금/재봉 구분 */}
            <GroupLabel>
                제작 · {makeKnown}/{TOTAL_MAKE}
            </GroupLabel>
            {MAKE_GROUPS.map((group) => (
                <div key={group.label} className="mt-2 first:mt-0">
                    <div
                        className="mb-1 text-[9px] tracking-[0.25em]"
                        style={{ color: "rgba(201,168,106,0.6)" }}
                    >
                        {group.label}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        {group.list.map((r) => {
                            const n = killCounts[`made_${r.id}`] ?? 0;
                            return (
                                <CodexCard
                                    key={r.id}
                                    known={n > 0}
                                    name={group.nameOf(r as never)}
                                    countLabel={`×${n}`}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* 업적/칭호 12종 */}
            <GroupLabel>
                업적 · {unlockedCount}/{ACHIEVEMENTS.length}
            </GroupLabel>
            <div className="space-y-1 pb-1">
                {ACHIEVEMENTS.map((a) => {
                    const done = a.check(state);
                    return (
                        <div
                            key={a.id}
                            className={`flex items-start gap-2 border px-2.5 py-2 ${
                                done
                                    ? "border-[#c9a86a]/40 bg-[#c9a86a]/[0.05]"
                                    : "border-white/[0.05] opacity-40"
                            }`}
                        >
                            <span className="text-sm">{a.icon}</span>
                            <div className="min-w-0 flex-1">
                                <div
                                    className="flex items-center gap-1.5 truncate text-[11px]"
                                    style={{ color: done ? GOLD : IVORY }}
                                >
                                    {a.name}
                                    {done && (
                                        <span className="text-emerald-400">✓</span>
                                    )}
                                </div>
                                <div
                                    className="truncate text-[10px]"
                                    style={{ color: MUTED }}
                                >
                                    {a.desc}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
