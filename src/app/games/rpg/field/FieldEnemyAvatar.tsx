// rpg/field/FieldEnemyAvatar.tsx
"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ModelAvatar } from "../actors/ModelAvatar";
import { ENEMY_MODEL_BY_TEMPLATE, MERCHANT_POS, MERCHANT_KEEPOUT } from "../data/gameData";
import { useGame } from "../presenter/useGameStore";
import type { AnimState } from "../actors/ModelAvatar";

interface FieldEnemyAvatarProps {
    id: string;
    template: string;
    pos: THREE.Vector3;
}

// ===== 배회 설정 =====
const WANDER_RADIUS = 4;
const WANDER_SPEED = 0.9;
const STUCK_TIME = 1.2;
const STUCK_DIST = 0.05;

// ===== AI 설정 =====
const SIGHT_RANGE = 7;              // 이 거리 이내 → 시야각 체크
const CLOSE_DETECT_RANGE = 2.5;    // 이 거리 이내면 뒤돌아도 항상 감지 (근거리 감각)
const SIGHT_FOV_COS = 0.5;         // cos(60°) → 전방 120도 시야각
const CHASE_FROM_HOME = 15;        // 스폰에서 이 거리 이상 멀어지면 귀환
const RETURN_PAUSE = 1.5;          // 추적 포기 후 귀환 전 대기 시간
const CHASE_SPEED = 2.8;
const RETURN_SPEED = 1.5;
const RETURN_ARRIVE = 1.0;

// ===== 충돌 설정 =====
const SEPARATION_DIST = 1.1;       // 적끼리 최소 거리
const SEPARATION_SPEED = 2.5;
const MAX_STEP = 1.5;              // navmesh 상 허용 최대 높이차 (계단)
const LAYER_GATE = 2.0;            // 이 높이차 이상이면 다른 층으로 간주 (시야/분리 제외)
const OFF_MESH_RECOVER_TIME = 1.5; // off-mesh 지속 시 가장 가까운 표면에 재스냅하는 시간

type EnemyAIState = "wander" | "chase" | "return";

