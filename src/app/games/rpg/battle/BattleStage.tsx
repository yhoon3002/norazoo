// rpg/battle/BattleStage.tsx
import { useGame } from "../presenter/useGameStore";
import { CharacterMesh } from "./CharacterMesh";
import { EnemyMesh } from "./EnemyMesh";
import * as THREE from "three";
import { HitEffects } from "../ui/HitEffects";

export function BattleStage() {
    const party = useGame((s) => s.player.party);
    const combat = useGame((s) => s.combat);
    const turnQueue = useGame((s) => s.turnQueue);
    const currentTurn = useGame((s) => s.currentTurn);
    const etherOfSelector = useGame((s) => (s as any).etherOf);

    const currentPlayerId = turnQueue[currentTurn];
    const isPlayerAttacking = combat.phase === "playerQTE";

    // ✅ 죽은 캐릭터도 포함 (필터링 제거)
    const partyAll = party;
    const spacing = 2.2;
    const partyXs = partyAll.map(
        (_, i) => (i - (partyAll.length - 1) / 2) * spacing
    );

    const enemyCount = combat.phase !== "idle" ? combat.enemies.length : 0;
    const enemySpacing = 1.8;
    const enemyXs = Array.from({ length: enemyCount }).map(
        (_, i) => (i - (enemyCount - 1) / 2) * enemySpacing
    );

    const swingMap = useGame((s) => s.attackSwing);
    const nonceMap = useGame((s) => s.animNonce);

    const targetedId =
        combat.phase === "targetSelect"
            ? combat.allowedTargets[combat.index]
            : null;

    return (
        <group>
            <mesh scale={120}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial side={THREE.BackSide} color="#0f3d1d" />
            </mesh>

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
                receiveShadow
            >
                <circleGeometry args={[12, 48]} />
                <meshStandardMaterial color="#204e24" />
            </mesh>

            <hemisphereLight args={["#9fd7ff", "#153616", 0.9]} />
            <directionalLight
                position={[8, 12, 4]}
                intensity={1.2}
                color="#ffffff"
                castShadow
            />
            <directionalLight
                position={[-6, 6, 2]}
                intensity={0.65}
                color="#aee5ff"
            />
            <pointLight
                position={[0, 3.5, 0]}
                intensity={2.3}
                distance={16}
                color="#8cffb9"
            />

            {partyAll.map((char, i) => {
                const x = partyXs[i];
                const z = -4.5;
                const isActive = char.id === currentPlayerId;
                const isAttacking =
                    (isPlayerAttacking && isActive) || !!swingMap[char.id];
                const playNonce = nonceMap[char.id] ?? 0;
                const etherValue = etherOfSelector
                    ? etherOfSelector(char.id)
                    : char.ether ?? 0;
                const isTargeted = char.id === targetedId;

                return (
                    <CharacterMesh
                        key={char.id}
                        character={char}
                        position={[x, 1, z]}
                        isActive={isActive}
                        isAttacking={isAttacking}
                        isTargeted={isTargeted}
                        playNonce={playNonce}
                        hp={char.stats.hp}
                        maxHp={char.stats.maxHp}
                        ether={etherValue}
                    />
                );
            })}

            {combat.phase !== "idle" &&
                combat.enemies.map((e, i) => (
                    <EnemyMesh
                        key={e.id}
                        enemy={e}
                        position={[enemyXs[i], 1.2, 4.5]}
                        isTargeted={e.id === targetedId}
                    />
                ))}
            <HitEffects />
        </group>
    );
}