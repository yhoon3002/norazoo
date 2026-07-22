// rpg/menu/JournalPane.tsx — 일지 탭(MenuUI 인벤토리 내부): 사이드 퀘스트 3상태 + 사냥 의뢰 진행도
"use client";
import { useGame } from "../presenter/useGameStore";
import { SIDE_QUESTS, type SideQuest } from "../data/questData";
import { BOUNTIES } from "../data/bountyData";
import { stageAtLeast } from "../data/storyData";

const GOLD = "#c9a86a";
const IVORY = "#efe6d0";
const MUTED = "#8b8474";

/** 퀘스트 납품 재료 표시명 — MenuUI MATERIALS 표기와 동일한 한국어 명칭 */
const ITEM_NAMES: Record<string, string> = {
    monster_core: "마물 결정",
    slime_gel: "슬라임 젤",
    kite: "연",
    fish_common: "생선",
    forest_mushroom: "숲버섯",
    tree_sap: "나무수액",
    lotus: "연꽃",
    reed: "갈대",
    driftwood: "유목",
    sea_salt: "바닷소금",
};

function itemName(id: string): string {
    return ITEM_NAMES[id] ?? id.replace(/_/g, " ");
}

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

type QuestStatus = "hidden" | "unaccepted" | "active" | "done";

/** 진행 중 퀘스트의 잔여 조건 요약 — needs(가방 대조)·kills(defeated_ 플래그 대조) */
function remainingSummary(
    quest: SideQuest,
    bag: Array<{ id: string; qty: number }>,
    flags: Record<string, boolean>
): string {
    const parts: string[] = [];
    for (const n of quest.needs ?? []) {
        const have = bag.find((b) => b.id === n.id)?.qty ?? 0;
        const remain = Math.max(0, n.qty - have);
        if (remain > 0) parts.push(`${itemName(n.id)} ${remain}개 부족`);
    }
    const killsRemain = (quest.kills ?? []).filter(
        (fid) => !flags[`defeated_${fid}`]
    ).length;
    if (killsRemain > 0) parts.push(`처치 ${killsRemain}마리 남음`);
    return parts.length ? parts.join(" · ") : "조건 충족 — NPC에게 보고하세요";
}

export function JournalPane() {
    const stage = useGame((s) => s.story.stage);
    const flags = useGame((s) => s.flags);
    const bag = useGame((s) => s.bag);
    const killCounts = useGame(
        (s) => (s as any).killCounts as Record<string, number>
    );

    const rows = SIDE_QUESTS.map((quest) => {
        const done = !!flags[`quest_${quest.id}_done`];
        const accepted = !!flags[`quest_${quest.id}`];
        const visible = stageAtLeast(stage, quest.availableFrom);
        let status: QuestStatus = "hidden";
        if (done) status = "done";
        else if (accepted) status = "active";
        else if (visible) status = "unaccepted";
        return { quest, status };
    }).filter((r) => r.status !== "hidden");

    const progressCount = rows.filter((r) => r.status !== "unaccepted").length;

    return (
        <>
            <GroupLabel>
                사이드 퀘스트 · {progressCount}/{SIDE_QUESTS.length}
            </GroupLabel>
            <div className="space-y-1.5 pb-1">
                {rows.length === 0 && (
                    <div
                        className="flex items-center justify-center py-6 text-xs tracking-[0.3em]"
                        style={{ color: MUTED }}
                    >
                        표시할 퀘스트 없음
                    </div>
                )}
                {rows.map(({ quest, status }) => (
                    <div
                        key={quest.id}
                        className={`border px-2.5 py-2 ${
                            status === "done"
                                ? "border-[#c9a86a]/40 bg-[#c9a86a]/[0.05]"
                                : status === "active"
                                ? "border-white/[0.12]"
                                : "border-white/[0.05] opacity-50"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span
                                className="truncate text-[11px]"
                                style={{ color: status === "done" ? GOLD : IVORY }}
                            >
                                {quest.npc.label}
                            </span>
                            <span
                                className="shrink-0 text-[9px] tracking-[0.2em]"
                                style={{ color: MUTED }}
                            >
                                {status === "done"
                                    ? "완료"
                                    : status === "active"
                                    ? "진행 중"
                                    : "미수락"}
                            </span>
                        </div>
                        {status === "active" && (
                            <div
                                className="mt-0.5 text-[10px]"
                                style={{ color: MUTED }}
                            >
                                {remainingSummary(quest, bag, flags)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <GroupLabel>사냥 의뢰</GroupLabel>
            <div className="space-y-1.5 pb-1">
                {BOUNTIES.map((b) => {
                    const base = killCounts[`bounty_${b.id}_base`];
                    const accepted = base !== undefined;
                    const progress = accepted
                        ? Math.max(0, (killCounts[b.template] ?? 0) - base)
                        : 0;
                    const done = accepted && progress >= b.count;
                    return (
                        <div
                            key={b.id}
                            className={`border px-2.5 py-2 ${
                                done
                                    ? "border-[#c9a86a]/40 bg-[#c9a86a]/[0.05]"
                                    : accepted
                                    ? "border-white/[0.12]"
                                    : "border-white/[0.05] opacity-50"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className="truncate text-[11px]"
                                    style={{ color: done ? GOLD : IVORY }}
                                >
                                    {b.label}
                                </span>
                                <span
                                    className="shrink-0 text-[9px] tracking-[0.2em] tabular-nums"
                                    style={{ color: MUTED }}
                                >
                                    {!accepted
                                        ? "미수락"
                                        : done
                                        ? "완료"
                                        : `${progress}/${b.count}`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
