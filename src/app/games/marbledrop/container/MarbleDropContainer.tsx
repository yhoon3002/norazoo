import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Phase, Player, Marble } from "../types/MarbleDropTypes";
import {
    N_PLAYERS_DEFAULT,
    MARBLE_COUNT_DEFAULT,
    ROUND_SECONDS_DEFAULT,
} from "../data/constants";
import {
    cryptoRandomHex,
    sha256Hex,
    mulberry32,
    hashToUint32,
} from "../utils/rng";
import { makePlayers, makeMarbles, computeWinners } from "../utils/game";
import { Scene } from "../presenter/Scene";
import { Overlay } from "../presenter/Overlay";

export default function MarbleDropContainer() {
    const [nPlayers, setNPlayers] = useState(N_PLAYERS_DEFAULT);
    const [marbleCount, setMarbleCount] = useState(MARBLE_COUNT_DEFAULT);
    const [roundSeconds, setRoundSeconds] = useState(ROUND_SECONDS_DEFAULT);

    const [phase, setPhase] = useState<Phase>("READY");
    const [timeLeft, setTimeLeft] = useState(roundSeconds);

    const [seed, setSeed] = useState<string>(cryptoRandomHex(16));
    const [commit, setCommit] = useState<string>("");

    // Players and marbles are re-built when starting a round
    const [players, setPlayers] = useState<Player[]>(makePlayers(nPlayers));
    const [marbles, setMarbles] = useState<Marble[]>([]);
    const [winners, setWinners] = useState<Player[]>([]);

    // Update commit hash when seed changes
    useEffect(() => {
        let mounted = true;
        sha256Hex(seed)
            .then((h) => {
                if (mounted) setCommit(h);
            })
            .catch(() => {
                // Fallback if SHA-256 fails
                if (mounted) setCommit("fallback-hash");
            });
        return () => {
            mounted = false;
        };
    }, [seed]);

    // Timer
    useEffect(() => {
        if (phase !== "PLAY") return;
        let raf = 0;
        let last = performance.now();
        const tick = () => {
            const now = performance.now();
            const dt = (now - last) / 1000;
            last = now;
            setTimeLeft((t) => {
                const next = Math.max(0, t - dt);
                if (next === 0) {
                    cancelAnimationFrame(raf);
                    setPhase("RESULT");
                    setWinners(computeWinners(players, 1, seed));
                }
                return next;
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [phase, players, seed]);

    // Rebuild players when nPlayers changed (outside of PLAY phase)
    useEffect(() => {
        if (phase !== "PLAY") {
            setPlayers((prev) =>
                prev.length === nPlayers ? prev : makePlayers(nPlayers)
            );
        }
    }, [nPlayers, phase]);

    const startRound = () => {
        const newSeed = cryptoRandomHex(16);
        setSeed(newSeed);
        setWinners([]);
        // fresh players counts reset
        const ps = makePlayers(nPlayers);
        setPlayers(ps);

        // build RNG + marbles
        const rng = mulberry32(hashToUint32(newSeed));
        const ms = makeMarbles(nPlayers, marbleCount, rng, ps);
        setMarbles(ms);

        setTimeLeft(roundSeconds);
        setPhase("PLAY");
    };

    const resetAll = () => {
        setPhase("READY");
        setTimeLeft(roundSeconds);
        setWinners([]);
        setPlayers(makePlayers(nPlayers));
        setMarbles([]);
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                background: "#05080d",
            }}
        >
            <Canvas shadows camera={{ position: [0, 8.5, 17], fov: 50 }}>
                <Scene
                    players={players}
                    marbles={marbles}
                    phase={phase}
                    roundSeconds={roundSeconds}
                    seed={seed}
                />
            </Canvas>

            <Overlay
                phase={phase}
                timeLeft={phase === "PLAY" ? timeLeft : roundSeconds}
                onStart={startRound}
                onReset={resetAll}
                players={players}
                winners={winners}
                commit={commit}
                seed={seed}
                setNPlayers={setNPlayers}
                nPlayers={nPlayers}
                setMarbleCount={setMarbleCount}
                marbleCount={marbleCount}
                setRoundSeconds={setRoundSeconds}
                roundSeconds={roundSeconds}
            />
        </div>
    );
}
