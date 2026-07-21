// rpg/menu/ShopPanel.tsx — 상인 NPC 상점 (구매/판매/요리)
"use client";
import { useState } from "react";
import { useGame } from "../presenter/useGameStore";
import {
    ITEM_PRICES,
    SHOP_STOCK,
    SELL_RATIO,
    EQUIPMENT,
} from "../data/gameData";
import { RECIPES, type Recipe, FEAST_DEFS, FEAST_GOLD, FEAST_MAX, type FeastDef } from "../data/recipeData";
import { ALCHEMY_RECIPES, type AlchemyRecipe } from "../data/alchemyData";

function itemLabel(id: string): string {
    return EQUIPMENT[id]?.name ?? id.replace(/_/g, " ");
}

function statText(id: string): string {
    const eq = EQUIPMENT[id];
    if (!eq) return "";
    return Object.entries(eq.stats)
        .map(([k, v]) => `${k.toUpperCase()}+${v}`)
        .join(" ");
}

/** 요리 재료 표시명 — EQUIPMENT에 없는 재료 id는 여기서 보강 */
const MATERIAL_NAMES: Record<string, string> = {
    herb: "약초",
    golden_herb: "황금 약초",
    clam: "조개",
    sea_salt: "바닷소금",
    wind_flower: "바람꽃",
    forest_mushroom: "숲버섯",
    fish_common: "생선",
    fish_rare: "월광어",
    reed: "갈대",
    lotus: "연꽃",
    mana_crystal: "마나 수정",
    tree_sap: "나무수액",
    frost_moss: "서리이끼",
};

function displayName(id: string): string {
    return EQUIPMENT[id]?.name ?? MATERIAL_NAMES[id] ?? id.replace(/_/g, " ");
}

