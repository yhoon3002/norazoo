// rpg/field/FieldPlayer.tsx
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { useEnvironmentGroundHeight } from "./useEnvironmentGroundHeight";
import { FieldPlayerAvatar } from "./FieldPlayerAvatar";
import { FIELD_ENEMIES } from "../data/gameData";

const CAPSULE_RADIUS = 0.34;
const STEP_MAX_UP = 0.85;
const DEFAULT_FIXED_GROUND_Y = -30.0;

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


export function FieldPlayer({
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
    const { scene, camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const mesh = useRef<THREE.Mesh>(null);

    const CHARACTER_GROUND_OFFSET = 0.8;
    const ENEMY_COLLIDE_RADIUS = 1.6;
    const TREASURE_COLLIDE_RADIUS = 1.4;

    const init = useMemo(() => ({ ...useGame.getState().player.pos }), []);

    const activeCharIndex = useGame((s) => s.player.activeCharacter);
    const party = useGame((s) => s.player.party);

    const frameCount = useRef(0);
    const lastCommitT = useRef(0);
    const commitInterval = 1 / 90;

    const lastGroundCheck = useRef(0);
    const cachedGroundY = useRef(init.y);
    const lastXZ = useRef({ x: init.x, z: init.z });

    const tmpV3 = useRef(new THREE.Vector3());
    const moveDir = useRef(new THREE.Vector3());

    const keys = useRef<Record<string, boolean>>({});
    useEffect(() => {
        const down = (e: KeyboardEvent) =>
            (keys.current[e.key.toLowerCase()] = true);
        const up = (e: KeyboardEvent) =>
            (keys.current[e.key.toLowerCase()] = false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    useEffect(() => {
        groupRef.current && (groupRef.current.userData.__player = true);
    }, []);

    const sampleGround = useEnvironmentGroundHeight();

    const wallRay = useMemo(() => new THREE.Raycaster(), []);
    const normalMat = useMemo(() => new THREE.Matrix3(), []);
    const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    // castBlockedOptimized 내부에서 매 호출마다 생성되던 Vector3 재사용
    const _faceNormal = useMemo(() => new THREE.Vector3(), []);
    const _nhVec = useMemo(() => new THREE.Vector3(), []);
    useEffect(() => {
        wallRay.layers.disableAll();
        wallRay.layers.enable(0);
    }, [wallRay]);

    const envTargets = useRef<THREE.Object3D[]>([]);
    useEffect(() => {
        const setTargets = () => {
            envTargets.current =
                (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
                scene.children;
        };
        const t = setTimeout(setTargets, 100);
        return () => clearTimeout(t);
    }, [scene]);

    function castBlockedOptimized(
        fromX: number,
        fromY: number,
        fromZ: number,
        dirX: number,
        dirY: number,
        dirZ: number,
        len: number
    ) {
        const checkDist = len + CAPSULE_RADIUS * 0.5;

        tmpV3.current.set(fromX, fromY, fromZ);
        moveDir.current.set(dirX, dirY, dirZ);

        wallRay.set(tmpV3.current, moveDir.current);
        wallRay.near = 0;
        wallRay.far = checkDist;

        const hits = wallRay.intersectObjects(envTargets.current, true);
        for (const h of hits) {
            const obj: any = h.object;
            if (!h.face) continue;

            let skip = false;
            for (let p = obj; p; p = p.parent) {
                if (p.userData?.__player || p.userData?.__ui) {
                    skip = true;
                    break;
                }
            }
            if (skip) continue;

            _faceNormal.copy(h.face.normal);
            normalMat.getNormalMatrix(obj.matrixWorld);
            _faceNormal.applyNormalMatrix(normalMat).normalize();

            const upDot = _faceNormal.dot(UP);
            if (upDot > 0.5) continue;
            if (upDot < -0.6) continue;

            _nhVec.set(_faceNormal.x, 0, _faceNormal.z);
            if (_nhVec.length() < 0.7) continue;

            return true;
        }
        return false;
    }

    function resolveMovementOptimized(
        prevX: number,
        prevZ: number,
        baseY: number,
        dx: number,
        dz: number
    ): { x: number; z: number; needsGroundCheck: boolean } {
        const len = Math.hypot(dx, dz);
        if (len < 1e-6) return { x: prevX, z: prevZ, needsGroundCheck: false };

        const dirX = dx / len;
        const dirZ = dz / len;
        const checkY = baseY + 0.6;

        if (castBlockedOptimized(prevX, checkY, prevZ, dirX, 0, dirZ, len)) {
            const stepY = baseY + STEP_MAX_UP;

            if (
                !castBlockedOptimized(
                    prevX,
                    stepY + 0.6,
                    prevZ,
                    dirX,
                    0,
                    dirZ,
                    len
                )
            ) {
                return { x: prevX + dx, z: prevZ + dz, needsGroundCheck: true };
            }

            if (
                !castBlockedOptimized(
                    prevX,
                    checkY,
                    prevZ,
                    dirX,
                    0,
                    0,
                    Math.abs(dx)
                )
            ) {
                return { x: prevX + dx, z: prevZ, needsGroundCheck: false };
            }
            if (
                !castBlockedOptimized(
                    prevX,
                    checkY,
                    prevZ,
                    0,
                    0,
                    dirZ,
                    Math.abs(dz)
                )
            ) {
                return { x: prevX, z: prevZ + dz, needsGroundCheck: false };
            }
            return { x: prevX, z: prevZ, needsGroundCheck: false };
        }

        return { x: prevX + dx, z: prevZ + dz, needsGroundCheck: false };
    }

    useFrame((_, dt) => {
        frameCount.current++;

        const pStore = useGame.getState().player.pos;
        const x = pStore.x,
            y = pStore.y,
            z = pStore.z;

        // ✅ Shift 키로 속도 조절
        const isShifting = keys.current["shift"];
        const speed = isShifting ? 12 : 6; // Shift: 뛰기(12), 기본: 걷기(6)
        let mx = 0,
            mz = 0;

        const fwd = tmpV3.current;
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();

        const right = moveDir.current;
        right.crossVectors(fwd, UP).normalize();

        if (keys.current["w"] || keys.current["arrowup"]) {
            mx += fwd.x;
            mz += fwd.z;
        }
        if (keys.current["s"] || keys.current["arrowdown"]) {
            mx -= fwd.x;
            mz -= fwd.z;
        }
        if (keys.current["a"] || keys.current["arrowleft"]) {
            mx -= right.x;
            mz -= right.z;
        }
        if (keys.current["d"] || keys.current["arrowright"]) {
            mx += right.x;
            mz += right.z;
        }

        const mag = Math.hypot(mx, mz);
        let dx = 0,
            dz = 0;
        if (mag > 1e-6) {
            dx = (mx / mag) * speed * dt;
            dz = (mz / mag) * speed * dt;
        }

        const firstSnap = (mesh.current as any)?.__firstSnapDone !== true;
        if (firstSnap) {
            const gy = sampleGround(x, z, 200, {
                baseY: y,
                maxRise: STEP_MAX_UP + 0.5,
                maxDrop: 5.0,
            });
            const finalY = gy !== null ? gy : DEFAULT_FIXED_GROUND_Y;
            cachedGroundY.current = finalY;

            useGame.getState().moveTo({ x, y: finalY, z });
            (mesh.current as any).__firstSnapDone = true;

            mesh.current?.position.set(x, finalY + CHARACTER_GROUND_OFFSET, z);
            (scene.userData.__playerWorldPos ??= new THREE.Vector3()).set(
                x,
                finalY,
                z
            );
            return;
        }

        const moved = resolveMovementOptimized(x, z, y, dx, dz);
        let newX = moved.x,
            newZ = moved.z,
            newY = cachedGroundY.current;

        const posChangedFar =
            Math.abs(newX - lastXZ.current.x) > 0.5 ||
            Math.abs(newZ - lastXZ.current.z) > 0.5;
        const needCheck =
            moved.needsGroundCheck ||
            posChangedFar ||
            frameCount.current - lastGroundCheck.current > 30;

        if (needCheck) {
            const gy = sampleGround(newX, newZ, y + 20, {
                baseY: moved.needsGroundCheck ? y : cachedGroundY.current,
                maxRise: moved.needsGroundCheck
                    ? STEP_MAX_UP + 0.2
                    : STEP_MAX_UP + 0.1,
                maxDrop: 60.0,
            });
            if (gy !== null) {
                newY = gy;
                cachedGroundY.current = gy;
            }
            lastGroundCheck.current = frameCount.current;
            lastXZ.current = { x: newX, z: newZ };
        }

        (scene.userData.__playerWorldPos ??= new THREE.Vector3()).set(
            newX,
            newY,
            newZ
        );

        lastCommitT.current += dt;
        if (lastCommitT.current >= commitInterval) {
            lastCommitT.current = 0;
            const cur = useGame.getState().player.pos;
            if (
                Math.abs(newX - cur.x) > 0.001 ||
                Math.abs(newY - cur.y) > 0.001 ||
                Math.abs(newZ - cur.z) > 0.001
            ) {
                useGame.getState().moveTo({ x: newX, y: newY, z: newZ });
            }
        }

        mesh.current?.position.set(newX, newY + CHARACTER_GROUND_OFFSET, newZ);

        const flags = useGame.getState().flags;

        for (const t of TREASURES) {
            if (flags[`treasure_${t.id}`]) continue;
            if (
                Math.hypot(newX - t.pos.x, newZ - t.pos.z) <=
                TREASURE_COLLIDE_RADIUS
            ) {
                onTreasureCollide(t.id);
            }
        }

        for (const s of FIELD_ENEMIES) {
            const d = Math.hypot(newX - s.pos.x, newZ - s.pos.z);
            if (d > ENEMY_COLLIDE_RADIUS) continue;

            if ("templates" in s && s.templates) {
                const templates = s.templates as readonly string[];
                const ids = templates.map((_, i) => `${s.id}_${i}`);
                const allDefeated = ids.every(
                    (fid) => flags[`defeated_${fid}`]
                );
                if (!allDefeated) {
                    onEnemyCollide({
                        group: templates.map((t, i) => ({
                            template: t,
                            fieldId: `${s.id}_${i}`,
                        })),
                    });
                }
            } else {
                const fid = s.id;
                if (!flags[`defeated_${fid}`]) {
                    onEnemyCollide({ template: (s as { id: string; pos: THREE.Vector3; template: string }).template, fieldId: fid });
                }
            }
        }
    });

    const activeChar = party[activeCharIndex];
    const color = activeChar
        ? activeChar.name === "Gustave"
            ? "#4A90E2"
            : activeChar.name === "Maëlle"
            ? "#E24A7A"
            : activeChar.name === "Sciel"
            ? "#50C878"
            : "#9B59B6"
        : "#333333";

    return (
        <group ref={groupRef}>
            <mesh
                ref={mesh}
                position={[init.x, init.y + CHARACTER_GROUND_OFFSET, init.z]}
                castShadow
                visible={false}
            >
                <capsuleGeometry args={[CAPSULE_RADIUS, 1.2, 8, 16]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.15}
                />
            </mesh>

            <FieldPlayerAvatar />
        </group>
    );
}