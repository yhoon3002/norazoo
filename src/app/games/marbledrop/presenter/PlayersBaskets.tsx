import React from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Player } from "../types/MarbleDropTypes";
import { BASKET_HEIGHT, BASKET_INNER_RADIUS } from "../data/constants";

interface PlayersBasketsProps {
    players: Player[];
}

export function PlayersBaskets({ players }: PlayersBasketsProps) {
    return (
        <group>
            {players.map((p) => (
                <group key={p.id} position={p.pos}>
                    {/* Player stand (simple cylinder instead of capsule for compatibility) */}
                    <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
                        <cylinderGeometry args={[0.35, 0.35, 1.8, 16]} />
                        <meshStandardMaterial
                            color={"#8888ff"}
                            metalness={0.1}
                            roughness={0.5}
                        />
                    </mesh>

                    {/* Basket */}
                    <group position={[0, BASKET_HEIGHT, 0]}>
                        {/* ring */}
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry
                                args={[
                                    BASKET_INNER_RADIUS + 0.02,
                                    0.04,
                                    12,
                                    32,
                                ]}
                            />
                            <meshStandardMaterial
                                color={"#b38b5d"}
                                metalness={0.2}
                                roughness={0.6}
                            />
                        </mesh>
                        {/* soft net look (thin cylinder) */}
                        <mesh position={[0, -0.1, 0]}>
                            <cylinderGeometry
                                args={[
                                    BASKET_INNER_RADIUS,
                                    BASKET_INNER_RADIUS * 0.75,
                                    0.25,
                                    24,
                                    1,
                                    true,
                                ]}
                            />
                            <meshStandardMaterial
                                color={"#e7d7c9"}
                                transparent
                                opacity={0.35}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* Count label */}
                        <Html center distanceFactor={8} position={[0, 0.5, 0]}>
                            <div
                                style={{
                                    padding: "4px 8px",
                                    background: "rgba(0,0,0,0.45)",
                                    borderRadius: 8,
                                    color: "white",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                                }}
                            >
                                {p.name} · ⭐ {p.attachCount} · ⚪{" "}
                                {Math.max(0, p.stackCount - p.attachCount)}
                            </div>
                        </Html>
                    </group>
                </group>
            ))}
        </group>
    );
}
