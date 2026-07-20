// rpg/menu/ShopPanel.tsx — 상인 NPC 상점 (구매/판매)
"use client";
import { useState } from "react";
import { useGame } from "../presenter/useGameStore";
import {
    ITEM_PRICES,
    SHOP_STOCK,
    SELL_RATIO,
    EQUIPMENT,
} from "../data/gameData";

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

export function ShopPanel() {
    const isOpen = useGame((s) => s.ui.shopOpen);
    const gold = useGame((s) => s.player.gold);
    const bag = useGame((s) => s.bag);
    const buyItem = useGame((s) => s.buyItem);
    const sellItem = useGame((s) => s.sellItem);
    const toggleShop = useGame((s) => s.toggleShop);
    const [tab, setTab] = useState<"buy" | "sell">("buy");

    if (!isOpen) return null;

    const sellables = bag.filter(
        (b: { id: string; qty: number }) => ITEM_PRICES[b.id] != null
    );

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