function EnemyMarker({ template }: { template: string }) {
    const color =
        template === "slime" ? "#4CAF50"
        : template === "orc" ? "#CD853F"
        : "#9B59B6";
    return (
        <mesh position={[0, 1, 0]}>
            <coneGeometry args={[0.45, 1.8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
    );
}

export default function FieldEnemyAvatar({ id, template, pos }: FieldEnemyAvatarProps) {
    const defeated = useGame((s) => !!s.flags[`defeated_${id}`]);
    const groupRef = useRef<THREE.Group>(null);

    // 스폰(집) 위치
    const homeX = useRef(pos.x);
    const homeZ = useRef(pos.z);

    // 배회 목적지
    const targetX = useRef(pos.x);
    const targetZ = useRef(pos.z);
    const waitTimer = useRef(Math.random() * 2 + 0.5);
    const isWaiting = useRef(true);

    // Stuck 감지
    const stuckTimer = useRef(0);
    const lastCheckX = useRef(pos.x);
    const lastCheckZ = useRef(pos.z);
    // chase/return용 윈도우 스턱 감지 — 벽 앞 버둥거림(매 프레임 찔끔 이동)에도
    // 순변위가 작으면 막힌 것으로 판정한다
    const stuckAnchor = useRef({ x: pos.x, z: pos.z, t: 0 });

    // AI 상태
    const aiState = useRef<EnemyAIState>("wander");
    // 귀환 전 대기 타이머
    const returnPauseTimer = useRef(0);
    // navmesh 첫 스냅 완료 여부
    const firstSnapDone = useRef(false);
    // groundAt이 계속 null인(off-mesh) 누적 시간 — 공중부양/매몰 고착 복구용
    const offMeshTimer = useRef(0);
    // 조향 우회 상태: 마지막 성공 방향(지그재그 방지) + 커밋된 우회 방향/잔여 프레임
    const steerSign = useRef(0);
    const steerDir = useRef<{ x: number; z: number } | null>(null);
    const steerLock = useRef(0);

    // 애니메이션
    const animRef = useRef<AnimState>("idle");
    const [animState, setAnimState] = useState<AnimState>("idle");

    const setAnim = (next: AnimState) => {
        if (animRef.current !== next) {
            animRef.current = next;
            setAnimState(next);
        }
    };

    const pickNewTarget = () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * WANDER_RADIUS;
        targetX.current = homeX.current + Math.cos(angle) * r;
        targetZ.current = homeZ.current + Math.sin(angle) * r;
    };

    useFrame((state, dt) => {
        if (!groupRef.current) return;

        const ex = groupRef.current.position.x;
        const ez = groupRef.current.position.z;

        // 현재 위치 공유 (FieldPlayer 충돌 감지용) — y 포함: 다른 층 판정에 사용
        ((state.scene.userData.__enemyPositions ??= {}) as Record<string, { x: number; z: number; y: number }>)[id] = {
            x: ex, z: ez, y: groupRef.current.position.y,
        };

        // ===== Navmesh groundAt (Walkable.glb 기반) =====
        // refY 밴드로 현재 높이 근처의 표면만 선택 — 다층 구간(벤치/계단/2층)에서
        // 최상단 표면으로 순간이동하는 것을 방지
        const navGroundAt = state.scene.userData.__navGroundAt as
            | ((
                  x: number,
                  z: number,
                  refY?: number,
                  maxRise?: number,
                  maxDrop?: number
              ) => number | null)
            | undefined;

        // ===== 첫 프레임: 가장 가까운 walkable 지점으로 스폰 위치 스냅 =====
        // 플레이어가 지면 스냅을 마친 뒤(__playerWorldPos 존재)에만 실행 —
        // 스폰 층 기준을 "플레이어의 실제 지면 높이"로 삼기 위해서다.
        // (스폰 데이터의 y=0은 실제 지면(-30 부근)과 무관한 값이라 기준으로 못 쓴다)
        const playerSnapPos = state.scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        if (!firstSnapDone.current && navGroundAt && playerSnapPos) {
            const navFindWalkable = state.scene.userData.__navFindWalkable as
                | ((x: number, z: number, preferY?: number, band?: number) => { x: number; z: number; y: number } | null)
                | undefined;
            if (navFindWalkable) {
                // 데이터에 의도 층 y가 있으면 그 층 기준, 없으면(0) 플레이어 층 기준
                const preferY = pos.y !== 0 ? pos.y : playerSnapPos.y;
                const found = navFindWalkable(homeX.current, homeZ.current, preferY);
                if (found) {
                    groupRef.current.position.set(found.x, found.y, found.z);
                    homeX.current = found.x;
                    homeZ.current = found.z;
                    targetX.current = found.x;
                    targetZ.current = found.z;
                    lastCheckX.current = found.x;
                    lastCheckZ.current = found.z;
                    console.log(
                        `[FieldEnemyAvatar] ${id} 스폰 스냅 → (${found.x.toFixed(1)}, ${found.y.toFixed(1)}, ${found.z.toFixed(1)})`
                    );
                } else {
                    console.warn(
                        `[FieldEnemyAvatar] ${id} 스폰 스냅 실패 — (${homeX.current}, ${homeZ.current}) 주변 반경 10에 플레이어 층 walkable 없음`
                    );
                }
                firstSnapDone.current = true;
                // 이 프레임의 ex/ez는 스냅 이전 값 — 계속 진행하면 스냅한 XZ가 되돌려진다
                return;
            }
        }

        // 대화 중에는 월드 정지 — 적이 다가와 대화를 끊고 전투를 열지 못하게
        if (useGame.getState().dialogue.length > 0) {
            setAnim("idle");
            return;
        }

        // navmesh 이동 검증: 새 위치가 walkable하고 높이차가 허용 범위 내면 이동
        // navGroundAt이 null을 반환하면(좌표 불일치 등) 자유 이동으로 폴백
        // groundY: 이동을 승인한 지면 높이 — 최종 Y 보정이 같은 기준면을 쓰도록 반환
        const applyMovement = (
            curX: number,
            curZ: number,
            dx: number,
            dz: number
        ): { x: number; z: number; groundY: number | null } => {
            const len = Math.hypot(dx, dz);
            if (len < 1e-6) return { x: curX, z: curZ, groundY: null };

            // NPC 보호 반경: 상인에게 "다가가는" 이동은 차단 — 배회/추적이
            // 상인 옆에서 전투를 열거나 대화 동선을 침범하지 못하게 한다.
            // (반경 밖으로 나가는 이동은 허용 → 안에 갇히는 일 없음)
            const keepoutBlocked = (toX: number, toZ: number): boolean => {
                const dNew = Math.hypot(toX - MERCHANT_POS.x, toZ - MERCHANT_POS.z);
                if (dNew >= MERCHANT_KEEPOUT) return false;
                return dNew < Math.hypot(curX - MERCHANT_POS.x, curZ - MERCHANT_POS.z);
            };
            if (keepoutBlocked(curX + dx, curZ + dz)) {
                // 축 슬라이딩으로 반경 가장자리를 따라 흐르는 것은 허용
                if (Math.abs(dx) > 1e-4 && !keepoutBlocked(curX + dx, curZ)) {
                    dz = 0;
                } else if (Math.abs(dz) > 1e-4 && !keepoutBlocked(curX, curZ + dz)) {
                    dx = 0;
                } else {
                    return { x: curX, z: curZ, groundY: null };
                }
            }

            if (!navGroundAt) {
                return { x: curX + dx, z: curZ + dz, groundY: null };
            }

            // 현재 위치가 navmesh에 없으면 좌표계 불일치 → 자유 이동 폴백
            // (기준 높이는 호출 시점의 실제 그룹 Y — 스폰 스냅 직후에도 유효)
            const refY = groupRef.current!.position.y;
            const curGroundY = navGroundAt(curX, curZ, refY, MAX_STEP, MAX_STEP);
            if (curGroundY === null) {
                return { x: curX + dx, z: curZ + dz, groundY: null };
            }

            // 전방 이동 검증
            const fullY = navGroundAt(curX + dx, curZ + dz, curGroundY, MAX_STEP, MAX_STEP);
            if (fullY !== null && Math.abs(fullY - curGroundY) <= MAX_STEP) {
                return { x: curX + dx, z: curZ + dz, groundY: fullY };
            }
            // X축 슬라이딩
            if (Math.abs(dx) > 1e-4) {
                const xY = navGroundAt(curX + dx, curZ, curGroundY, MAX_STEP, MAX_STEP);
                if (xY !== null && Math.abs(xY - curGroundY) <= MAX_STEP) {
                    return { x: curX + dx, z: curZ, groundY: xY };
                }
            }
            // Z축 슬라이딩
            if (Math.abs(dz) > 1e-4) {
                const zY = navGroundAt(curX, curZ + dz, curGroundY, MAX_STEP, MAX_STEP);
                if (zY !== null && Math.abs(zY - curGroundY) <= MAX_STEP) {
                    return { x: curX, z: curZ + dz, groundY: zY };
                }
            }
            return { x: curX, z: curZ, groundY: curGroundY };
        };

        // 직진이 막히면 목표 기준 ±45/±90/±135°에서 통행 가능한 방향을 골라
        // 우회한다 — 이동불가 영역(울타리·단차)에 가로막혀도 벽을 따라 돌아서 추적.
        // 한 스텝(수 cm) 단위 판정은 앞뒤 진동만 만들므로, 후보 방향은
        // 0.4/0.8 룩어헤드로 검증하고 선택한 방향을 ~0.5초 유지(커밋)한다.
        const moveWithSteering = (
            curX: number,
            curZ: number,
            dx: number,
            dz: number
        ): { x: number; z: number; groundY: number | null } => {
            const direct = applyMovement(curX, curZ, dx, dz);
            const step = Math.hypot(dx, dz);
            if (step < 1e-6) return direct;

            // 요청 방향으로의 실제 진행률 (1=완전 직진, 0=제자리).
            // 축 슬라이드가 목표와 거의 수직으로 찔끔 미끄러지는 것을
            // "이동 성공"으로 치면 조향이 발동하지 않고 벽에 비비게 된다.
            const progress =
                ((direct.x - curX) * dx + (direct.z - curZ) * dz) /
                (step * step);
            if (steerLock.current <= 0 || !steerDir.current) {
                if (progress > 0.35) return direct; // 유의미한 전진 → 직진 수용
            } else if (progress > 0.95) {
                // 커밋 중 완전 직진이 뚫림 → 우회 종료
                steerLock.current = 0;
                steerDir.current = null;
                return direct;
            }

            // 커밋된 우회 방향 유지
            if (steerLock.current > 0 && steerDir.current) {
                steerLock.current--;
                const r = applyMovement(
                    curX,
                    curZ,
                    steerDir.current.x * step,
                    steerDir.current.z * step
                );
                if (r.x !== curX || r.z !== curZ) return r;
                steerLock.current = 0; // 커밋 방향도 막히면 재선택
            }

            const ux = dx / step;
            const uz = dz / step;
            const refY = groupRef.current!.position.y;
            const curG = navGroundAt
                ? navGroundAt(curX, curZ, refY, MAX_STEP, MAX_STEP)
                : null;
            const first = steerSign.current >= 0 ? 1 : -1;
            for (const base of [45, 90, 135]) {
                for (const sign of [first, -first]) {
                    const rad = (base * sign * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const sx = ux * cos - uz * sin;
                    const sz = ux * sin + uz * cos;
                    // 룩어헤드: 0.4/0.8 지점이 walkable해야 커밋 (진동 방지)
                    if (curG !== null && navGroundAt) {
                        if (
                            navGroundAt(curX + sx * 0.4, curZ + sz * 0.4, curG, MAX_STEP, MAX_STEP) === null ||
                            navGroundAt(curX + sx * 0.8, curZ + sz * 0.8, curG, MAX_STEP, MAX_STEP) === null
                        )
                            continue;
                    }
                    const r = applyMovement(curX, curZ, sx * step, sz * step);
                    if (r.x !== curX || r.z !== curZ) {
                        steerSign.current = sign;
                        steerDir.current = { x: sx, z: sz };
                        steerLock.current = 30;
                        return r;
                    }
                }
            }
            return direct;
        };

        // ===== 플레이어 위치 =====
        const playerWorldPos = state.scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        const px = playerWorldPos?.x ?? useGame.getState().player.pos.x;
        const pz = playerWorldPos?.z ?? useGame.getState().player.pos.z;
        const py = playerWorldPos?.y ?? useGame.getState().player.pos.y;
        const playerDist = Math.hypot(px - ex, pz - ez);
        const homeDist = Math.hypot(homeX.current - ex, homeZ.current - ez);

        // ===== 시야 감지: 전방 120도 + 근거리 무조건 감지 =====
        const canSeePlayer = (): boolean => {
            // 다른 층(위/아래)의 플레이어는 감지하지 않음 — 바닥 너머 투명 조우 방지
            if (Math.abs(py - groupRef.current!.position.y) > LAYER_GATE) return false;
            if (playerDist > SIGHT_RANGE) return false;
            if (playerDist < CLOSE_DETECT_RANGE) return true;
            const angle = groupRef.current!.rotation.y;
            const fwdX = -Math.sin(angle);
            const fwdZ = -Math.cos(angle);
            const toDirX = (px - ex) / playerDist;
            const toDirZ = (pz - ez) / playerDist;
            return fwdX * toDirX + fwdZ * toDirZ > SIGHT_FOV_COS;
        };

        // ===== AI 상태 전환 =====
        if (aiState.current === "wander") {
            if (canSeePlayer()) {
                aiState.current = "chase";
                isWaiting.current = false;
                stuckTimer.current = 0;
                lastCheckX.current = ex;
                lastCheckZ.current = ez;
            }
        } else if (aiState.current === "chase") {
            if (homeDist > CHASE_FROM_HOME) {
                aiState.current = "return";
                returnPauseTimer.current = RETURN_PAUSE + Math.random() * 0.5;
                stuckTimer.current = 0;
            }
        } else if (aiState.current === "return") {
            if (canSeePlayer()) {
                aiState.current = "chase";
                returnPauseTimer.current = 0;
                stuckTimer.current = 0;
                lastCheckX.current = ex;
                lastCheckZ.current = ez;
            } else if (returnPauseTimer.current <= 0 && homeDist < RETURN_ARRIVE) {
                aiState.current = "wander";
                isWaiting.current = true;
                waitTimer.current = 0.5 + Math.random() * 1.5;
            }
        }

        // ===== 이동 계산 =====
        let newX = ex;
        let newZ = ez;
        let facingDx = 0;
        let facingDz = 0;
        // 이번 프레임 applyMovement가 승인한 지면 높이 (최종 Y 보정 기준면)
        let frameGroundY: number | null = null;

        if (aiState.current === "chase") {
            const dx = px - ex;
            const dz = pz - ez;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.3) {
                const step = Math.min(CHASE_SPEED * dt, dist);
                const r = moveWithSteering(ex, ez, (dx / dist) * step, (dz / dist) * step);
                newX = r.x; newZ = r.z;
                if (r.groundY !== null) frameGroundY = r.groundY;
                facingDx = newX - ex || dx; facingDz = newZ - ez || dz;
                setAnim("run");

                // 윈도우 스턱: 2.5초간 순변위가 작으면 우회 불가로 보고 추적 포기
                const a = stuckAnchor.current;
                a.t += dt;
                if (a.t >= 2.5) {
                    if (Math.hypot(newX - a.x, newZ - a.z) < 0.8) {
                        aiState.current = "return";
                        returnPauseTimer.current =
                            RETURN_PAUSE + Math.random() * 0.5;
                    }
                    stuckAnchor.current = { x: newX, z: newZ, t: 0 };
                }
            } else {
                setAnim("idle");
            }

        } else if (aiState.current === "return") {
            if (returnPauseTimer.current > 0) {
                returnPauseTimer.current -= dt;
                setAnim("idle");
            } else {
                const dx = homeX.current - ex;
                const dz = homeZ.current - ez;
                const dist = Math.hypot(dx, dz);
                if (dist > 0.1) {
                    const step = Math.min(RETURN_SPEED * dt, dist);
                    const r = moveWithSteering(ex, ez, (dx / dist) * step, (dz / dist) * step);
                    newX = r.x; newZ = r.z;
                    if (r.groundY !== null) frameGroundY = r.groundY;
                    facingDx = newX - ex || dx; facingDz = newZ - ez || dz;
                    setAnim("walk");

                    // 귀환 경로가 막히면 현재 위치를 새 집으로 (영구 교착 방지) — 윈도우 스턱
                    const a = stuckAnchor.current;
                    a.t += dt;
                    if (a.t >= 2.5) {
                        if (Math.hypot(newX - a.x, newZ - a.z) < 0.8) {
                            homeX.current = newX;
                            homeZ.current = newZ;
                            aiState.current = "wander";
                            isWaiting.current = true;
                            waitTimer.current = 0.5 + Math.random() * 1.5;
                        }
                        stuckAnchor.current = { x: newX, z: newZ, t: 0 };
                    }
                }
            }

        } else {
            // ===== 배회 =====
            if (isWaiting.current) {
                waitTimer.current -= dt;
                if (waitTimer.current <= 0) {
                    pickNewTarget();
                    isWaiting.current = false;
                    setAnim("walk");
                } else {
                    setAnim("idle");
                }
            } else {
                const dx = targetX.current - ex;
                const dz = targetZ.current - ez;
                const dist = Math.hypot(dx, dz);

                if (dist < 0.15) {
                    isWaiting.current = true;
                    waitTimer.current = 1.5 + Math.random() * 2.5;
                    stuckTimer.current = 0;
                    lastCheckX.current = ex;
                    lastCheckZ.current = ez;
                    setAnim("idle");
                } else {
                    const step = Math.min(WANDER_SPEED * dt, dist);
                    const r = applyMovement(ex, ez, (dx / dist) * step, (dz / dist) * step);
                    newX = r.x; newZ = r.z;
                    if (r.groundY !== null) frameGroundY = r.groundY;
                    facingDx = dx; facingDz = dz;

                    const movedDist = Math.hypot(newX - lastCheckX.current, newZ - lastCheckZ.current);
                    if (movedDist > STUCK_DIST) {
                        stuckTimer.current = 0;
                        lastCheckX.current = newX;
                        lastCheckZ.current = newZ;
                        setAnim("walk");
                    } else {
                        stuckTimer.current += dt;
                        if (stuckTimer.current > STUCK_TIME) {
                            stuckTimer.current = 0;
                            lastCheckX.current = newX;
                            lastCheckZ.current = newZ;
                            pickNewTarget();
                        }
                    }
                }
            }
        }

        // ===== 적끼리 밀어내기 (Separation) =====
        const allEnemyPos = state.scene.userData.__enemyPositions as Record<string, { x: number; z: number; y?: number }> | undefined;
        if (allEnemyPos) {
            let sepX = 0, sepZ = 0;
            for (const otherId in allEnemyPos) {
                if (otherId === id) continue;
                const other = allEnemyPos[otherId];
                // 다른 층의 적(다리 위/아래)끼리는 밀어내지 않음
                if (other.y !== undefined && Math.abs(other.y - groupRef.current.position.y) > LAYER_GATE) continue;
                const ddx = newX - other.x;
                const ddz = newZ - other.z;
                const dist = Math.hypot(ddx, ddz);
                if (dist > 0 && dist < SEPARATION_DIST) {
                    const strength = (SEPARATION_DIST - dist) / SEPARATION_DIST;
                    sepX += (ddx / dist) * strength;
                    sepZ += (ddz / dist) * strength;
                }
            }
            const sepLen = Math.hypot(sepX, sepZ);
            if (sepLen > 1e-4) {
                const step = SEPARATION_SPEED * dt;
                const r = applyMovement(newX, newZ, (sepX / sepLen) * step, (sepZ / sepLen) * step);
                newX = r.x; newZ = r.z;
                if (r.groundY !== null) frameGroundY = r.groundY;
            }
        }

        // ===== 최종 위치 적용 =====
        groupRef.current.position.x = newX;
        groupRef.current.position.z = newZ;

        // Y: navmesh groundAt으로 계단/지형 정확히 따라가기.
        // 이동 검증(applyMovement)이 승인한 지면 높이를 그대로 러프 목표로 사용해
        // 검증 기준면과 Y 보정 기준면을 일치시킨다 (lerp 지연으로 인한 밴드 이탈 방지).
        // 이동이 없던 프레임은 현재 높이 밴드로 조회. null이면 마지막 높이를 유지하되
        // (플레이어 Y로 스냅하면 다른 층에서 지형 속에 파묻힘),
        // off-mesh가 길어지면 가장 가까운 표면에 재스냅해 공중부양/매몰 고착을 복구한다.
        let groundY = frameGroundY;
        if (groundY === null && navGroundAt) {
            groundY = navGroundAt(newX, newZ, groupRef.current.position.y, MAX_STEP, MAX_STEP);
        }
        if (groundY !== null) {
            offMeshTimer.current = 0;
            groupRef.current.position.y += (groundY - groupRef.current.position.y) * Math.min(1, dt * 12);
        } else if (navGroundAt) {
            offMeshTimer.current += dt;
            if (offMeshTimer.current > OFF_MESH_RECOVER_TIME) {
                offMeshTimer.current = 0;
                // 완화된 밴드(±6)로 현재 높이 근처 표면 탐색 — 무제한이면 지하/지붕 층으로 끌려간다
                const recovered = navGroundAt(newX, newZ, groupRef.current.position.y, 6, 6);
                if (recovered !== null) groupRef.current.position.y = recovered;
            }
        }

        if (facingDx !== 0 || facingDz !== 0) {
            groupRef.current.rotation.y = Math.atan2(facingDx, facingDz) + Math.PI;
        }
    });

    const modelUrl = ENEMY_MODEL_BY_TEMPLATE[template];
    if (!modelUrl || defeated) return null;

    return (
        <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
            <Suspense fallback={<EnemyMarker template={template} />}>
                <ModelAvatar
                    url={modelUrl}
                    scale={0.01}
                    state={animState}
                    rotation={[0, Math.PI, 0]}
                />
            </Suspense>
        </group>
    );
}
