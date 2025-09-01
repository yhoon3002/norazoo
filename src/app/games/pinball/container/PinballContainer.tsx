import React, { useState } from "react";
import PinballPresenter from "../presenter/PinballPresenter";
import { HistoryEntry } from "../types/PinballTypes";
import { shuffleName } from "../utils/shuffleName";

export default function PinballContainer() {
    const initialPlayers = [
        "박민호",
        "이지은",
        "임영훈",
        "장민규",
        "정연호",
        "정종호",
    ];

    const [players, setPlayers] = useState<string[]>(
        shuffleName(initialPlayers)
    );
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [round, setRound] = useState<number>(1);

    const addPlayer = (name: string) => setPlayers((arr) => [...arr, name]);
    const removePlayer = (i: number) =>
        setPlayers((arr) => arr.filter((_, idx) => idx !== i));
    const movePlayer = (i: number, dir: -1 | 1) =>
        setPlayers((arr) => {
            const j = i + dir;
            if (j < 0 || j >= arr.length) return arr;
            const copy = arr.slice();
            [copy[i], copy[j]] = [copy[j], copy[i]];
            return copy;
        });

    const pushHistory = (entry: HistoryEntry) =>
        setHistory((h) => [entry, ...h].slice(0, 15));

    const clearHistory = () => setHistory([]);

    return (
        <div className="flex-1 min-h-0 w-full h-full">
            <PinballPresenter
                players={players}
                history={history}
                round={round}
                setRound={setRound}
                addPlayer={addPlayer}
                removePlayer={removePlayer}
                movePlayer={movePlayer}
                pushHistory={pushHistory}
                clearHistory={clearHistory}
            />
        </div>
    );
}
