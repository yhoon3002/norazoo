// rpg/field/FieldElements.tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { ENEMY_MODEL_BY_TEMPLATE } from "../data/gameData";

type FieldSpawn =
    | { id: string; pos: THREE.Vector3; template: string }
    | { id: string; pos: THREE.Vector3; templates: string[] };

export function FieldEnemy({
    id,
    pos,
    template,
}: {
    id: string;
    pos: THREE.Vector3;
    template: string;
}) {
    const ref = useRef<THREE.Mesh>(null);
    const defeated = useGame((s) => s.flags[`defeated_${id}`]);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y += 0.01;
        ref.current.position.y =
            pos.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    });
    if (defeated) return null;
    const color =
        template === "slime"
            ? "#4CAF50"
            : template === "orc"
            ? "#8B4513"
            : "#8E44AD";
    return (
        <group>
            <mesh ref={ref} position={pos} castShadow>
                <coneGeometry args={[0.8, 1.6, 8]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[pos.x, pos.y + 2.5, pos.z]}>
                <ringGeometry args={[0.6, 0.8, 16]} />
                <meshBasicMaterial color="#FF0000" transparent opacity={0.7} />
            </mesh>
        </group>
    );
}

export function FieldSpawnMarker({ spawn }: { spawn: FieldSpawn }) {
    const ref = useRef<THREE.Mesh>(null);
    const flags = useGame((s) => s.flags);

    const derivedIds =
        "templates" in spawn
            ? spawn.templates.map((_, i) => `${spawn.id}_${i}`)
            : [spawn.id];

    const cleared = derivedIds.every((fid) => flags[`defeated_${fid}`]);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y += 0.01;
        ref.current.position.y =
            spawn.pos.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    });
    if (cleared) return null;

    const first = "templates" in spawn ? spawn.templates[0] : spawn.template;
    const url = ENEMY_MODEL_BY_TEMPLATE[first] ?? "/character/Goblin_Male.fbx";

    return (
        <group>
            <ModelAvatar
                url={url}
                state="idle"
                rotation={[0, Math.PI, 0]}
                position={[spawn.pos.x, spawn.pos.y, spawn.pos.z]}
                scale={0.01}
            />
            {"templates" in spawn && spawn.templates.length > 1 && (
                <mesh
                    position={[spawn.pos.x, spawn.pos.y + 0.05, spawn.pos.z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[0.8, 1.1, 24]} />
                    <meshBasicMaterial
                        color="#FFD166"
                        transparent
                        opacity={0.85}
                    />
                </mesh>
            )}
        </group>
    );
}

export function FieldTreasure({ id, pos }: { id: string; pos: THREE.Vector3 }) {
    const ref = useRef<THREE.Mesh>(null);
    const discovered = useGame((s) => s.flags[`treasure_${id}`]);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y += 0.02;
        ref.current.position.y =
            pos.y + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    });
    if (discovered) return null;
    return (
        <mesh ref={ref} position={pos} castShadow>
            <octahedronGeometry args={[0.6]} />
            <meshStandardMaterial
                color="#FFD700"
                emissive="#FFA500"
                emissiveIntensity={0.3}
            />
        </mesh>
    );
}