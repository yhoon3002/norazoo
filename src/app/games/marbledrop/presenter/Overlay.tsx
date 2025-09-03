import React from "react";
import { Phase, Player } from "../types/MarbleDropTypes";

const btnStyle: React.CSSProperties = {
    background: "#5b9dff",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
};

const btnGhost: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
};

interface OverlayProps {
    phase: Phase;
    timeLeft: number;
    onStart: () => void;
    onReset: () => void;
    players: Player[];
    winners: Player[];
    commit: string;
    seed: string;
    setNPlayers: (n: number) => void;
    nPlayers: number;
    setMarbleCount: (n: number) => void;
    marbleCount: number;
    setRoundSeconds: (n: number) => void;
    roundSeconds: number;
}

export function Overlay({
    phase,
    timeLeft,
    onStart,
    onReset,
    players,
    winners,
    commit,
    seed,
    setNPlayers,
    nPlayers,
    setMarbleCount,
    marbleCount,
    setRoundSeconds,
    roundSeconds,
}: OverlayProps) {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                fontFamily: "ui-sans-serif, system-ui",
                color: "white",
            }}
        >
            {/* Top bar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                }}
            >
                <div
                    style={{
                        pointerEvents: "auto",
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        background: "rgba(0,0,0,0.35)",
                        padding: "8px 12px",
                        borderRadius: 12,
                    }}
                >
                    <strong>
                        ⏱️ {phase === "PLAY" ? "PLAY" : phase} ·{" "}
                        {timeLeft.toFixed(1)}s
                    </strong>
                    <span style={{ opacity: 0.8 }}>
                        players: {players.length}
                    </span>
                    <span style={{ opacity: 0.8 }}>
                        marbles: {marbleCount} (⭐ {Math.floor(marbleCount / 2)}
                        )
                    </span>
                </div>

                <div
                    style={{
                        pointerEvents: "auto",
                        display: "flex",
                        gap: 8,
                        background: "rgba(0,0,0,0.35)",
                        padding: "8px 12px",
                        borderRadius: 12,
                    }}
                >
                    <label>
                        Players
                        <input
                            type="number"
                            min={2}
                            max={24}
                            value={nPlayers}
                            onChange={(e) =>
                                setNPlayers(parseInt(e.target.value || "0"))
                            }
                            style={{ width: 60, marginLeft: 6 }}
                        />
                    </label>
                    <label>
                        Marbles
                        <input
                            type="number"
                            min={100}
                            max={3000}
                            step={50}
                            value={marbleCount}
                            onChange={(e) =>
                                setMarbleCount(parseInt(e.target.value || "0"))
                            }
                            style={{ width: 80, marginLeft: 6 }}
                        />
                    </label>
                    <label>
                        Seconds
                        <input
                            type="number"
                            min={30}
                            max={90}
                            step={5}
                            value={roundSeconds}
                            onChange={(e) =>
                                setRoundSeconds(parseInt(e.target.value || "0"))
                            }
                            style={{ width: 70, marginLeft: 6 }}
                        />
                    </label>
                </div>

                <div style={{ pointerEvents: "auto", display: "flex", gap: 8 }}>
                    {phase !== "PLAY" && (
                        <button onClick={onStart} style={btnStyle}>
                            Start
                        </button>
                    )}
                    <button onClick={onReset} style={btnGhost}>
                        Reset
                    </button>
                </div>
            </div>

            {/* Bottom info */}
            <div
                style={{
                    position: "absolute",
                    left: 12,
                    bottom: 12,
                    right: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                }}
            >
                <div
                    style={{
                        pointerEvents: "auto",
                        background: "rgba(0,0,0,0.45)",
                        padding: 12,
                        borderRadius: 12,
                        minWidth: 280,
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        Fair RNG
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                        <div>commit (sha-256 of seed):</div>
                        <code
                            style={{
                                userSelect: "all",
                                wordBreak: "break-all",
                            }}
                        >
                            {commit || "(generating...)"}
                        </code>
                        <div style={{ marginTop: 6 }}>seed:</div>
                        <code
                            style={{
                                userSelect: "all",
                                wordBreak: "break-all",
                            }}
                        >
                            {seed}
                        </code>
                    </div>
                </div>

                {phase === "RESULT" && (
                    <div
                        style={{
                            pointerEvents: "auto",
                            background: "rgba(0,0,0,0.6)",
                            padding: 12,
                            borderRadius: 12,
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            RESULT
                        </div>
                        {winners.length > 0 ? (
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    marginBottom: 12,
                                }}
                            >
                                {winners.map((w: Player, idx: number) => (
                                    <div
                                        key={w.id}
                                        style={{
                                            background: "#111",
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                        }}
                                    >
                                        🏁 #{idx + 1} — {w.name} (⭐{" "}
                                        {w.attachCount})
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>—</div>
                        )}
                        {/* Full leaderboard */}
                        <div
                            style={{
                                fontWeight: 700,
                                marginTop: 8,
                                marginBottom: 6,
                            }}
                        >
                            Leaderboard (⭐ winning only)
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "32px 120px 90px 90px",
                                gap: 6,
                                alignItems: "center",
                            }}
                        >
                            {[...players]
                                .sort(
                                    (a, b) =>
                                        b.attachCount - a.attachCount ||
                                        b.stackCount - a.stackCount
                                )
                                .map((p, i) => (
                                    <React.Fragment key={p.id}>
                                        <div>#{i + 1}</div>
                                        <div>{p.name}</div>
                                        <div>⭐ {p.attachCount}</div>
                                        <div>
                                            ⚪{" "}
                                            {Math.max(
                                                0,
                                                p.stackCount - p.attachCount
                                            )}
                                        </div>
                                    </React.Fragment>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
