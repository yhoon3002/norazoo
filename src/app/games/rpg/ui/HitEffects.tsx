import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../presenter/useGameStore";
import * as THREE from "three";

// ── 모듈 레벨 공유 geometry (한 번만 생성) ──────────────────────────────────
const sharedRingGeo = new THREE.RingGeometry(0.8, 1, 32);
const sharedCircleGeo = new THREE.CircleGeometry(0.6, 32);
const sharedSphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
const RING_ROT = new THREE.Euler(-Math.PI / 2, 0, 0);
const PARTICLE_ANGLES = Array.from(
    { length: 8 },
    (_, i) => (i / 8) * Math.PI * 2
);
// ─────────────────────────────────────────────────────────────────────────────

const EFFECT_DURATION = 400;

function HitEffect({
    effect,
}: {
    effect: {
        id: number;
        position: [number, number, number];
        color: string;
        createdAt: number;
    };
}) {
    const groupRef = useRef<THREE.Group>(null);
    const ringMeshRef = useRef<THREE.Mesh>(null);
    const circleMeshRef = useRef<THREE.Mesh>(null);

    // 이펙트 인스턴스별 material (useMemo로 한 번만 생성)
    const mats = useMemo(() => ({
        ring: new THREE.MeshBasicMaterial({
            color: effect.color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
        }),
        circle: new THREE.MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
        }),
        particle: new THREE.MeshBasicMaterial({
            color: effect.color,
            transparent: true,
            opacity: 1,
        }),
    }), [effect.color]);

    useFrame(() => {
        const elapsed = performance.now() - effect.createdAt;
        const progress = Math.min(1, elapsed / EFFECT_DURATION);
        const scale = 0.2 + progress * 2.5;
        const opacity = 1 - progress;

        mats.ring.opacity = opacity * 0.8;
        mats.circle.opacity = opacity * 0.6;
        mats.particle.opacity = opacity;

        if (ringMeshRef.current) ringMeshRef.current.scale.setScalar(scale);
        if (circleMeshRef.current) circleMeshRef.current.scale.setScalar(scale);
        if (groupRef.current) groupRef.current.visible = opacity > 0.01;
    });

    return (
        <group ref={groupRef} position={effect.position}>
            <mesh ref={ringMeshRef} rotation={RING_ROT} geometry={sharedRingGeo} material={mats.ring} />
            <mesh ref={circleMeshRef} rotation={RING_ROT} geometry={sharedCircleGeo} material={mats.circle} />
            {PARTICLE_ANGLES.map((angle, i) => (
                <mesh
                    key={i}
                    position={[Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5]}
                    geometry={sharedSphereGeo}
                    material={mats.particle}
                />
            ))}
        </group>
    );
}

export function HitEffects() {
    const effects = useGame((s) => s.hitEffects);
    const clearOldHitEffects = useGame((s) => s.clearOldHitEffects);

    // setInterval 대신 useFrame으로 만료된 이펙트 정리 (훨씬 가벼움)
    const lastCleanup = useRef(0);
    useFrame(() => {
        const now = performance.now();
        if (now - lastCleanup.current > 200) {
            lastCleanup.current = now;
            clearOldHitEffects(now - EFFECT_DURATION);
        }
    });

    return (
        <>
            {effects.map((effect) => (
                <HitEffect key={effect.id} effect={effect} />
            ))}
        </>
    );
}

export function SlowMotionEffect() {
    const slowMotion = useGame((s) => s.slowMotion);

    if (!slowMotion.active) return null;

    return (
        <div className="absolute inset-0 pointer-events-none">
            <div
                className="absolute inset-0 animate-pulse"
                style={{
                    background:
                        "radial-gradient(circle, transparent 60%, rgba(100,200,255,0.1) 100%)",
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl font-bold text-cyan-400 animate-pulse drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                    COUNTER!
                </div>
            </div>
        </div>
    );
}