export function ShopPanel() {
    const isOpen = useGame((s) => s.ui.shopOpen);
    const gold = useGame((s) => s.player.gold);
    const bag = useGame((s) => s.bag);
    const buyItem = useGame((s) => s.buyItem);
    const sellItem = useGame((s) => s.sellItem);
    const toggleShop = useGame((s) => s.toggleShop);
    const killCounts = useGame((s: any) => s.killCounts);
    const [tab, setTab] = useState<"buy" | "sell" | "cook" | "craft" | "feast">("buy");

    if (!isOpen) return null;

    const sellables = bag.filter(
        (b: { id: string; qty: number }) => ITEM_PRICES[b.id] != null
    );

    const cook = (r: Recipe) => {
        const s = useGame.getState() as any;
        // 신선한 상태로 재료 재검증 — 더블클릭 이중 버프 방지 (claim()과 동일 규약)
        const fresh = useGame.getState();
        const ok = r.needs.every(
            (n) => (fresh.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >= n.qty
        );
        if (!ok) return;
        // 재료 차감
        useGame.setState((st: any) => {
            let bag = [...st.bag];
            for (const n of r.needs)
                bag = bag
                    .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                    .filter((b: any) => b.qty > 0);
            return { bag };
        });
        s.addPendingBuffs(r.buffs);
        s.spawnPopup({ side: "ally", text: `${r.icon} ${r.name} — 다음 전투에 적용!`, color: "#fbbf24" });
    };

    const craft = (r: AlchemyRecipe) => {
        const s = useGame.getState() as any;
        // 신선한 상태로 재료·골드 재검증 — 더블클릭 이중 제작 방지 (cook()과 동일 규약)
        const fresh = useGame.getState();
        const ok =
            fresh.player.gold >= r.gold &&
            r.needs.every((n) => (fresh.bag.find((b: any) => b.id === n.id)?.qty ?? 0) >= n.qty);
        if (!ok) return;
        useGame.setState((st: any) => {
            let bag = [...st.bag];
            for (const n of r.needs)
                bag = bag
                    .map((b: any) => (b.id === n.id ? { ...b, qty: b.qty - n.qty } : b))
                    .filter((b: any) => b.qty > 0);
            return { bag, player: { ...st.player, gold: st.player.gold - r.gold } };
        });
        s.addItem(r.id, 1);
        s.spawnPopup({ side: "ally", text: `${r.icon} ${r.name} 제작!`, color: "#a78bfa" });
    };

    const feast = (d: FeastDef) => {
        const s = useGame.getState() as any;
        const fresh = useGame.getState() as any;
        const n = fresh.killCounts[`feast_${d.stat}`] ?? 0;
        if (n >= FEAST_MAX) return;
        const gold = FEAST_GOLD[n];
        const ok =
            fresh.player.gold >= gold &&
            d.needs.every((x: any) => (fresh.bag.find((b: any) => b.id === x.id)?.qty ?? 0) >= x.qty);
        if (!ok) return;
        useGame.setState((st: any) => {
            let bag = [...st.bag];
            for (const x of d.needs)
                bag = bag
                    .map((b: any) => (b.id === x.id ? { ...b, qty: b.qty - x.qty } : b))
                    .filter((b: any) => b.qty > 0);
            return {
                bag,
                player: { ...st.player, gold: st.player.gold - gold },
                killCounts: { ...st.killCounts, [`feast_${d.stat}`]: n + 1 },
            };
        });
        s.feastStat(d.stat, d.delta);
        s.spawnPopup({ side: "ally", text: `${d.icon} ${d.name}! 파티가 강해졌다`, color: "#fbbf24" });
    };

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-40">
            <div className="bg-black/90 border border-yellow-500 rounded-2xl p-6 w-[26rem] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-yellow-300 text-xl font-bold">
                        🧑‍🍳 상점
                    </h2>
                    <div className="text-yellow-300">💰 {gold} G</div>
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setTab("buy")}
                        className={`flex-1 py-2 rounded-lg font-semibold ${
                            tab === "buy"
                                ? "bg-yellow-600 text-black"
                                : "bg-gray-800 text-gray-300"
                        }`}
                    >
                        구매
                    </button>
                    <button
                        onClick={() => setTab("sell")}
                        className={`flex-1 py-2 rounded-lg font-semibold ${
                            tab === "sell"
                                ? "bg-yellow-600 text-black"
                                : "bg-gray-800 text-gray-300"
                        }`}
                    >
                        판매
                    </button>
                    <button
                        onClick={() => setTab("cook")}
                        className={`flex-1 py-2 rounded-lg font-semibold ${
                            tab === "cook"
                                ? "bg-yellow-600 text-black"
                                : "bg-gray-800 text-gray-300"
                        }`}
                    >
                        요리 🍲
                    </button>
                    <button
                        onClick={() => setTab("craft")}
                        className={`flex-1 py-2 rounded-lg font-semibold ${
                            tab === "craft"
                                ? "bg-yellow-600 text-black"
                                : "bg-gray-800 text-gray-300"
                        }`}
                    >
                        조합 ⚗️
                    </button>
                    <button
                        onClick={() => setTab("feast")}
                        className={`flex-1 py-2 rounded-lg font-semibold ${
                            tab === "feast"
                                ? "bg-yellow-600 text-black"
                                : "bg-gray-800 text-gray-300"
                        }`}
                    >
                        만찬 🍖
                    </button>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                    {tab === "buy" &&
                        SHOP_STOCK.map((id) => {
                            const price = ITEM_PRICES[id] ?? 0;
                            const affordable = gold >= price;
                            return (
                                <div
                                    key={id}
                                    className="bg-gray-800 p-3 rounded-lg flex justify-between items-center"
                                >
                                    <div>
                                        <div className="text-white capitalize">
                                            {itemLabel(id)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {statText(id) || "소모품"}
                                        </div>
                                    </div>
                                    <button
                                        disabled={!affordable}
                                        onClick={() => buyItem(id)}
                                        className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                            affordable
                                                ? "bg-yellow-600 text-black hover:bg-yellow-500"
                                                : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                        }`}
                                    >
                                        {price} G
                                    </button>
                                </div>
                            );
                        })}

                    {tab === "sell" &&
                        (sellables.length === 0 ? (
                            <div className="text-gray-400 text-center py-8">
                                팔 수 있는 아이템이 없습니다
                            </div>
                        ) : (
                            sellables.map(
                                (item: { id: string; qty: number }) => {
                                    const price = Math.max(
                                        1,
                                        Math.floor(
                                            (ITEM_PRICES[item.id] ?? 0) *
                                                SELL_RATIO
                                        )
                                    );
                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-gray-800 p-3 rounded-lg flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="text-white capitalize">
                                                    {itemLabel(item.id)}{" "}
                                                    <span className="text-gray-400 text-sm">
                                                        x{item.qty}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {statText(item.id)}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    sellItem(item.id)
                                                }
                                                className="px-3 py-1 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-600"
                                            >
                                                +{price} G
                                            </button>
                                        </div>
                                    );
                                }
                            )
                        ))}

                    {tab === "cook" && (
                        <div className="space-y-2">
                            {RECIPES.map((r) => {
                                const can = r.needs.every(
                                    (n) =>
                                        (bag.find((b) => b.id === n.id)?.qty ?? 0) >= n.qty
                                );
                                return (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3"
                                    >
                                        <div>
                                            <div className="font-bold text-amber-100">
                                                {r.icon} {r.name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {r.desc} · 재료:{" "}
                                                {r.needs
                                                    .map((n) => `${displayName(n.id)}×${n.qty}`)
                                                    .join(", ")}
                                            </div>
                                        </div>
                                        <button
                                            disabled={!can}
                                            onClick={() => cook(r)}
                                            className={`rounded-lg px-3 py-1.5 text-sm ${
                                                can
                                                    ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/40"
                                                    : "cursor-not-allowed bg-white/5 text-gray-500"
                                            }`}
                                        >
                                            조리
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="pt-1 text-center text-xs text-gray-400">
                                조리한 요리는 바로 먹는다 — 효과는 다음 전투에 적용 (5분 내)
                            </div>
                        </div>
                    )}

                    {tab === "craft" && (
                        <div className="space-y-2">
                            {ALCHEMY_RECIPES.map((r) => {
                                const can =
                                    gold >= r.gold &&
                                    r.needs.every(
                                        (n) =>
                                            (bag.find((b) => b.id === n.id)?.qty ?? 0) >= n.qty
                                    );
                                return (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between rounded-xl border border-purple-400/30 bg-purple-500/5 px-4 py-3"
                                    >
                                        <div>
                                            <div className="font-bold text-purple-100">
                                                {r.icon} {r.name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {r.desc} · 재료:{" "}
                                                {r.needs
                                                    .map((n) => `${displayName(n.id)}×${n.qty}`)
                                                    .join(", ")}{" "}
                                                · {r.gold} G
                                            </div>
                                        </div>
                                        <button
                                            disabled={!can}
                                            onClick={() => craft(r)}
                                            className={`rounded-lg px-3 py-1.5 text-sm ${
                                                can
                                                    ? "bg-purple-500/20 text-purple-200 hover:bg-purple-500/40"
                                                    : "cursor-not-allowed bg-white/5 text-gray-500"
                                            }`}
                                        >
                                            조합
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="pt-1 text-center text-xs text-gray-400">
                                조합한 비약은 가방에 저장 — 전투 중 아이템 메뉴에서 사용
                            </div>
                        </div>
                    )}

                    {tab === "feast" && (
                        <div className="space-y-2">
                            {FEAST_DEFS.map((d) => {
                                const n = killCounts[`feast_${d.stat}`] ?? 0;
                                const maxed = n >= FEAST_MAX;
                                const cost = FEAST_GOLD[Math.min(n, FEAST_MAX - 1)];
                                const can =
                                    !maxed &&
                                    gold >= cost &&
                                    d.needs.every(
                                        (x) =>
                                            (bag.find((b) => b.id === x.id)?.qty ?? 0) >= x.qty
                                    );
                                return (
                                    <div
                                        key={d.stat}
                                        className="flex items-center justify-between rounded-xl border border-yellow-400/30 bg-yellow-500/5 px-4 py-3"
                                    >
                                        <div>
                                            <div className="font-bold text-yellow-100">
                                                {d.icon} {d.name}{" "}
                                                <span className="text-xs text-gray-400">
                                                    {n}/{FEAST_MAX}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {d.desc} · 재료:{" "}
                                                {d.needs
                                                    .map((x) => `${displayName(x.id)}×${x.qty}`)
                                                    .join(", ")}{" "}
                                                {!maxed && `· ${cost} G`}
                                            </div>
                                        </div>
                                        {maxed ? (
                                            <span className="rounded-lg px-3 py-1.5 text-sm text-yellow-300">
                                                🏅 최고 경지
                                            </span>
                                        ) : (
                                            <button
                                                disabled={!can}
                                                onClick={() => feast(d)}
                                                className={`rounded-lg px-3 py-1.5 text-sm ${
                                                    can
                                                        ? "bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/40"
                                                        : "cursor-not-allowed bg-white/5 text-gray-500"
                                                }`}
                                            >
                                                만찬
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="pt-1 text-center text-xs text-gray-400">
                                파티 전원에게 영구 적용 — 스탯별 최대 5회
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-gray-400 text-xs text-center mt-4">
                    E 또는 ESC: 닫기
                </div>
                <button
                    onClick={toggleShop}
                    className="mt-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
