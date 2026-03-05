// rpg/field/FieldScene.tsx
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment as HDRI } from "@react-three/drei";
import * as THREE from "three";
import { EnvironmentModel } from "../environment/EnvironmentModel";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { InteriorLighting } from "../environment/InteriorLighting";
import { FieldPlayer } from "./FieldPlayer";
import { FieldTreasure } from "./FieldElements";
import FieldEnemyAvatar from "./FieldEnemyAvatar";
import { FIELD_ENEMIES } from "../data/gameData";

const TREASURES = [
    {
        id: "t1",
        pos: new THREE.Vector3(-1, 0, -1),
        items: [
            { id: "steel_sword", qty: 1 },
            { id: "health_potion", qty: 2 },
        ],
    },
    {
        id: "t2",
        pos: new THREE.Vector3(10, 0, 10),
        items: [
            { id: "mage_staff", qty: 1 },
            { id: "mana_potion", qty: 3 },
        ],
    },
] as const;


export function FieldScene({
    onEnemyCollide,
    onTreasureCollide,
}: {
    onEnemyCollide: (
        payload:
            | { template: string; fieldId: string }
            | { group: Array<{ template: string; fieldId: string }> }
    ) => void;
    onTreasureCollide: (treasureId: string) => void;
}) {
    const envRef = useRef<THREE.Group>(null);

    return (
        <Canvas
            className="w-full h-full bg-black"
            shadows
            dpr={[1, 1.5]}
            camera={{ fov: 60, near: 0.05, far: 70 }}
            gl={{
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
        >
            <ambientLight intensity={0.35} />
            <directionalLight
                position={[10, 20, 5]}
                intensity={5.2}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <hemisphereLight args={["#bcdfff", "#4a3b2a", 0.55]} />
            <HDRI
                preset="city"
                backgroundIntensity={0.5}
                environmentIntensity={0.5}
            />
            <InteriorLighting />

            <EnvironmentModel
                ref={envRef}
                url="/rpgmap/Environment.glb"
                center
            />

            {FIELD_ENEMIES.flatMap((spawn) => {
                if ("templates" in spawn) {
                    return (spawn.templates as string[]).map((template, idx) => (
                        <FieldEnemyAvatar
                            key={`${spawn.id}_${idx}`}
                            id={`${spawn.id}_${idx}`}
                            template={template}
                            pos={new THREE.Vector3(
                                spawn.pos.x + idx * 0.8,
                                spawn.pos.y,
                                spawn.pos.z + idx * 0.8
                            )}
                        />
                    ));
                }
                return [
                    <FieldEnemyAvatar
                        key={spawn.id}
                        id={spawn.id}
                        template={spawn.template}
                        pos={spawn.pos}
                    />,
                ];
            })}

            {/* 보물 */}
            {TREASURES.map((t) => (
                <FieldTreasure key={t.id} id={t.id} pos={t.pos} />
            ))}

            <FieldPlayer {...{ onEnemyCollide, onTreasureCollide }} />
            <ThirdPersonCamera dist={3.3} height={1.6} shoulder={0.55} />
        </Canvas>
    );
}