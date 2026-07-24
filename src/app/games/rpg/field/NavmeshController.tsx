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
        // Walkable.glb는 단일 메시 457k 삼각형이라 한 번에 빌드하면 메인스레드가
        // ~1.8초 정지한다(초반 렉 실측). 삼각형 중심 XZ 그리드 셀로 인덱스를 분할해
        // 셀별 BVH를 setTimeout 틱 사이에 나눠 빌드하고, __navGroundAt 등록은 전체
        // 완료 후에 한다(소비자들은 undefined 가드로 자연 대기). 셀 지오메트리는
        // 소스 geometry에 캐시해 StrictMode 재마운트 시 즉시 재사용된다.
        let totalTris = 0;
        const srcMeshes: THREE.Mesh[] = [];
        // traverse 중 자식(셀)을 추가하면 새 자식까지 방문되므로 먼저 수집만 한다
        wrapper.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh && mesh.geometry) srcMeshes.push(mesh);
        });
        const cellMeshes: THREE.Mesh[] = [];
        for (const mesh of srcMeshes) {
            const geo = mesh.geometry as THREE.BufferGeometry;
            const idx = geo.getIndex();
            const posAttr = geo.getAttribute("position");
            const triCount = Math.floor((idx ? idx.count : posAttr?.count ?? 0) / 3);
            totalTris += triCount;
            if (triCount <= 60_000) {
                cellMeshes.push(mesh);
                continue;
            }
            let cellGeos = geo.userData.__navCellGeos as
                | THREE.BufferGeometry[]
                | undefined;
            if (!cellGeos) {
                geo.computeBoundingBox();
                const bb = geo.boundingBox!;
                const CELL = 48; // 로컬 단위 — 약 12×14 셀, 셀당 ~2-15k 삼각형
                const nx = Math.max(1, Math.ceil((bb.max.x - bb.min.x) / CELL));
                const nz = Math.max(1, Math.ceil((bb.max.z - bb.min.z) / CELL));
                const pos = posAttr.array as Float32Array;
                const iarr = idx ? (idx.array as Uint16Array | Uint32Array) : null;
                const buckets: number[][] = new Array(nx * nz);
                // 셀별 로컬 바운즈 — 셀 지오메트리가 전체 position 속성을 공유하므로
                // computeBoundingBox(정점 전수 스캔 45.7만×셀 수)를 절대 타면 안 된다.
                // 분할하면서 min/max를 직접 계산해 명시적으로 박아 넣는다.
                const bounds: number[][] = new Array(nx * nz);
                for (let t = 0; t < triCount; t++) {
                    const a = iarr ? iarr[t * 3] : t * 3;
                    const b = iarr ? iarr[t * 3 + 1] : t * 3 + 1;
                    const c = iarr ? iarr[t * 3 + 2] : t * 3 + 2;
                    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
                    const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
                    const cx = pos[c * 3], cy = pos[c * 3 + 1], cz = pos[c * 3 + 2];
                    const mx = (ax + bx + cx) / 3;
                    const mz = (az + bz + cz) / 3;
                    const gx = Math.min(nx - 1, Math.max(0, Math.floor((mx - bb.min.x) / CELL)));
                    const gz = Math.min(nz - 1, Math.max(0, Math.floor((mz - bb.min.z) / CELL)));
                    const key = gx * nz + gz;
                    let bkt = buckets[key];
                    if (!bkt) {
                        buckets[key] = bkt = [];
                        bounds[key] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
                    }
                    bkt.push(a, b, c);
                    const bd = bounds[key];
                    bd[0] = Math.min(bd[0], ax, bx, cx);
                    bd[1] = Math.min(bd[1], ay, by, cy);
                    bd[2] = Math.min(bd[2], az, bz, cz);
                    bd[3] = Math.max(bd[3], ax, bx, cx);
                    bd[4] = Math.max(bd[4], ay, by, cy);
                    bd[5] = Math.max(bd[5], az, bz, cz);
                }
                cellGeos = [];
                for (let k = 0; k < buckets.length; k++) {
                    const tri = buckets[k];
                    if (!tri) continue;
                    const g = new THREE.BufferGeometry();
                    g.setAttribute("position", posAttr);
                    g.setIndex(new THREE.BufferAttribute(new Uint32Array(tri), 1));
                    const bd = bounds[k];
                    g.boundingBox = new THREE.Box3(
                        new THREE.Vector3(bd[0], bd[1], bd[2]),
                        new THREE.Vector3(bd[3], bd[4], bd[5])
                    );
                    g.boundingSphere = new THREE.Sphere();
                    g.boundingBox.getBoundingSphere(g.boundingSphere);
                    cellGeos.push(g);
                }
                geo.userData.__navCellGeos = cellGeos;
            }
            // 원본 메시는 빈 컨테이너로 — 레이캐스트는 동일 변환을 상속한 셀 자식들이 담당
            const empty = new THREE.BufferGeometry();
            empty.boundingBox = new THREE.Box3(); // makeEmpty 상태 — setFromObject 전수 스캔 방지
            empty.boundingSphere = new THREE.Sphere();
            mesh.geometry = empty;
            for (const g of cellGeos) {
                const cm = new THREE.Mesh(g, mesh.material);
                mesh.add(cm);
                cellMeshes.push(cm);
            }
        }
        wrapper.updateMatrixWorld(true);

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

        // ===== 가장 가까운 walkable 지점 탐색 함수 공유 =====
        // 적 스폰 위치 자동 스냅용 (나선형으로 탐색)
        // preferY가 있으면 preferY ±band 안의 층만 선택한다. 이 맵은 지붕/상판/지하가
        // 모두 walkable로 잡히는 다층 구조라, 밴드 없이 최상단을 고르면
        // 적이 지붕(플레이어 지면 +23)이나 지하(−25)에 스폰되어 화면에서 안 보인다.
        const findWalkable = (
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

        // ===== 셀 BVH 분산 빌드 → 완료 시 일괄 등록 =====
        // 틱당 ~35ms 예산으로 빌드해 프레임 사이에 끼워 넣는다. 등록 전까지
        // __navGroundAt/__navFindWalkable은 undefined — 적 스냅·NPC 배치는
        // 기존 가드 로직대로 등록 시점까지 자연 대기한다.
        let cancelled = false;
        let buildIdx = 0;
        const buildStart = performance.now();
        const buildTick = () => {
            if (cancelled) return;
            const t0 = performance.now();
            while (buildIdx < cellMeshes.length && performance.now() - t0 < 35) {
                ensureBoundsTree(cellMeshes[buildIdx++]);
            }
            if (buildIdx < cellMeshes.length) {
                setTimeout(buildTick, 0);
                return;
            }
            r3fScene.userData.__navGroundAt = groundAt;
            r3fScene.userData.__navFindWalkable = findWalkable;
            console.log(
                `[NavmeshController] walkable ${totalTris}개 삼각형 BVH 준비 완료 (셀 ${cellMeshes.length}개 분산 ${Math.round(
                    performance.now() - buildStart
                )}ms)`
            );
        };
        setTimeout(buildTick, 0);

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
            cancelled = true;
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
