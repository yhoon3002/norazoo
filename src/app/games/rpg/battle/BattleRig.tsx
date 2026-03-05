// rpg/battle/BattleRig.tsx
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

export function BattleRig() {
    const { camera } = useThree();

    useFrame((state, delta) => {
        const s = useGame.getState();
        if (s.combat.phase === "idle") return;

        const PARTY_Z = -4.5;
        const ENEMY_Z = 4.5;

        const partyAlive = s.player.party.filter((c) => c.stats.hp > 0);
        const enemyCount = s.combat.enemies.length;

        const partySpacing = 2.2;
        const enemySpacing = 1.8;

        const partyXs = partyAlive.map(
            (_, i) => (i - (partyAlive.length - 1) / 2) * partySpacing
        );
        const enemyXs = Array.from({ length: enemyCount }).map(
            (_, i) => (i - (enemyCount - 1) / 2) * enemySpacing
        );

        const allXs = [...partyXs, ...enemyXs];
        const centerX = allXs.length
            ? allXs.reduce((a, b) => a + b, 0) / allXs.length
            : 0;
        const centerZ = (PARTY_Z + ENEMY_Z) * 0.5;
        const lookAt = new THREE.Vector3(centerX, 1.0, centerZ);

        const minX = allXs.length ? Math.min(...allXs) : 0;
        const maxX = allXs.length ? Math.max(...allXs) : 0;
        const widthX = Math.max(6.0, maxX - minX + 4.0);
        const depthZ = Math.abs(ENEMY_Z - PARTY_Z) + 4.0;

        const crowd = Math.max(partyAlive.length, enemyCount);
        const baseHeight = 7.5;
        const baseBack = 12.0;

        const height =
            baseHeight + Math.max(0, widthX - 10) * 0.15 + crowd * 0.2;
        const distZ =
            baseBack +
            Math.max(0, widthX - 10) * 0.3 +
            Math.max(0, depthZ - 10) * 0.5 +
            crowd * 0.6;

        const desired = new THREE.Vector3(centerX, height, centerZ - distZ);

        if (s.combat.phase === "targetSelect") {
            const targetId = s.combat.allowedTargets[s.combat.index];
            const enemyIndex = s.combat.enemies.findIndex(
                (e) => e.id === targetId
            );
            if (enemyIndex >= 0) {
                const targetX = enemyXs[enemyIndex] ?? centerX;
                const targetZ = ENEMY_Z;
                const targetPos = new THREE.Vector3(targetX, 1.5, targetZ);

                const zoomPos = new THREE.Vector3(
                    targetX,
                    Math.max(5, height - 2),
                    targetZ - 5.0
                );
                camera.position.lerp(zoomPos, 0.18);
                camera.lookAt(targetPos);
                return;
            }
        }

        camera.position.lerp(desired, 0.12);
        camera.lookAt(lookAt);
    });

    return null;
}