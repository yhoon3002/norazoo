import React from "react";
import { OrbitControls, Environment } from "@react-three/drei";
import {
    EffectComposer,
    Bloom,
    DepthOfField,
    Vignette,
} from "@react-three/postprocessing";
import { Phase, Player, Marble } from "../types/MarbleDropTypes";
import { useSimulation } from "../hooks/useSimulation";
import { Ground } from "./Ground";
import { PlayersBaskets } from "./PlayersBaskets";
import { MarbleMesh } from "./MarbleMesh";

interface SceneProps {
    players: Player[];
    marbles: Marble[];
    phase: Phase;
    roundSeconds: number;
    seed: string;
}

export function Scene({
    players,
    marbles,
    phase,
    roundSeconds,
    seed,
}: SceneProps) {
    useSimulation(phase, players, marbles, roundSeconds, seed);

    return (
        <>
            {/* Lights */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[8, 18, 12]}
                intensity={1.1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <spotLight
                position={[-10, 14, -8]}
                intensity={0.7}
                angle={0.5}
                penumbra={0.5}
            />

            <Environment preset="city" />

            <Ground />
            <PlayersBaskets players={players} />
            <MarbleMesh marbles={marbles} />

            <OrbitControls enablePan={false} maxPolarAngle={Math.PI * 0.5} />

            {/* Post FX */}
            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.3}
                    luminanceSmoothing={0.2}
                    intensity={1.2}
                />
                <DepthOfField
                    focusDistance={0.015}
                    focalLength={0.02}
                    bokehScale={1.8}
                />
                <Vignette eskil offset={0.2} darkness={0.7} />
            </EffectComposer>
        </>
    );
}
