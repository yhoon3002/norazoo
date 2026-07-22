// rpg/battle/EnemyMesh.tsx
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";
import { ENEMY_MODEL_BY_TEMPLATE, ENEMY_TEMPLATES } from "../data/gameData";

// ── CharacterMesh와 공유되는 모듈 레벨 텍스처 캐시 ────────────────────────────
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

export function EnemyMesh({
    enemy,
    position,
    isTargeted = false,
    playNonce = 0,
}: {
    enemy: any;
    position: [number, number, number];
    isTargeted?: boolean;
    playNonce?: number;
}) {
    const [anim, setAnim] = useState<"idle" | "attack" | "hit" | "death">(
        "idle"
    );
    const prevHp = useRef(enemy.stats.hp);
    const st = useGame((s) => s.combat);
    const groupRef = useRef<THREE.Group>(null);
    const hitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const attackMotion = useGame((s) => s.attackMotion[enemy.id]);
    const basePos = useRef(new THREE.Vector3(...position));

    // ── 재사용 가능한 Vector3 (매 프레임 할당 방지) ──
    const _targetPos = useRef(new THREE.Vector3());
    const _currentPos = useRef(new THREE.Vector3());

    // ── 텔레그래프 수축 링 + 차징 글로우 ──
    const shrinkRingRef = useRef<THREE.Mesh>(null);
    const targetRingRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.PointLight>(null);

    useEffect(() => {
        if (enemy.stats.hp <= 0) {
            setAnim("death");
        } else {
            setAnim("idle");
        }
    }, [enemy.stats.hp]);

    // HP 감소 시 Hit 애니메이션
    useEffect(() => {
        if (enemy.stats.hp < prevHp.current && enemy.stats.hp > 0) {
            if (hitTimeoutRef.current) {
                clearTimeout(hitTimeoutRef.current);
            }

            setAnim("hit");

            hitTimeoutRef.current = setTimeout(() => {
                if (enemy.stats.hp > 0) {
                    setAnim("idle");
                }
            }, 500);
        }
        prevHp.current = enemy.stats.hp;
    }, [enemy.stats.hp]);

    // 적의 공격 턴
    useEffect(() => {
        if (st.phase === "defenseWindow" && (st as any).enemyId === enemy.id) {
            setAnim("attack");
        }
    }, [st.phase, (st as any).enemyId, enemy.id]);

    // 컴포넌트 언마운트 시 타임아웃 정리
    useEffect(() => {
        return () => {
            if (hitTimeoutRef.current) {
                clearTimeout(hitTimeoutRef.current);
            }
        };
    }, []);

    useFrame(() => {
        if (!groupRef.current) return;

        if (attackMotion) {
            const { targetId, startTime, duration } = attackMotion;
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);

            const party = useGame
                .getState()
                .player.party.filter((c) => (c.stats?.hp ?? 0) > 0);
            const target = party.find((c: any) => c.id === targetId);

            if (target) {
                const partyIndex = party.indexOf(target);
                const partySpacing = 2.2;
                const targetX =
                    (partyIndex - (party.length - 1) / 2) * partySpacing;
                _targetPos.current.set(targetX, 1, -3.0);

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

        // ── 텔레그래프 수축 링: 링이 안쪽 타겟 링에 닿는 순간 = 타격 타이밍 ──
        const gs = useGame.getState();
        const c = gs.combat as {
            phase: string;
            enemyId?: string;
            telegraph?: import("../types/RpgTypes").Telegraph;
        };
        const tele =
            c.phase === "defenseWindow" && c.enemyId === enemy.id
                ? c.telegraph
                : undefined;
        if (shrinkRingRef.current && targetRingRef.current && glowRef.current) {
            if (tele) {
                const hits: number[] = tele.hits ?? [tele.hitAt];
                const i = Math.min(gs.defenseHitIndex ?? 0, hits.length - 1);
                const hit = hits[i];
                // 방어 튜토리얼 정지 중엔 링도 그 시각에 멈춘다
                const tut = (gs as any).defenseTutorial;
                const now =
                    tut?.stage === "frozen"
                        ? tut.frozenAt
                        : performance.now();
                const windowMs =
                    i === 0 ? hit - tele.startAt : hits[i] - hits[i - 1];
                const t = THREE.MathUtils.clamp(
                    (hit - now) / Math.max(1, windowMs),
                    0,
                    1
                );
                const R_IN = 0.85;
                const R_OUT = 2.6;
                const r = R_IN + (R_OUT - R_IN) * t;

                shrinkRingRef.current.visible = true;
                targetRingRef.current.visible = true;
                shrinkRingRef.current.scale.setScalar(r);
                const mat = shrinkRingRef.current
                    .material as THREE.MeshBasicMaterial;
                mat.color.set(tele.ringColor ?? "#ffd54a");
                mat.opacity = 0.35 + 0.55 * (1 - t);

                // 차징 글로우: 타격이 가까울수록 밝아지고, 판정 윈도우에서 플래시
                glowRef.current.color.set(tele.ringColor ?? "#ffd54a");
                glowRef.current.intensity =
                    0.5 + 4.5 * (1 - t) + (Math.abs(now - hit) < 90 ? 5 : 0);
            } else {
                shrinkRingRef.current.visible = false;
                targetRingRef.current.visible = false;
                glowRef.current.intensity = 0;
            }
        }
    });

    // 템플릿 id 기반 모델 조회 — 이름 휴리스틱은 신규 종(구울·들소·보스 등)을
    // 전부 mage로 오판하므로 template을 1순위로, 휴리스틱은 구세이브 폴백으로만
    const url =
        (enemy.template && ENEMY_MODEL_BY_TEMPLATE[enemy.template]) ||
        ENEMY_MODEL_BY_TEMPLATE[
            enemy.name?.toLowerCase().includes("orc")
                ? "orc"
                : enemy.name?.toLowerCase().includes("slime")
                ? "slime"
                : "mage"
        ] ||
        "/character/Goblin_Male.fbx";

    // 템플릿의 scale 배율(보스급 대형 몬스터용) — 기본 1
    const templateScale = ENEMY_TEMPLATES[enemy.template as string]?.scale ?? 1;
    // 템플릿의 기본공격 모션 변형(예: 원거리 시전형은 shoot) — 미지정 시 attack(펀치)
    const preferredAttack =
        ENEMY_TEMPLATES[enemy.template as string]?.preferredAttack || "attack";

    const BAR_Z_OFFSET = -0.55,
        BAR_Y = 0.05,
        BAR_W = 1.3,
        BAR_H = 0.12;
    const hpRatio = Math.max(
        0,
        Math.min(1, enemy.stats.hp / Math.max(1, enemy.stats.maxHp))
    );

    return (
        <group ref={groupRef}>
            <ModelAvatar
                url={url}
                position={[0, 0, 0]}
                rotation={[0, Math.PI, 0]}
                state={anim}
                preferredAttack={preferredAttack}
                scale={0.01 * templateScale}
                playNonce={playNonce}
            />

            <mesh
                position={[0, 0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={isTargeted}
            >
                <ringGeometry args={[1.2, 1.5, 32]} />
                <meshBasicMaterial
                    color="#00ff00"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 텔레그래프: 수축 링(색=공격 유형) — scale로 반지름 제어 (단위 반지름 1) */}
            <mesh
                ref={shrinkRingRef}
                position={[0, 0.07, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={false}
                renderOrder={15}
            >
                <ringGeometry args={[0.9, 1.0, 48]} />
                <meshBasicMaterial
                    color="#ffd54a"
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                    depthTest={false}
                />
            </mesh>
            {/* 타격 판정 기준선(고정 안쪽 링) — 수축 링이 여기 닿는 순간 입력 */}
            <mesh
                ref={targetRingRef}
                position={[0, 0.07, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={false}
                renderOrder={14}
            >
                <ringGeometry args={[0.78, 0.85, 48]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.75}
                    side={THREE.DoubleSide}
                    depthTest={false}
                />
            </mesh>
            {/* 차징 글로우 */}
            <pointLight
                ref={glowRef}
                position={[0, 1.4, 0]}
                intensity={0}
                distance={6}
                decay={2}
            />

            <group
                position={[0, BAR_Y, BAR_Z_OFFSET]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <mesh renderOrder={10}>
                    <planeGeometry args={[BAR_W + 0.04, BAR_H + 0.04]} />
                    <meshBasicMaterial
                        color={"#111827"}
                        transparent
                        opacity={0.95}
                        depthTest={false}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                    />
                </mesh>
                <mesh renderOrder={11} position={[0, 0.001, 0]}>
                    <planeGeometry args={[BAR_W, BAR_H]} />
                    <meshBasicMaterial
                        color={"#0b1220"}
                        transparent
                        opacity={0.95}
                        depthTest={false}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                    />
                </mesh>
                <mesh
                    renderOrder={12}
                    position={[-BAR_W / 2 + (BAR_W * hpRatio) / 2, 0.002, 0]}
                >
                    <planeGeometry args={[BAR_W * hpRatio, BAR_H]} />
                    <meshBasicMaterial
                        color={"#ff4444"}
                        transparent
                        opacity={0.95}
                        depthTest={false}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                    />
                </mesh>
            </group>

            {/* 상태효과 아이콘 - 캐시된 텍스처 재사용 */}
            <group position={[0, BAR_Y + 0.4, BAR_Z_OFFSET]}>
                {(enemy.statusEffects ?? []).map(
                    (effect: { type: string }, i: number) => (
                        <sprite
                            key={`${effect.type}-${i}`}
                            position={[-0.3 + i * 0.25, 0, 0]}
                            scale={[0.25, 0.25, 1]}
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
