// rpg/field/FieldElements.tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

export function FieldTreasure({ id, pos }: { id: string; pos: THREE.Vector3 }) {
    const ref = useRef<THREE.Mesh>(null);
    const discovered = useGame((s) => s.flags[`treasure_${id}`]);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y += 0.02;
        ref.current.position.y =
            pos.y + 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
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
