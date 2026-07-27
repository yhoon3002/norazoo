// rpg/ui/DialogueUI.tsx — 하단 대화 박스 (초상화+고유색, Space/Enter/클릭으로 진행)
"use client";

import { useEffect } from "react";
import { useGame } from "../presenter/useGameStore";
import { PARTY_META } from "../data/gameData";
import { NPC_SPEAKERS } from "../data/storyData";

export function DialogueUI() {
    const dialogue = useGame((s) => s.dialogue);
    const advanceDialogue = useGame((s) => s.advanceDialogue);
    const combat = useGame((s) => s.combat);
    const cutscene = useGame((s) => s.cutscene);

    const active = combat.phase === "idle" && dialogue.length > 0;

    useEffect(() => {
        if (!active) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                advanceDialogue();
            }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [active, advanceDialogue]);

    if (!active) return null;
    const line = dialogue[0];

    // 파티원(speakerId) → 고유색/초상화, NPC(speaker) → 중립 호박색 + 아이콘
    const meta = line.speakerId ? PARTY_META[line.speakerId] : null;
    const displayName = meta?.displayName ?? line.speaker ?? "???";
    const color = meta?.color ?? "#fbbf24";
    const portrait =
        meta?.portrait ?? NPC_SPEAKERS[line.speaker ?? ""]?.icon ?? "💬";

    return (
        <div
            className="absolute inset-x-0 bottom-8 flex justify-center z-30"
            onClick={advanceDialogue}
        >
            <div
                className="w-[42rem] max-w-[90vw] bg-black/85 backdrop-blur rounded-2xl px-5 py-4 cursor-pointer select-none flex items-start gap-4"
                style={{ border: `1px solid ${color}B3` }}
            >
                <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                    style={{
                        background: `linear-gradient(135deg, ${color}40, ${color}0D)`,
                        border: `1px solid ${color}80`,
                    }}
                >
                    {portrait}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold mb-1" style={{ color }}>
                        {displayName}
                        {meta && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                {meta.role}
                            </span>
                        )}
                    </div>
                    <div className="text-white leading-relaxed">
                        {line.text}
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-2 animate-pulse">
                        Space ▸ ({dialogue.length}
                        {dialogue.length > 1 ? " 남음" : ""})
                        {cutscene && (
                            <span className="ml-2">| Enter 길게: 스킵</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
