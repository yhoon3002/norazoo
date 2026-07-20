// rpg/ui/ChapterTitle.tsx — 챕터 진입 타이틀 카드 (스테이지 전환 연출)
// prologue 진입(게임 시작)과 챕터 스테이지 진입 시 3.5초간 표시된다. 1회성.
"use client";

import { useEffect, useState } from "react";
import { useGame } from "../presenter/useGameStore";
import { CHAPTER_TITLES } from "../data/storyData";

export function ChapterTitle() {
    const stage = useGame((s) => s.story.stage);
    const shown = useGame((s) => !!s.flags[`chapter_${stage}`]);
    const [visible, setVisible] = useState(false);
    const [fading, setFading] = useState(false);

    const entry = CHAPTER_TITLES[stage];

    useEffect(() => {
        if (!entry || shown) return;
        // 1회성 플래그 (세이브에도 저장)
        useGame.setState((st: any) => ({
            flags: { ...st.flags, [`chapter_${stage}`]: true },
        }));
        setVisible(true);
        setFading(false);
        const t1 = setTimeout(() => setFading(true), 3000);
        const t2 = setTimeout(() => setVisible(false), 4000);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    if (!visible || !entry) return null;

    return (
        <div
            className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-1000 ${
                fading ? "opacity-0" : "opacity-100"
            }`}
        >
            <div className="absolute inset-0 bg-black/55" />
            <div className="relative text-center font-serif">
                <div className="text-[11px] uppercase tracking-[0.5em] text-[#c9a86a]">
                    {entry.sub}
                </div>
                <div className="mx-auto my-3 h-px w-48 bg-gradient-to-r from-transparent via-[#c9a86a]/70 to-transparent" />
                <h1 className="text-4xl tracking-[0.3em] text-[#efe6d0]">
                    {entry.title}
                </h1>
                {entry.detail && (
                    <div className="mt-3 text-sm tracking-widest text-[#efe6d0]/60">
                        {entry.detail}
                    </div>
                )}
            </div>
        </div>
    );
}
