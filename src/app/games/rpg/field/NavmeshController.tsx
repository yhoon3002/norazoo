// rpg/field/NavmeshController.tsx
// Walkable.glb를 로드해서 적 AI가 사용할 groundAt(x,z) 함수를
// scene.userData.__navGroundAt 으로 공유합니다.
// debug={true} 로 쓰면 씬에 녹색 와이어프레임으로 걸을 수 있는 영역이 표시됩니다.
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ensureBoundsTree } from "../environment/bvhRaycast";

const MAX_SLOPE_COS = Math.cos(THREE.MathUtils.degToRad(55));

export function NavmeshController({ debug = false }: { debug?: boolean }) {
    const { scene: gltfScene } = useGLTF("/rpgmap/Walkable.glb");
    const { scene: r3fScene } = useThree();

    const debugGroupRef = useRef<THREE.Group | null>(null);

    // groundAt 쿼리용 재사용 객체 (GC 방지)
    const _ray = useMemo(() => new THREE.Raycaster(), []);
    const _down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
    const _origin = useMemo(() => new THREE.Vector3(), []);
    const _normalMat = useMemo(() => new THREE.Matrix3(), []);
    const _worldNormal = useMemo(() => new THREE.Vector3(), []);
    const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

    useEffect(() => {
        const root = gltfScene.clone(true);

        // EnvironmentModel 과 동일한 좌표계 적용:
        // 1) EnvironmentModel 이 저장한 center offset 사용 (없으면 자체 계산)
        const storedOffset = r3fScene.userData.__envCenterOffset as THREE.Vector3 | undefined;
        const offset = storedOffset
            ? storedOffset.clone()
            : new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
        root.position.sub(offset);

        // 2) EnvironmentModel 과 동일한 rotation [0, PI, 0] → wrapper group 로 적용
        const wrapper = new THREE.Group();
        wrapper.rotation.set(0, Math.PI, 0);
        wrapper.add(root);
        wrapper.updateMatrixWorld(true);

        // BVH 구축 — 삼각형 배열 선형 스캔(호출당 O(전체 삼각형)) 대신 O(log n) 레이캐스트.
        // clone은 geometry를 공유하므로 remount 시에도 1회만 빌드된다.
        let triCount = 0;
        wrapper.traverse((obj) => {
            ensureBoundsTree(obj);
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh && mesh.geometry) {
                const idx = mesh.geometry.getIndex();
                const posAttr = mesh.geometry.getAttribute("position");
                triCount += Math.floor((idx ? idx.count : posAttr?.count ?? 0) / 3);
            }
        });
        console.log(`[NavmeshController] walkable ${triCount}개 삼각형 BVH 준비 완료`);

        // ===== 환경 메시와 좌표 정렬 =====
        // Environment.glb는 이미 원점 센터링된 데이터인 반면 Walkable.glb는 비센터링
        // 프레임으로 익스포트되어 있어(실측), 저장된 center offset만으로는 정렬되지
        // 않는다. 두 GLB의 X/Z 풋프린트는 동일하고 최저 바닥 높이도 공유하므로,
        // 실제 월드 박스의 min 코너를 맞추면 정확히 정렬된다.
        const envMeshList = r3fScene.userData.__environmentMeshes as
            | THREE.Object3D[]
            | undefined;
        if (envMeshList?.length) {
            const envBox = new THREE.Box3();
            for (const m of envMeshList) {
                m.updateWorldMatrix(true, false);
                envBox.expandByObject(m);
            }
            const navBox = new THREE.Box3().setFromObject(wrapper);
            const delta = new THREE.Vector3().subVectors(envBox.min, navBox.min);
            if (delta.length() > 0.25) {
                wrapper.position.add(delta);
                wrapper.updateMatrixWorld(true);
                console.log(
                    `[NavmeshController] 환경 좌표계에 정렬 delta=(${delta.x.toFixed(1)}, ${delta.y.toFixed(1)}, ${delta.z.toFixed(1)})`
                );
            }
        }

        // ===== groundAt 함수 공유 =====
        // Walkable.glb 노드에 음수 스케일이 있어 법선이 뒤집혀 있으므로 절대값으로 판정한다.
        // 이 맵은 walkable 컬럼의 ~31%가 다층 구조(2층/다리/벤치 상판 아래 바닥)라서,
        // refY 없이 최상단 히트를 그대로 쓰면 아래층의 적이 위층으로 순간이동한다.
        // refY가 주어지면 [refY - maxDrop, refY + maxRise] 밴드 안에서 refY에 가장
        // 가까운 표면을, 없으면 최상단 표면(히트는 높은 y 순)을 반환한다.
        const groundAt = (
            x: number,
            z: number,
            refY?: number,
            maxRise: number = 1.5,
            maxDrop: number = 1.5
        ): number | null => {
            _origin.set(x, 300, z);
            _ray.set(_origin, _down);
            _ray.near = 0;
            _ray.far = 600;
            const hits = _ray.intersectObject(wrapper, true);
            let best: number | null = null;
            for (const h of hits) {
                if (!h.face) continue;
                _normalMat.getNormalMatrix(h.object.matrixWorld);
                _worldNormal
                    .copy(h.face.normal)
                    .applyNormalMatrix(_normalMat)
                    .normalize();
                if (Math.abs(_worldNormal.dot(_up)) < MAX_SLOPE_COS) continue; // 너무 가파름
                const y = h.point.y;
                if (refY === undefined) return y;
                // 히트는 y 내림차순 — 밴드 하한을 지나면 이후는 전부 범위 밖
                if (y < refY - maxDrop) break;
                if (y > refY + maxRise) continue;
                if (best === null || Math.abs(y - refY) < Math.abs(best - refY))
                    best = y;
            }
            return best;
        };
        r3fScene.userData.__navGroundAt = groundAt;

        // ===== 가장 가까운 walkable 지점 탐색 함수 공유 =====
        // 적 스폰 위치 자동 스냅용 (나선형으로 탐색)
        // preferY가 있으면 preferY ±band 안의 층만 선택한다. 이 맵은 지붕/상판/지하가
        // 모두 walkable로 잡히는 다층 구조라, 밴드 없이 최상단을 고르면
        // 적이 지붕(플레이어 지면 +23)이나 지하(−25)에 스폰되어 화면에서 안 보인다.
        r3fScene.userData.__navFindWalkable = (
            x: number,
            z: number,
            preferY?: number,
            band: number = 4
        ): { x: number; z: number; y: number } | null => {
            const spiral = (b: number) => {
                const pick = (tx: number, tz: number) =>
                    preferY === undefined
                        ? groundAt(tx, tz)
                        : groundAt(tx, tz, preferY, b, b);
                const y0 = pick(x, z);
                if (y0 !== null) return { x, z, y: y0 };
                for (let r = 0.5; r <= 10; r += 0.5) {
                    const steps = Math.max(8, Math.floor(r * 6));
                    for (let i = 0; i < steps; i++) {
                        const angle = (i / steps) * Math.PI * 2;
                        const tx = x + Math.cos(angle) * r;
                        const tz = z + Math.sin(angle) * r;
                        const ty = pick(tx, tz);
                        if (ty !== null) return { x: tx, z: tz, y: ty };
                    }
                }
                return null;
            };
            // 1차: 요청 밴드. 실패 시 2차: 넓은 밴드(preferY 최근접 표면) —
            // 플레이어가 다른 높이 지대(항구 등)에 있어도 마을 NPC/적 스냅이 깨지지 않게
            return spiral(band) ?? (preferY !== undefined ? spiral(30) : null);
        };

        // ===== 디버그: navmesh 시각화 =====
        let debugMat: THREE.MeshBasicMaterial | null = null;
        if (debug) {
            const group = new THREE.Group();
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                wireframe: true,
                depthTest: false,
                transparent: true,
                opacity: 0.8,
            });
            wrapper.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (!mesh.isMesh || !mesh.geometry) return;
                const dm = new THREE.Mesh(mesh.geometry, mat);
                dm.applyMatrix4(mesh.matrixWorld);
                dm.renderOrder = 999;
                group.add(dm);
            });
            r3fScene.add(group);
            debugGroupRef.current = group;
            debugMat = mat;
        }

        return () => {
            delete r3fScene.userData.__navGroundAt;
            delete r3fScene.userData.__navFindWalkable;
            if (debugGroupRef.current) {
                r3fScene.remove(debugGroupRef.current);
                debugGroupRef.current = null;
            }
            debugMat?.dispose();
        };
    }, [gltfScene, r3fScene, debug, _ray, _down, _origin, _normalMat, _worldNormal, _up]);

    return null;
}

useGLTF.preload("/rpgmap/Walkable.glb");
