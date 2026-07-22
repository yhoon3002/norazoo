// rpg/menu/SmithPanel.tsx — 대장간 강화 패널 (가방 속 장비 +1~+5 강화, +4부터 에필로그 해금)
"use client";
import { useGame } from "../presenter/useGameStore";
import { EQUIPMENT, UPGRADE_COSTS } from "../data/gameData";
import { stageAtLeast } from "../data/storyData";

const MAX_UPGRADE = UPGRADE_COSTS.length; // 5

/** 재료 표시명 — EQUIPMENT에 없는 강화 재료 id는 여기서 보강 */
const MATERIAL_NAMES: Record<string, string> = {
    iron_ore: "철광석",
    silver_ore: "은광석",
    monster_core: "마물 결정",
    dark_crystal: "어둠 수정",
    orc_tusk: "오크 송곳니",
};

function displayName(id: string): string {
    return EQUIPMENT[id]?.name ?? MATERIAL_NAMES[id] ?? id.replace(/_/g, " ");
}

function statText(id: string): string {
    const eq = EQUIPMENT[id];
    if (!eq) return "";
    return Object.entries(eq.stats)
        .map(([k, v]) => `${k.toUpperCase()}+${v}`)
        .join(" ");
}

// 현재 강화 단계: id의 _p{n} 접미로 판정 (없으면 0)
function upgradeInfo(id: string) {
    const m = id.match(/^(.*)_p([1-5])$/);
    return m ? { baseId: m[1], level: Number(m[2]) } : { baseId: id, level: 0 };
}

export function SmithPanel() {
    const isOpen = useGame((s) => s.ui.smithOpen);
    const gold = useGame((s) => s.player.gold);
    const bag = useGame((s) => s.bag);
    const stage = useGame((s) => s.story.stage);
    const toggleSmith = useGame((s) => s.toggleSmith);

    if (!isOpen) return null;

    // 가방 속 장비(EQUIPMENT에 있고 카테고리 equipment) — 장착 중인 장비는 착용
    // 즉시 가방에서 빠지므로(equipItem) 자연히 목록에서 제외된다.
    const equipItems = bag.filter(
        (b: { id: string; qty: number }) => EQUIPMENT[b.id]
    );

    const upgrade = (item: { id: string; qty: number }) => {
        const { baseId, level } = upgradeInfo(item.id);
        if (level >= MAX_UPGRADE) return;
        if (level >= 3 && !stageAtLeast(useGame.getState().story.stage, "epilogue")) return;
        const cost = UPGRADE_COSTS[level];
        const s = useGame.getState();
        if (s.player.gold < cost.gold) return;
        const canAfford = cost.needs.every(
            (n) => (s.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >= n.qty
        );
        if (!canAfford) return;

        // 1) 강화 대상 장비 1개 차감
        useGame.setState((st: any) => ({
            bag: st.bag
                .map((b: any) => (b.id === item.id ? { ...b, qty: b.qty - 1 } : b))
                .filter((b: any) => b.qty > 0),
        }));
        // 2) 다음 단계 파생 1개 추가
        useGame.getState().addItem(`${baseId}_p${level + 1}`, 1);
        // 3) 재료 차감
        useGame.setState((st: any) => {
            let nextBag = [...st.bag];
            for (const n of cost.needs) {
                nextBag = nextBag
                    .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                    .filter((b: any) => b.qty > 0);
            }
            return { bag: nextBag };
        });
        // 4) 골드 차감 — gainGold는 음수 사용 금지, 여기서만 직접 차감
        useGame.setState((st: any) => ({
            player: { ...st.player, gold: st.player.gold - cost.gold },
        }));
        // 5) 결과 안내
        useGame.getState().spawnPopup({
            side: "ally",
            text: `🔨 ${EQUIPMENT[`${baseId}_p${level + 1}`]?.name ?? baseId} 강화 성공!`,
            color: "#fbbf24",
        });
    };

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-40">
            <div className="bg-black/90 border border-yellow-500 rounded-2xl p-6 w-[28rem] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-yellow-300 text-xl font-bold">
                        🔨 SMITHY
                    </h2>
                    <div className="text-yellow-300">💰 {gold} G</div>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                    {equipItems.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            강화할 장비가 없습니다
                        </div>
                    ) : (
                        equipItems.map((item: { id: string; qty: number }) => {
                            const { level } = upgradeInfo(item.id);
                            const maxed = level >= MAX_UPGRADE;
                            const locked = !maxed && level >= 3 && !stageAtLeast(stage, "epilogue");
                            const cost = maxed || locked ? null : UPGRADE_COSTS[level];
                            const affordable =
                                !!cost &&
                                gold >= cost.gold &&
                                cost.needs.every(
                                    (n) =>
                                        (bag.find((b: { id: string; qty: number }) => b.id === n.id)?.qty ?? 0) >=
                                        n.qty
                                );
                            return (
                                <div
                                    key={item.id}
                                    className="bg-gray-800 p-3 rounded-lg flex justify-between items-center gap-3"
                                >
                                    <div className="min-w-0">
                                        <div className="text-white truncate">
                                            {displayName(item.id)}{" "}
                                            <span className="text-gray-400 text-sm">
                                                x{item.qty}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {statText(item.id)}
                                        </div>
                                        {cost && (
                                            <div className="text-xs text-amber-300/80 mt-1">
                                                재료:{" "}
                                                {cost.needs
                                                    .map((n) => `${displayName(n.id)}×${n.qty}`)
                                                    .join(", ")}{" "}
                                                · {cost.gold} G
                                            </div>
                                        )}
                                    </div>
                                    {maxed ? (
                                        <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold bg-gray-700 text-amber-300">
                                            최대 강화
                                        </span>
                                    ) : locked ? (
                                        <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold bg-gray-700 text-amber-300">
                                            💤 대장장이가 깨어나면 +4 강화가 열린다
                                        </span>
                                    ) : (
                                        <button
                                            disabled={!affordable}
                                            onClick={() => upgrade(item)}
                                            className={`shrink-0 px-3 py-1 rounded-lg text-sm font-semibold ${
                                                affordable
                                                    ? "bg-yellow-600 text-black hover:bg-yellow-500"
                                                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                            }`}
                                        >
                                            강화
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div className="pt-1 text-center text-xs text-gray-400">
                        장착 중인 장비는 해제 후 강화할 수 있다
                    </div>
                </div>

                <div className="text-gray-400 text-xs text-center mt-4">
                    E 또는 ESC: 닫기
                </div>
                <button
                    onClick={toggleSmith}
                    className="mt-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
