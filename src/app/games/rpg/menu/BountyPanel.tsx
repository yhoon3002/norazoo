// rpg/menu/BountyPanel.tsx — 사냥 의뢰판 (반복 토벌: 수락→진행→보상→재수락)
"use client";
import { useGame } from "../presenter/useGameStore";
import { BOUNTIES, type Bounty } from "../data/bountyData";
import { EQUIPMENT } from "../data/gameData";

/** 보상 아이템 표시명 — EQUIPMENT에 없는 재료 id는 여기서 보강 */
const MATERIAL_NAMES: Record<string, string> = {
    health_potion: "회복 물약",
    iron_ore: "철광석",
    tree_sap: "나무수액",
    frost_moss: "서리이끼",
    silver_ore: "은광석",
    mana_crystal: "마나 수정",
    golden_herb: "황금 약초",
    monster_core: "마물 결정",
};

function displayName(id: string): string {
    return EQUIPMENT[id]?.name ?? MATERIAL_NAMES[id] ?? id.replace(/_/g, " ");
}

function rewardText(b: Bounty): string {
    const items = b.rewardItems
        .map((i) => `${displayName(i.id)}×${i.qty}`)
        .join(", ");
    return `${b.rewardGold} G${items ? ` · ${items}` : ""}`;
}

export function BountyPanel() {
    const isOpen = useGame((s) => (s.ui as any).bountyOpen);
    const killCounts = useGame((s) => (s as any).killCounts as Record<string, number>);
    const toggleBounty = useGame((s) => s.toggleBounty);

    if (!isOpen) return null;

    // 수락 — 현재 누적치를 기준점으로 기록
    const accept = (b: Bounty) => {
        useGame.setState((st: any) => ({
            killCounts: {
                ...st.killCounts,
                [`bounty_${b.id}_base`]: st.killCounts[b.template] ?? 0,
            },
        }));
    };

    // 보상 — 지급 후 기준점 삭제(재수락 가능하게)
    const claim = (b: Bounty) => {
        const s = useGame.getState() as any;
        // 신선한 상태로 재검증 — 더블클릭 이중 지급 방지
        const base = s.killCounts[`bounty_${b.id}_base`];
        if (base === undefined) return;
        const progress = (s.killCounts[b.template] ?? 0) - base;
        if (progress < b.count) return;

        s.gainGold(b.rewardGold);
        b.rewardItems.forEach((it) => s.addItem(it.id, it.qty));
        s.spawnPopup({
            side: "ally",
            text: `📋 ${b.label} 완료!`,
            color: "#fde68a",
        });
        useGame.setState((st: any) => {
            const killCounts = { ...st.killCounts };
            delete killCounts[`bounty_${b.id}_base`];
            return { killCounts };
        });
    };

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-40">
            <div className="bg-black/90 border border-yellow-500 rounded-2xl p-6 w-[28rem] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-yellow-300 text-xl font-bold">
                        📋 사냥 의뢰판
                    </h2>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                    {BOUNTIES.map((b) => {
                        const base = killCounts[`bounty_${b.id}_base`];
                        const accepted = base !== undefined;
                        const progress = accepted
                            ? (killCounts[b.template] ?? 0) - base
                            : 0;
                        const done = accepted && progress >= b.count;

                        return (
                            <div
                                key={b.id}
                                className="bg-gray-800 p-3 rounded-lg flex justify-between items-center gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="text-white truncate">
                                        {b.label}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                        {b.desc}
                                    </div>
                                    <div className="text-xs text-amber-300/80 mt-1">
                                        보상: {rewardText(b)}
                                    </div>
                                </div>
                                {!accepted ? (
                                    <button
                                        onClick={() => accept(b)}
                                        className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold bg-yellow-600 text-black hover:bg-yellow-500"
                                    >
                                        수락
                                    </button>
                                ) : done ? (
                                    <button
                                        onClick={() => claim(b)}
                                        className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-600"
                                    >
                                        보상 받기
                                    </button>
                                ) : (
                                    <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold bg-gray-700 text-amber-300">
                                        진행 중 {Math.max(0, progress)}/{b.count}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="text-gray-400 text-xs text-center mt-4">
                    E 또는 ESC: 닫기
                </div>
                <button
                    onClick={toggleBounty}
                    className="mt-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
