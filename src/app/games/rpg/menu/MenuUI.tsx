// rpg/menu/MenuUI.tsx
import { useGame } from "../presenter/useGameStore";

export function InventoryPanel() {
    const isOpen = useGame((s) => s.ui.inventoryOpen);
    const bag = useGame((s) => s.bag);
    const party = useGame((s) => s.player.party);
    const useItem = useGame((s) => s.useItem);
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center">
            <div className="bg-black/90 border border-gray-600 rounded-2xl p-6 w-96 max-h-96 overflow-y-auto">
                <h2 className="text-white text-xl font-bold mb-4">Inventory</h2>
                <div className="space-y-3">
                    {bag.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No items
                        </div>
                    ) : (
                        bag.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-800 p-3 rounded-lg"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-white font-medium capitalize">
                                            {item.id.replace(/_/g, " ")}
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                            Quantity: {item.qty}
                                        </div>
                                    </div>
                                    {item.id.includes("potion") && (
                                        <select
                                            className="bg-gray-700 text-white rounded px-3 py-1"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    useItem(
                                                        item.id,
                                                        e.target.value
                                                    );
                                                    (
                                                        e.target as HTMLSelectElement
                                                    ).value = "";
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="">Use on...</option>
                                            {party.map((char) => (
                                                <option
                                                    key={char.id}
                                                    value={char.id}
                                                >
                                                    {char.name} (HP:{" "}
                                                    {char.stats.hp}/
                                                    {char.stats.maxHp})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export function GameMenu() {
    const isOpen = useGame((s) => s.ui.pauseOpen);
    const party = useGame((s) => s.player.party);
    const gold = useGame((s) => s.player.gold);
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center">
            <div className="bg-black/90 border border-gray-600 rounded-2xl p-6 w-96">
                <h2 className="text-white text-xl font-bold mb-4">
                    Expedition 33
                </h2>
                <div className="mb-6">
                    <div className="text-yellow-300 text-lg mb-2">
                        💰 Gold: {gold}
                    </div>
                </div>
                <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">
                        Party Status:
                    </h3>
                    <div className="space-y-2">
                        {party.map((char) => (
                            <div
                                key={char.id}
                                className="bg-gray-800 p-3 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">
                                        {char.portrait}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-medium">
                                            {char.name} (Lv.{char.level})
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            HP: {char.stats.hp}/
                                            {char.stats.maxHp}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            ATK: {char.stats.atk} | DEF:{" "}
                                            {char.stats.def} | SPD:{" "}
                                            {char.stats.speed}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-gray-400 text-sm text-center">
                    ESC: Close Menu | I: Inventory | TAB: Save/Load
                </div>
            </div>
        </div>
    );
}