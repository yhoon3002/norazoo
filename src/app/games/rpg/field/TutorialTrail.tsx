// rpg/field/TutorialTrail.tsx — 튜토리얼 길잡이 마커
// 검증된 도보 경로 위에 빛나는 다이아 마커를 6m 간격으로 띄워
// "어디로 가야 하는지"를 길 자체에 표시한다. 요리사를 만나면 사라진다.
"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../presenter/useGameStore";
import { TRAIL_BY_STAGE } from "../data/storyData";

const MARKER_COLOR = "#7dd3fc"; // 목표 빛기둥과 같은 색 — 같은 안내 체계로 읽히게
const FLOAT_HEIGHT = 0.8;
const MARKER_SPACING = 6; // 곡선 위 마커 간격(m)

// 도보 검증된 웨이포인트는 계단식(x이동→z이동)이라 그대로 마커를 놓으면
// 지그재그로 보인다. centripetal Catmull-Rom으로 부드럽게 이은 뒤 등간격
// 샘플링한다 — centripetal은 컨트롤 포인트에서 크게 벗어나지 않아 길 폭(3~4m)
// 안에 머물고, y는 어차피 navmesh로 재보정된다.
function smoothTrail(
    points: Array<[number, number, number]>
): THREE.Vector3[] {
    const pts = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    if (pts.length < 3) return pts;
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const n = Math.max(2, Math.round(curve.getLength() / MARKER_SPACING));
    return curve.getSpacedPoints(n);
}

export function TutorialTrail() {
    const stage = useGame((s) => s.story.stage);
    const groupRef = useRef<THREE.Group>(null);
    // 마커 세트(스테이지)별로 1회 스냅 — 세트가 바뀌면 다시
    const snappedFor = useRef<unknown>(null);

    useFrame((state) => {
        const group = groupRef.current;
        if (!group) return;
        const cur = TRAIL_BY_STAGE[useGame.getState().story.stage];
        const snapped = { current: snappedFor.current === cur };

        // 지면 y 재보정 (1회) — 데이터 y는 오프라인 근사값이라 navmesh로 다듬는다
        if (!snapped.current) {
            const navGroundAt = state.scene.userData.__navGroundAt as
                | ((x: number, z: number, refY?: number, maxRise?: number, maxDrop?: number) => number | null)
                | undefined;
            if (navGroundAt) {
                for (const m of group.children) {
                    const g = navGroundAt(m.position.x, m.position.z, m.userData.baseY, 3, 3);
                    m.userData.groundY = g ?? m.userData.baseY;
                }
                snappedFor.current = cur;
            }
        }

        // 부유 + 회전 + 은은한 펄스
        const t = state.clock.elapsedTime;
        group.children.forEach((m, i) => {
            m.position.y =
                (m.userData.groundY ?? m.userData.baseY) +
                FLOAT_HEIGHT +
                Math.sin(t * 2 + i * 0.9) * 0.12;
            m.rotation.y = t * 1.4;
            const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = 0.75 + Math.sin(t * 2.4 + i * 0.9) * 0.22;
        });
    });

    const raw = TRAIL_BY_STAGE[stage];
    const markers = useMemo(() => (raw ? smoothTrail(raw) : null), [raw]);
    if (!markers) return null;

    return (
        <group ref={groupRef} key={stage === "tutorial_merchant" ? "prologue" : stage}>
            {markers.map((p, i) => (
                <mesh
                    key={i}
                    position={[p.x, p.y + FLOAT_HEIGHT, p.z]}
                    userData={{ baseY: p.y }}
                >
                    <octahedronGeometry args={[0.34]} />
                    <meshBasicMaterial
                        color={MARKER_COLOR}
                        transparent
                        opacity={0.9}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
}
