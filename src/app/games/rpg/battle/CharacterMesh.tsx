// rpg/battle/CharacterMesh.tsx
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

// ── 모듈 레벨 텍스처 캐시 (한 번만 생성, 재사용) ──────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    burn: "#ff6b35",
    poison: "#10b981",
    stun: "#60a5fa",
    freeze: "#0ea5e9",
    buff_atk: "#f59e0b",
};
const STATUS_ICONS: Record<string, string> = {
    burn: "🔥",
    poison: "☠️",
    stun: "⚡",
    freeze: "❄️",
    buff_atk: "⚔️",
};

const statusTextureCache = new Map<string, THREE.CanvasTexture>();

function getStatusTexture(type: string): THREE.CanvasTexture {
    if (statusTextureCache.has(type)) return statusTextureCache.get(type)!;

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = STATUS_COLORS[type] ?? "#ffffff";
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(STATUS_ICONS[type] ?? "?", 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    statusTextureCache.set(type, tex);
    return tex;
}
// ─────────────────────────────────────────────────────────────────────────────

export function CharacterMesh({
    character,
    position,
    isActive: _isActive = false,
    isAttacking = false,
    isTargeted = false,
    playNonce = 0,
    hp = 1,
    maxHp = 1,
    ether = 0,
}: {
    character: any;
    position: [number, number, number];
    isActive?: boolean;
    isAttacking?: boolean;
    isTargeted?: boolean;
    playNonce?: number;
    hp?: number;
    maxHp?: number;
    ether?: number;
}) {
    const [anim, setAnim] = useState<
        | "idle"
        | "attack"
        | "skill1"
        | "skill2"
        | "parry"
        | "hit"
        | "victory"
        | "death"
    >("idle");
    const prevHp = useRef(hp);
    const combat = useGame((s) => s.combat);
    const groupRef = useRef<THREE.Group>(null);

    const currentAnimState = useGame(
        (s) => s.currentAnimState[character.id] || "attack"
    );

    const attackMotion = useGame((s) => s.attackMotion[character.id]);
    const basePos = useRef(new THREE.Vector3(...position));

    // ── 재사용 가능한 Vector3 (매 프레임 할당 방지) ──
    const _targetPos = useRef(new THREE.Vector3());
    const _currentPos = useRef(new THREE.Vector3());

    useEffect(() => {
        if (hp <= 0) setAnim("death");
        else if (combat.phase === "victory") setAnim("victory");
        else if (isAttacking) {
            setAnim(currentAnimState as any);
        } else setAnim("idle");
    }, [hp, isAttacking, combat.phase, currentAnimState]);

    useEffect(() => {
        if (hp < prevHp.current && hp > 0) setAnim("hit");
        prevHp.current = hp;
    }, [hp]);

    useFrame(() => {
        if (!groupRef.current) return;

        if (attackMotion) {
            const { targetId, startTime, duration } = attackMotion;
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);

            const enemies =
                useGame.getState().combat.phase !== "idle"
                    ? (useGame.getState().combat as any).enemies || []
                    : [];
            const enemy = enemies.find((e: any) => e.id === targetId);

            if (enemy) {
                const enemyIndex = enemies.indexOf(enemy);
                const enemyCount = enemies.length;
                const enemySpacing = 1.8;
                const x = (enemyIndex - (enemyCount - 1) / 2) * enemySpacing;
                _targetPos.current.set(x, 1, 3.0);

                const t = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
                const easeInOut =
                    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

                _currentPos.current.lerpVectors(
                    basePos.current,
                    _targetPos.current,
                    easeInOut
                );

                groupRef.current.position.copy(_currentPos.current);
            }
        } else {
            basePos.current.set(...position);
            groupRef.current.position.lerp(basePos.current, 0.2);
        }

        // 죽은 캐릭터 투명도 조정
        if (hp <= 0) {
            groupRef.current.traverse((obj: any) => {
                if (obj.isMesh && obj.material) {
                    obj.material.transparent = true;
                    obj.material.opacity = 0.3;
                }
            });
        }
    });

    const hpRatio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
    const etherClamped = Math.max(0, Math.min(9, ether));

    return (
        <group ref={groupRef}>
            <ModelAvatar
                url={character.modelUrl || "/character/BlueSoldier_Female.fbx"}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                state={anim === "hit" ? "hit" : anim}
                preferredAttack={character.preferredAttack || "attack"}
                scale={0.005}
                playNonce={playNonce}
            />

            {/* 타게팅 링 */}
            <mesh
                position={[0, 0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={isTargeted && hp > 0}
            >
                <ringGeometry args={[1.2, 1.5, 32]} />
                <meshBasicMaterial
                    color="#00ff00"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* HP 바 */}
            <group position={[0, 0.1, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
                <mesh renderOrder={10}>
                    <planeGeometry args={[2.1, 0.16]} />
                    <meshBasicMaterial color={"#000000"} depthTest={false} />
                </mesh>
                <mesh
                    renderOrder={11}
                    position={[-2.1 / 2 + (2.1 * hpRatio) / 2, 0.001, 0]}
                >
                    <planeGeometry args={[2.1 * hpRatio, 0.16]} />
                    <meshBasicMaterial color={"#ef4444"} depthTest={false} />
                </mesh>
            </group>

            {/* Ether */}
            <group position={[0, 0.1, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <mesh
                        key={i}
                        renderOrder={12}
                        position={[-1.0 + i * 0.25, 0.003, 0]}
                        rotation={[0, 0, Math.PI / 4]}
                    >
                        <planeGeometry args={[0.16, 0.16]} />
                        <meshBasicMaterial
                            color={i < etherClamped ? "#22d3ee" : "#1e293b"}
                            depthTest={false}
                            transparent
                            opacity={i < etherClamped ? 1.0 : 0.3}
                        />
                    </mesh>
                ))}
            </group>

            {/* 상태효과 아이콘 - 캐시된 텍스처 재사용 */}
            <group position={[0, 0.15, -0.15]}>
                {character.statusEffects.map(
                    (effect: { type: string }, i: number) => (
                        <sprite
                            key={`${effect.type}-${i}`}
                            position={[-0.4 + i * 0.3, 0, 0]}
                            scale={[0.3, 0.3, 1]}
                        >
                            <spriteMaterial
                                map={getStatusTexture(effect.type)}
                                transparent
                                opacity={1}
                            />
                        </sprite>
                    )
                )}
            </group>
        </group>
    );
}
