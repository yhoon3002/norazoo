// rpg/menu/SaveLoadPanel.tsx
import { useState } from "react";
import {
    exportToFile,
    importFromFile,
    listSaves,
    load,
    save,
} from "../utils/persist";
import { useGame } from "../presenter/useGameStore";

export function SaveLoadPanel({
    isOpen,
    onClose,
    snapshot,
}: {
    isOpen: boolean;
    onClose: () => void;
    snapshot: () => any;
}) {
    const [saves, setSaves] = useState(listSaves());
    const applySave = useGame((s) => s.applySave);
    const closeAll = useGame((s) => s.closeAll);

    const doSave = (i: number) => {
        save(i, snapshot());
        setSaves(listSaves());
    };

    const doLoad = (i: number) => {
        const d = load(i);
        if (d) {
            applySave(d);
            closeAll();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center">
            <div className="bg-black/90 border border-gray-600 rounded-2xl p-6 w-96">
                <div className="text-white text-xl font-bold mb-4">
                    Save & Load
                </div>
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                        >
                            <div className="flex gap-2">
                                <button
                                    onClick={() => doSave(i)}
                                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm"
                                >
                                    Save {i + 1}
                                </button>
                                <button
                                    onClick={() => doLoad(i)}
                                    className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 transition text-sm"
                                >
                                    Load {i + 1}
                                </button>
                            </div>
                            <div className="flex-1 text-xs text-gray-400 truncate">
                                {saves[i]?.updatedAt
                                    ? saves[i]!.updatedAt!.toLocaleString()
                                    : "Empty Slot"}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2 pt-3 border-t border-gray-600">
                        <button
                            onClick={() => exportToFile(snapshot())}
                            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500 transition"
                        >
                            Export
                        </button>
                        <label className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500 transition cursor-pointer">
                            Import
                            <input
                                type="file"
                                accept="application/json"
                                className="hidden"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const d = await importFromFile(f);
                                    applySave(d);
                                    setSaves(listSaves());
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}