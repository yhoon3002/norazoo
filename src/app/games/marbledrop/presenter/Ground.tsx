import React from "react";
import { RING_RADIUS } from "../data/constants";

export function Ground() {
    return (
        <group>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[RING_RADIUS + 6, 64]} />
                <meshStandardMaterial
                    color="#0b0f14"
                    roughness={1}
                    metalness={0}
                />
            </mesh>
            {/* soft ring marker for player circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry
                    args={[RING_RADIUS - 0.05, RING_RADIUS + 0.05, 64]}
                />
                <meshBasicMaterial color="#2c3e50" />
            </mesh>
        </group>
    );
}
