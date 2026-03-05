import { useState, useEffect, useRef } from "react";
import { useGame } from "../presenter/useGameStore";

type FeedItem = { id: number; text: string; color: string; at: number };

export function DamageFeed() {
    const combat = useGame((s) => s.combat);
    const party = useGame((s) => s.player.party);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const prevEnemyHp = useRef<Record<string, number>>({});
    const prevPartyHp = useRef<Record<string, number>>({});

    useEffect(() => {
        if (combat.phase !== "idle") {
            combat.enemies.forEach(
                (e) => (prevEnemyHp.current[e.id] = e.stats.hp)
            );
        }
        party.forEach((c) => (prevPartyHp.current[c.id] = c.stats.hp));
    }, []);

    useEffect(() => {
        if (combat.phase === "idle") return;
        combat.enemies.forEach((e) => {
            const prev = prevEnemyHp.current[e.id] ?? e.stats.maxHp;
            if (e.stats.hp < prev) {
                const dmg = prev - e.stats.hp;
                const item: FeedItem = {
                    id: Math.random(),
                    text: `You dealt ${dmg} to ${e.name}`,
                    color: "#fde047",
                    at: Date.now(),
                };
                setFeed((f) => [...f.slice(-3), item]);
            }
            prevEnemyHp.current[e.id] = e.stats.hp;
        });
    }, [combat.enemies.map((e) => e.stats.hp).join(",")]);

    useEffect(() => {
        party.forEach((c) => {
            const prev = prevPartyHp.current[c.id] ?? c.stats.maxHp;
            if (c.stats.hp < prev) {
                const dmg = prev - c.stats.hp;
                const item: FeedItem = {
                    id: Math.random(),
                    text: `${c.name} took ${dmg}`,
                    color: "#93c5fd",
                    at: Date.now(),
                };
                setFeed((f) => [...f.slice(-3), item]);
            }
            prevPartyHp.current[c.id] = c.stats.hp;
        });
    }, [party.map((c) => c.stats.hp).join(",")]);

    useEffect(() => {
        const t = setInterval(() => {
            const now = Date.now();
            setFeed((f) => f.filter((x) => now - x.at < 2200));
        }, 400);
        return () => clearInterval(t);
    }, []);

    if (feed.length === 0) return null;
    return (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            {feed.map((f) => (
                <div
                    key={f.id}
                    className="px-3 py-1 rounded bg-black/70 border border-white/10 text-sm"
                    style={{ color: f.color }}
                >
                    {f.text}
                </div>
            ))}
        </div>
    );
}

export function EnemyHealthBarTop() {
    const combat = useGame((s) => s.combat);
    if (combat.phase === "idle") return null;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center">
            {combat.enemies.map((e) => {
                const hpPercent = (e.stats.hp / e.stats.maxHp) * 100;
                return (
                    <div
                        key={e.id}
                        className="p-3 rounded border border-red-500 bg-red-900/30 min-w-[220px]"
                    >
                        <div className="text-center text-red-200 font-semibold mb-1">
                            {e.name}
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-300"
                                style={{ width: `${hpPercent}%` }}
                            />
                        </div>
                        <div className="text-center text-xs text-red-300 mt-1">
                            {e.stats.hp} / {e.stats.maxHp}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}