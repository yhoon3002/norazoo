// rpg/menu/TailorPanel.tsx — 아낙 재봉소 패널 (재료+골드 → 신규 장비 4종 제작, 에필로그 해금)
"use client";
import { useGame } from "../presenter/useGameStore";
import { EQUIPMENT } from "../data/gameData";
import { TAILOR_RECIPES } from "../data/tailorData";

/** 재료 표시명 — MenuUI MATERIALS 기준(로컬 맵 필요 시 동일 표기, SmithPanel과 동일 패턴) */
const MATERIAL_NAMES: Record<string, string> = {
    reed: "갈대",
    tree_sap: "나무수액",
    frost_moss: "서리이끼",
    ice_fish: "빙어",
    driftwood: "유목",
    sea_salt: "바닷소금",
    gold_carp: "황금잉어",
    wind_flower: "바람꽃",
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

export function TailorPanel() {
    const isOpen = useGame((s) => s.ui.tailorOpen);
    const gold = useGame((s) => s.player.gold);
    const bag = useGame((s) => s.bag);
    const toggleTailor = useGame((s) => s.toggleTailor);

    if (!isOpen) return null;

    const craft = (r: (typeof TAILOR_RECIPES)[number]) => {
        // fresh 재검증 — 패널이 열려 있는 동안 상태가 바뀌었을 수 있으니 클로저 값 대신 최신 상태로 확인
        const s = useGame.getState();
        if (s.player.gold < r.gold) return;
        const canAfford = r.needs.every(
            (n) => (s.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >= n.qty
        );
        if (!canAfford) return;

        // 단일 setState — 재료 차감 + 골드 차감을 한 번에 반영
        useGame.setState((st: any) => {
            let nextBag = [...st.bag];
            for (const n of r.needs) {
                nextBag = nextBag
                    .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                    .filter((b: any) => b.qty > 0);
            }
            return {
                bag: nextBag,
                player: { ...st.player, gold: st.player.gold - r.gold },
            };
        });
        useGame.getState().addItem(r.id, 1);
        // 도감 기록 — 재봉별 제작 성공 횟수 (killCounts 네임스페이스)
        useGame.setState((st: any) => ({
            killCounts: { ...st.killCounts, [`made_${r.id}`]: (st.killCounts[`made_${r.id}`] ?? 0) + 1 },
        }));
        useGame.getState().spawnPopup({
            side: "ally",
            text: `🧵 ${EQUIPMENT[r.id]?.name ?? r.id} 완성!`,
            color: "#f9a8d4",
        });
    };

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-40">
            <div className="bg-black/90 border border-pink-400 rounded-2xl p-6 w-[28rem] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-pink-300 text-xl font-bold">
                        🧵 아낙 재봉소
                    </h2>
                    <div className="text-yellow-300">💰 {gold} G</div>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                    {TAILOR_RECIPES.map((r) => {
                        const eq = EQUIPMENT[r.id];
                        const affordable =
                            gold >= r.gold &&
                            r.needs.every(
                                (n) =>
                                    (bag.find((b: { id: string; qty: number }) => b.id === n.id)?.qty ?? 0) >=
                                    n.qty
                            );
                        return (
                            <div
                                key={r.id}
                                className="bg-gray-800 p-3 rounded-lg flex justify-between items-center gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="text-white truncate">
                                        {eq?.name ?? r.id}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                        {statText(r.id)}
                                    </div>
                                    <div className="text-xs text-amber-300/80 mt-1">
                                        재료:{" "}
                                        {r.needs
                                            .map((n) => `${displayName(n.id)}×${n.qty}`)
                                            .join(", ")}{" "}
                                        · {r.gold} G
                                    </div>
                                </div>
                                <button
                                    disabled={!affordable}
                                    onClick={() => craft(r)}
                                    className={`shrink-0 px-3 py-1 rounded-lg text-sm font-semibold ${
                                        affordable
                                            ? "bg-pink-500 text-black hover:bg-pink-400"
                                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    제작
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="text-gray-400 text-xs text-center mt-4">
                    E 또는 ESC: 닫기
                </div>
                <button
                    onClick={toggleTailor}
                    className="mt-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
