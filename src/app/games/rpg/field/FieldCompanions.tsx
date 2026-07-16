// rpg/field/FieldCompanions.tsx — 비활성 파티원 동행 (리더 궤적 브레드크럼 팔로우)
"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

const CRUMB_STEP = 0.35; // 리더가 이만큼 움직일 때마다 궤적 기록
const MAX_CRUMBS = 96;
const FOLLOW_DIST = [1.7, 3.2]; // 동료 1·2가 리더 뒤에서 유지할 궤적 거리
const TELEPORT_SNAP = 12; // 리더와 이 이상 벌어지면 워프 (패스트트래블/전투 복귀)

type Crumb = { x: number; y: number; z: number };

function lerpAngle(a: number, b: number, t: number) {
    const PI2 = Math.PI * 2;
    let d = (b - a) % PI2;
    if (d > Math.PI) d -= PI2;
    else if (d < -Math.PI) d += PI2;
    return a + d * t;
}

/** 궤적의 최신 지점부터 뒤로 dist 만큼 걸어간 위치 (부족하면 가장 오래된 지점) */
function pointBehind(crumbs: Crumb[], leader: Crumb, dist: number): Crumb {
    let remain = dist;
    let cur = leader;
    for (let i = crumbs.length - 1; i >= 0; i--) {
        const c = crumbs[i];
        const seg = Math.hypot(cur.x - c.x, cur.z - c.z);
        if (seg >= remain) {
            const t = seg < 1e-6 ? 0 : remain / seg;
            return {
                x: cur.x + (c.x - cur.x) * t,
                y: cur.y + (c.y - cur.y) * t,
                z: cur.z + (c.z - cur.z) * t,
            };
        }
        remain -= seg;
        cur = c;
    }
    return crumbs[0] ?? leader;
}

function Companion({
    charId,
    modelUrl,
    followDist,
    crumbsRef,
}: {
    charId: string;
    modelUrl: string;
    followDist: number;
    crumbsRef: { current: Crumb[] };
}) {
    const { scene } = useThree();
    const rootRef = useRef<THREE.Group>(null);
    const [animState, setAnimState] = useState<"idle" | "walk" | "run">("idle");
    const placed = useRef(false);
    const renderY = useRef(0);

    useFrame((_, dt) => {
        const leader = scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        const g = rootRef.current;
        if (!leader || !g) return;

        if (!placed.current) {
            g.position.set(leader.x, leader.y, leader.z);
            renderY.current = leader.y;
            placed.current = true;
            return;
        }

        const target = pointBehind(
            crumbsRef.current,
            { x: leader.x, y: leader.y, z: leader.z },
            followDist
        );
        const dx = target.x - g.position.x;
        const dz = target.z - g.position.z;
        const gap = Math.hypot(dx, dz);

        // 리더가 순간이동(패스트트래블/전투 복귀)하면 그대로 워프
        const leaderGap = Math.hypot(
            leader.x - g.position.x,
            leader.z - g.position.z
        );
        if (leaderGap > TELEPORT_SNAP) {
            g.position.set(leader.x, leader.y, leader.z);
            renderY.current = leader.y;
            if (animState !== "idle") setAnimState("idle");
            return;
        }

        // 간격에 비례한 추적 속도 — 멀수록 뛰고 가까우면 정지
        let next: "idle" | "walk" | "run" = "idle";
        if (gap > 0.18) {
            const speed = gap > 2.2 ? 7 : 4;
            next = gap > 2.2 ? "run" : "walk";
            const step = Math.min(gap, speed * Math.min(dt, 1 / 8));
            g.position.x += (dx / gap) * step;
            g.position.z += (dz / gap) * step;
            const targetYaw = Math.atan2(dx, dz);
            g.rotation.y = lerpAngle(
                g.rotation.y,
                targetYaw,
                THREE.MathUtils.clamp(dt * 10, 0, 1)
            );
        }
        if (next !== animState) setAnimState(next);

        // y는 궤적(리더가 실제 밟은 지면)에서 가져와 러프 — 계단 팝핑 방지
        if (Math.abs(target.y - renderY.current) > 1.5) {
            renderY.current = target.y;
        } else {
            renderY.current +=
                (target.y - renderY.current) * Math.min(1, dt * 10);
        }
        g.position.y = renderY.current;

        // 화자 마커 등에서 쓸 위치 공유
        const store = (scene.userData.__companionPositions ??= {}) as Record<
            string,
            { x: number; y: number; z: number }
        >;
        store[charId] = {
            x: g.position.x,
            y: g.position.y,
            z: g.position.z,
        };
    });

    return (
        <group ref={rootRef}>
            <Suspense fallback={null}>
                <ModelAvatar url={modelUrl} state={animState} scale={0.005} />
            </Suspense>
        </group>
    );
}

export function FieldCompanions() {
    const { scene } = useThree();
    const party = useGame((s) => s.player.party);
    const activeIdx = useGame((s) => s.player.activeCharacter);
    const crumbsRef = useRef<Crumb[]>([]);

    // 브레드크럼 기록 (동료 전체가 공유)
    useFrame(() => {
        const leader = scene.userData.__playerWorldPos as
            | THREE.Vector3
            | undefined;
        if (!leader) return;
        const crumbs = crumbsRef.current;
        const last = crumbs[crumbs.length - 1];
        if (
            !last ||
            Math.hypot(leader.x - last.x, leader.z - last.z) >= CRUMB_STEP
        ) {
            // 순간이동이면 궤적을 리셋해 동료가 옛 경로를 거슬러 가지 않게 한다
            if (last && Math.hypot(leader.x - last.x, leader.z - last.z) > TELEPORT_SNAP) {
                crumbs.length = 0;
            }
            crumbs.push({ x: leader.x, y: leader.y, z: leader.z });
            if (crumbs.length > MAX_CRUMBS) crumbs.shift();
        }
    });

    const companions = party.filter((_, i) => i !== activeIdx);

    return (
        <>
            {companions.map((c, i) => (
                <Companion
                    key={c.id}
                    charId={c.id}
                    modelUrl={c.modelUrl || "/character/BlueSoldier_Female.fbx"}
                    followDist={FOLLOW_DIST[i] ?? 3.2}
                    crumbsRef={crumbsRef}
                />
            ))}
        </>
    );
}
