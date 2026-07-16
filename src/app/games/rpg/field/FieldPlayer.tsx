// rpg/field/FieldPlayer.tsx
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { useEnvironmentGroundHeight } from "./useEnvironmentGroundHeight";
import { FieldPlayerAvatar } from "./FieldPlayerAvatar";
import { FIELD_ENEMIES, FIELD_TREASURES, PARTY_META } from "../data/gameData";
import type { PartyId } from "../types/RpgTypes";

const CAPSULE_RADIUS = 0.34;
const STEP_MAX_UP = 0.85;
const DEFAULT_FIXED_GROUND_Y = -30.0;




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
    const avatarRef = useRef<THREE.Group>(null);

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
    // 지면이 확인된 마지막 지점 — 발밑에 지면이 없으면(맵 경계 밖·허공) 여기로 복귀
    const lastGoodXZ = useRef({ x: init.x, z: init.z });
    // 표시용 Y — 계단 등에서 지면 높이가 단(0.4~0.5)씩 튀는 것을 러프로 따라가
    // 시각적 팝핑을 없앤다. 판정/스토어는 항상 논리 Y(newY)를 쓴다.
    const renderY = useRef(init.y);
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

    // 식물(알파마스크) 재질 여부 — 잎/풀/꽃 계열
    function isMaskMat(obj: any): boolean {
        const raw = obj.material;
        const m = Array.isArray(raw) ? raw[0] : raw;
        return !!m && (m.alphaTest ?? 0) > 0;
    }

    // 해당 XZ의 최상단 윗면이 "머리 높이(1.7) 이하의 식물 꼭대기"인가 —
    // 긴 풀·고사리·꽃 같은 낮은 식생은 통과, 2m 산울타리 잎벽은 꼭대기가
    // 밴드 밖이라 여기 걸리지 않아 계속 차단된다.
    function shortVegetationAt(hx: number, hz: number, baseY: number): boolean {
        tmpV3.current.set(hx, baseY + 1.72, hz);
        moveDir.current.set(0, -1, 0);
        wallRay.set(tmpV3.current, moveDir.current);
        wallRay.near = 0;
        wallRay.far = 1.62; // baseY+0.1 까지
        const hits = wallRay.intersectObjects(envTargets.current, false);
        for (const h of hits) {
            if (!h.face) continue;
            const obj: any = h.object;
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
            if (_faceNormal.dot(UP) <= 0.5) continue;
            return isMaskMat(obj); // 최상단 윗면이 식물 재질이면 낮은 식생
        }
        return false; // 밴드 안에 꼭대기 없음 = 키 큰 벽 → 차단 유지
    }

    function castBlockedOptimized(
        fromX: number,
        fromY: number,
        fromZ: number,
        dirX: number,
        dirY: number,
        dirZ: number,
        len: number,
        baseY: number
    ) {
        const checkDist = len + CAPSULE_RADIUS * 0.5;

        tmpV3.current.set(fromX, fromY, fromZ);
        moveDir.current.set(dirX, dirY, dirZ);

        wallRay.set(tmpV3.current, moveDir.current);
        wallRay.near = 0;
        wallRay.far = checkDist;

        // __environmentMeshes는 leaf mesh 배열 → recursive=false 사용
        const hits = wallRay.intersectObjects(envTargets.current, false);
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

            // 낮은 식생(긴 풀·꽃)의 옆면은 통과 — 잎벽(2m+)은 그대로 차단
            if (
                isMaskMat(obj) &&
                shortVegetationAt(h.point.x, h.point.z, baseY)
            ) {
                continue;
            }

            return true;
        }
        return false;
    }

    // 계단/난간 구분 게이트 (마인크래프트 의미론): 스텝업은 전방 표면이 한 단
    // 높고, 그 높이의 표면이 "이어질" 때만 허용한다.
    // - 계단/지형: 0.35 앞이 한 단 높음 + 0.95 앞에도 그 높이대 표면이 이어짐 → 통과
    // - 난간/펜스: 상판이 한 단 높아 보여도 폭이 좁아 0.95 앞은 한 단 아래(또는
    //   낭떠러지)라 이어짐 검사에서 탈락 → 차단
    // walkable 메시는 계단을 커버하지 않는 곳이 많아(실측) 여기선 환경 지오메트리만 쓴다.
    function stepUpAllowed(
        prevX: number,
        prevZ: number,
        baseY: number,
        dirX: number,
        dirZ: number
    ): boolean {
        // maxRise는 STEP_MAX_UP 그대로 — 이 맵의 난간 상판(+1.0)이 밴드에
        // 들어오지 않도록 여유분을 두지 않는다 (계단 단 높이는 ~0.5)
        const g1 = sampleGround(
            prevX + dirX * 0.35,
            prevZ + dirZ * 0.35,
            baseY + STEP_MAX_UP + 0.8,
            { baseY, maxRise: STEP_MAX_UP, maxDrop: null }
        );
        if (g1 === null || g1 <= baseY + 0.05) return false;

        const g2 = sampleGround(
            prevX + dirX * 0.95,
            prevZ + dirZ * 0.95,
            g1 + STEP_MAX_UP + 0.8,
            { baseY: g1, maxRise: STEP_MAX_UP + 0.2, maxDrop: 0.5 }
        );
        if (g2 === null) return false;
        // 올라선 단 위에도 머리 공간이 있어야 한다
        return headroomAt(prevX + dirX * 0.35, prevZ + dirZ * 0.35, g1);
    }

    // 머리 공간 검사: 지면 위 1.7 안에 천장(아래를 향한 면)이 있으면 그 틈에는
    // 캐릭터(키 ~1.9)가 들어갈 수 없다 — 천막/차양 아래, 잎 캐노피 속 진입 차단.
    function headroomAt(px: number, pz: number, baseY: number): boolean {
        tmpV3.current.set(px, baseY + 0.2, pz);
        moveDir.current.set(0, 1, 0);
        wallRay.set(tmpV3.current, moveDir.current);
        wallRay.near = 0;
        wallRay.far = 1.5;
        const hits = wallRay.intersectObjects(envTargets.current, false);
        for (const h of hits) {
            if (!h.face) continue;
            _faceNormal.copy(h.face.normal);
            normalMat.getNormalMatrix(h.object.matrixWorld);
            _faceNormal.applyNormalMatrix(normalMat).normalize();
            if (_faceNormal.dot(UP) < -0.3) return false; // 천장
        }
        return true;
    }

    // 울타리/난간처럼 가로 봉 사이에 틈이 있는 구조물은 수평 레이가 틈으로
    // 통과할 수 있다. 상판(봉의 윗면)은 틈과 무관하게 반드시 존재하므로,
    // 전방 0.35 지점에 하향 레이를 쏴서 지면~머리 높이(1.7) 사이의 표면이
    // 있으면 장애물로 판정한다. 천막처럼 단면(밑면 없는) 지오메트리도 상판으로
    // 잡힌다. (계단 단도 잡히지만 stepUpAllowed가 계단만 통과)
    function obstacleAhead(
        px: number,
        pz: number,
        baseY: number,
        dirX: number,
        dirZ: number
    ): boolean {
        // 캡슐 폭 커버: 진행 방향에 수직으로 ±0.25 벌린 3점 프로브.
        // 최상단 윗면이 식물(알파마스크) 꼭대기면 낮은 식생으로 보고 무시한다.
        const ax = px + dirX * 0.35;
        const az = pz + dirZ * 0.35;
        const perpX = -dirZ;
        const perpZ = dirX;
        for (const t of [0, -0.25, 0.25]) {
            const hx = ax + perpX * t;
            const hz = az + perpZ * t;
            tmpV3.current.set(hx, baseY + 1.9, hz);
            moveDir.current.set(0, -1, 0);
            wallRay.set(tmpV3.current, moveDir.current);
            wallRay.near = 0;
            wallRay.far = 1.85; // baseY+0.05 까지
            const hits = wallRay.intersectObjects(envTargets.current, false);
            for (const h of hits) {
                if (!h.face) continue;
                const obj: any = h.object;
                let skip = false;
                for (let pr = obj; pr; pr = pr.parent) {
                    if (pr.userData?.__player || pr.userData?.__ui) {
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
                _faceNormal.copy(h.face.normal);
                normalMat.getNormalMatrix(obj.matrixWorld);
                _faceNormal.applyNormalMatrix(normalMat).normalize();
                if (_faceNormal.dot(UP) <= 0.5) continue; // 윗면만
                if (h.point.y > baseY + 1.7) continue; // 밴드 위
                if (h.point.y <= baseY + 0.05) break; // 지면 — 장애물 아님
                if (isMaskMat(obj)) break; // 식물 꼭대기 — 통과
                return true; // 상판(울타리 봉·계단 등)
            }
        }
        return false;
    }

    // 전방 수면 진입 차단: 목적지 지점의 "최상단 윗면"이 수면(__water)이면 이동 금지.
    // 부두 위는 판자가 최상단이라 통과, 물가에서 물 쪽으로는 차단된다.
    function waterAhead(
        px: number,
        pz: number,
        baseY: number,
        dirX: number,
        dirZ: number
    ): boolean {
        tmpV3.current.set(px + dirX * 0.35, baseY + 1.9, pz + dirZ * 0.35);
        moveDir.current.set(0, -1, 0);
        wallRay.set(tmpV3.current, moveDir.current);
        wallRay.near = 0;
        wallRay.far = 5;
        const hits = wallRay.intersectObjects(envTargets.current, false);
        for (const h of hits) {
            if (!h.face) continue;
            const obj: any = h.object;
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
            if (_faceNormal.dot(UP) <= 0.5) continue; // 윗면만 (벽면 무시)
            return !!obj.userData.__water;
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

        // 현재 위치가 이미 낮은 틈 안이면(스폰 직후·넉백 등) 머리 공간 검사를
        // 생략해 탈출을 허용한다
        const curHeadOk = headroomAt(prevX, prevZ, baseY);
        // 이미 물 위라면(구 세이브 등) 수면 게이트를 생략해 뭍으로 탈출 허용
        const curOnWater = waterAhead(prevX, prevZ, baseY, 0, 0);

        // 가슴+무릎 수평 레이(벽·라이저) + 전방 상판 하향 레이(울타리·난간)
        // + 전방 머리 공간(천막·캐노피 아래 진입 차단)
        if (
            castBlockedOptimized(prevX, checkY, prevZ, dirX, 0, dirZ, len, baseY) ||
            castBlockedOptimized(prevX, baseY + 0.3, prevZ, dirX, 0, dirZ, len, baseY) ||
            obstacleAhead(prevX, prevZ, baseY, dirX, dirZ) ||
            (!curOnWater && waterAhead(prevX, prevZ, baseY, dirX, dirZ)) ||
            (curHeadOk &&
                !headroomAt(prevX + dirX * 0.4, prevZ + dirZ * 0.4, baseY))
        ) {
            const stepY = baseY + STEP_MAX_UP;

            if (
                !castBlockedOptimized(
                    prevX,
                    stepY + 0.6,
                    prevZ,
                    dirX,
                    0,
                    dirZ,
                    len,
                    baseY
                ) &&
                stepUpAllowed(prevX, prevZ, baseY, dirX, dirZ)
            ) {
                return { x: prevX + dx, z: prevZ + dz, needsGroundCheck: true };
            }

            // 슬라이딩도 동일 검사(가슴+무릎+전방 상판+머리 공간) — 축 방향으로 새는 것 방지
            if (
                Math.abs(dx) > 1e-4 &&
                !castBlockedOptimized(prevX, checkY, prevZ, dirX, 0, 0, Math.abs(dx), baseY) &&
                !castBlockedOptimized(prevX, baseY + 0.3, prevZ, dirX, 0, 0, Math.abs(dx), baseY) &&
                !obstacleAhead(prevX, prevZ, baseY, Math.sign(dirX), 0) &&
                (curOnWater || !waterAhead(prevX, prevZ, baseY, Math.sign(dirX), 0)) &&
                (!curHeadOk || headroomAt(prevX + Math.sign(dirX) * 0.4, prevZ, baseY))
            ) {
                return { x: prevX + dx, z: prevZ, needsGroundCheck: false };
            }
            if (
                Math.abs(dz) > 1e-4 &&
                !castBlockedOptimized(prevX, checkY, prevZ, 0, 0, dirZ, Math.abs(dz), baseY) &&
                !castBlockedOptimized(prevX, baseY + 0.3, prevZ, 0, 0, dirZ, Math.abs(dz), baseY) &&
                !obstacleAhead(prevX, prevZ, baseY, 0, Math.sign(dirZ)) &&
                (curOnWater || !waterAhead(prevX, prevZ, baseY, 0, Math.sign(dirZ))) &&
                (!curHeadOk || headroomAt(prevX, prevZ + Math.sign(dirZ) * 0.4, baseY))
            ) {
                return { x: prevX, z: prevZ + dz, needsGroundCheck: false };
            }
            return { x: prevX, z: prevZ, needsGroundCheck: false };
        }

        return { x: prevX + dx, z: prevZ + dz, needsGroundCheck: false };
    }

    useFrame((_, dt) => {
        frameCount.current++;

        // 패스트 트래블/스크립트 텔레포트 요청 소비 — 지면 재스냅은
        // needCheck의 10m+ 텔레포트 분기가 처리한다
        {
            const tp = (useGame.getState() as any).pendingTeleport;
            if (tp) {
                (scene.userData.__playerWorldPos ??= new THREE.Vector3()).set(
                    tp.x,
                    tp.y,
                    tp.z
                );
                useGame.setState({
                    pendingTeleport: null,
                    encounterCooldownUntil: performance.now() + 2500,
                } as any);
            }
        }

        // 스토어(90hz 스로틀) 대신 이전 프레임 계산 결과에서 이어서 시작
        const lastWorldPos = scene.userData.__playerWorldPos as THREE.Vector3 | null;
        const pStore = useGame.getState().player.pos;
        const x = lastWorldPos?.x ?? pStore.x;
        const y = lastWorldPos?.y ?? pStore.y;
        const z = lastWorldPos?.z ?? pStore.z;

        // ✅ Shift 키로 속도 조절
        const isShifting = keys.current["shift"];
        const speed = isShifting ? 7 : 4; // Shift: 뛰기(7), 기본: 걷기(4)
        let mx = 0,
            mz = 0;

        // 대화 중·전체지도 열림 중에는 이동 잠금
        const gState = useGame.getState();
        const inDialogue =
            gState.dialogue.length > 0 || (gState.ui as any).mapOpen === true;

        const fwd = tmpV3.current;
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();

        const right = moveDir.current;
        right.crossVectors(fwd, UP).normalize();

        if (!inDialogue) {
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
        }

        const mag = Math.hypot(mx, mz);
        let dx = 0,
            dz = 0;
        if (mag > 1e-6) {
            // dt 클램프: 프레임 급락 시 한 프레임 이동량이 커지면 충돌 레이가
            // 좁은 문틀에 걸려 과차단·터널링이 생긴다. 8fps 이상에선 발동하지 않아
            // 정상 속도를 유지하고(1/8=0.125s), 그 아래에서만 이동량을 캡한다.
            // (뛰기 7 × 0.125 = 0.875m < 레이 길이 → 벽 관통 방지)
            const dtc = Math.min(dt, 1 / 8);
            dx = (mx / mag) * speed * dtc;
            dz = (mz / mag) * speed * dtc;
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
            renderY.current = finalY;

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
            // 한 프레임 10m+ 이동은 스크립트 텔레포트/리스폰 — 전 범위 재스냅 허용
            const teleported =
                Math.abs(newX - lastXZ.current.x) > 10 ||
                Math.abs(newZ - lastXZ.current.z) > 10;
            const gy = sampleGround(newX, newZ, teleported ? 200 : y + 20, {
                baseY: moved.needsGroundCheck ? y : cachedGroundY.current,
                maxRise: teleported
                    ? 200
                    : moved.needsGroundCheck
                    ? STEP_MAX_UP + 0.2
                    : STEP_MAX_UP + 0.1,
                // 점프가 없는 게임이라 내려가기도 스텝 한계(0.85+여유)로 대칭 제한 —
                // 한 번 떨어지면 못 돌아오는 구덩이(부두 아래 해변 등) 원천 방지
                maxDrop: teleported ? 200 : STEP_MAX_UP + 0.02,
            });
            if (gy !== null) {
                newY = gy;
                cachedGroundY.current = gy;
                lastGoodXZ.current = { x: newX, z: newZ };
            } else {
                // 맵 경계 밖/허공 — 마지막 지면 확인 지점으로 복귀 (맵 이탈 방지)
                newX = lastGoodXZ.current.x;
                newZ = lastGoodXZ.current.z;
                newY = cachedGroundY.current;
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

        // 표시 Y 러프: 계단 팝핑 제거. 낙하/리스폰처럼 큰 차이는 즉시 스냅.
        if (Math.abs(newY - renderY.current) > 1.5) {
            renderY.current = newY;
        } else {
            renderY.current += (newY - renderY.current) * Math.min(1, dt * 12);
        }

        mesh.current?.position.set(newX, renderY.current + CHARACTER_GROUND_OFFSET, newZ);
        // 아바타 위치를 현재 프레임에서 직접 설정 (1프레임 지연 제거)
        avatarRef.current?.position.set(newX, renderY.current, newZ);

        const flags = useGame.getState().flags;

        for (const t of FIELD_TREASURES) {
            if (flags[`treasure_${t.id}`]) continue;
            if (
                Math.hypot(newX - t.pos.x, newZ - t.pos.z) <=
                TREASURE_COLLIDE_RADIUS
            ) {
                onTreasureCollide(t.id);
            }
        }

        // 패배 복귀 직후 잠시 조우 금지 + 대화 중에는 조우/보물 트리거 차단
        if (
            inDialogue ||
            performance.now() <
                (useGame.getState() as unknown as { encounterCooldownUntil?: number })
                    .encounterCooldownUntil!
        ) {
            return;
        }

        const enemyPositions = (scene.userData.__enemyPositions ?? {}) as Record<string, { x: number; z: number; y?: number }>;
        // 다른 층(위/아래)의 적과는 전투 트리거 금지 — 바닥 너머 투명 조우 방지
        const sameLayer = (ePos: { x: number; z: number; y?: number }) =>
            ePos.y === undefined || Math.abs(newY - ePos.y) <= 2.0;

        for (const s of FIELD_ENEMIES) {
            if ("templates" in s && s.templates) {
                const templates = s.templates as readonly string[];
                const ids = templates.map((_, i) => `${s.id}_${i}`);
                const allDefeated = ids.every((fid) => flags[`defeated_${fid}`]);
                if (!allDefeated) {
                    const anyClose = ids.some((fid) => {
                        const ePos = enemyPositions[fid] ?? s.pos;
                        if (!sameLayer(ePos)) return false;
                        return Math.hypot(newX - ePos.x, newZ - ePos.z) <= ENEMY_COLLIDE_RADIUS;
                    });
                    if (anyClose) {
                        onEnemyCollide({
                            group: templates.map((t, i) => ({
                                template: t,
                                fieldId: `${s.id}_${i}`,
                            })),
                        });
                    }
                }
            } else {
                const fid = s.id;
                if (!flags[`defeated_${fid}`]) {
                    const ePos = enemyPositions[fid] ?? s.pos;
                    if (!sameLayer(ePos)) continue;
                    const d = Math.hypot(newX - ePos.x, newZ - ePos.z);
                    if (d <= ENEMY_COLLIDE_RADIUS) {
                        onEnemyCollide({ template: (s as { id: string; pos: THREE.Vector3; template: string }).template, fieldId: fid });
                    }
                }
            }
        }
    });

    const activeChar = party[activeCharIndex];
    const color = activeChar
        ? PARTY_META[activeChar.id as PartyId]?.color ?? "#9B59B6"
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

            <FieldPlayerAvatar ref={avatarRef} />
        </group>
    );
}