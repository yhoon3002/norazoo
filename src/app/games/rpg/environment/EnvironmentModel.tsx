// rpg/environment/EnvironmentModel.tsx
import { forwardRef, useMemo, useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ensureBoundsTree } from "./bvhRaycast";
import { useGame } from "../presenter/useGameStore";

// 면적 가중 "윗면(|ny|>0.6) 비율" — 메시 형태 분류용 (십자 스프라이트 ≈ 0, 수면 ≈ 1)
function upFraction(mesh: THREE.Mesh): number {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const idx = geo.index;
    if (!pos || !idx) return 1;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const n = new THREE.Vector3();
    let upArea = 0;
    let totalArea = 0;
    const triCount = idx.count / 3;
    const step = Math.max(1, Math.floor(triCount / 800));
    for (let t = 0; t < triCount; t += step) {
        a.fromBufferAttribute(pos, idx.getX(t * 3));
        b.fromBufferAttribute(pos, idx.getX(t * 3 + 1));
        c.fromBufferAttribute(pos, idx.getX(t * 3 + 2));
        ab.subVectors(b, a);
        ac.subVectors(c, a);
        n.crossVectors(ab, ac);
        const area = n.length();
        if (area < 1e-12) continue;
        totalArea += area;
        if (Math.abs(n.y / area) > 0.6) upArea += area;
    }
    return totalArea > 0 ? upArea / totalArea : 1;
}

function matOf(mesh: THREE.Mesh): THREE.Material | undefined {
    const raw = mesh.material as THREE.Material | THREE.Material[];
    return Array.isArray(raw) ? raw[0] : raw;
}

// 풀/꽃/덩굴 같은 "십자 스프라이트" 메시 판정: 알파마스크 재질 + 수직면 전용.
// 이런 장식은 이동/카메라 충돌 레이에서 제외한다 — 키 큰 풀숲에 갇히는 문제 방지.
// (잎 블록·울타리는 윗면이 있어 제외되지 않고, 유리는 BLEND 재질이라 계속 충돌)
function isFoliageSprite(mesh: THREE.Mesh): boolean {
    const mat = matOf(mesh);
    if (!mat || !(mat as THREE.Material & { alphaTest?: number }).alphaTest) {
        return false;
    }
    return upFraction(mesh) < 0.02;
}

// 장식 블록 레이어(풀·꽃·농작물·수련잎 등 비고체 스프라이트) 판정.
// 이 맵은 청크 단위로 장식 블록이 한 메시로 병합돼 있어 upFraction 휴리스틱이
// 깨진다 — 수련잎·레일 같은 윗면이 몇 개 섞인 청크(실측 57/152)는 upFraction≥0.02가
// 되어 그 청크의 모든 풀 스프라이트가 벽이 됐다(풀은 윗면이 없어 shortVegetationAt
// 구제도 불가). 익스포터가 부여한 레이어 정체성(재질 "Material 1 - Mask" /
// 메시명 "... Layer 1")으로 직접 판정한다. 잎 블록(산울타리)은 Layer 2라 계속 차단.
function isDecorationLayer(mesh: THREE.Mesh): boolean {
    const mat = matOf(mesh);
    return mat?.name === "Material 1 - Mask" || /Layer 1$/.test(mesh.name);
}

// 수면 판정: 반투명(BLEND) 재질 + 윗면 위주 지오메트리.
// 수면은 지면으로 밟을 수 없어야 하므로 __water로 태그해 이동 게이트가 차단한다.
// (유리창은 같은 BLEND라도 수직면이라 여기 안 걸리고 벽으로 유지)
function isWaterSurface(mesh: THREE.Mesh): boolean {
    const mat = matOf(mesh);
    if (!mat || !mat.transparent) return false;
    return upFraction(mesh) >= 0.5;
}

export const EnvironmentModel = forwardRef<
    THREE.Group,
    {
        url?: string;
        center?: boolean;
        scale?: number | [number, number, number];
        rotation?: [number, number, number];
        position?: [number, number, number];
    }
>(function EnvironmentModel(
    {
        url = "/rpgmap/Environment.glb",
        center = true,
        scale = 1,
        rotation = [0, Math.PI, 0],
        position = [0, 0, 0],
    },
    ref
) {
    const { scene } = useGLTF(url);
    const root = useMemo(() => scene.clone(true), [scene]);
    const { scene: r3fScene } = useThree();

    useLayoutEffect(() => {
        let envCount = 0;
        const envMeshes: THREE.Object3D[] = [];
        const bvhStart = performance.now();

        let decoCount = 0;
        let waterCount = 0;
        root.traverse((obj: any) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                obj.userData.__type = "environment";
                obj.layers.disableAll();
                obj.layers.enable(0); // Environment는 레이어 0

                // 풀숲 스프라이트/장식 블록 레이어는 렌더링만 하고 충돌 대상에서 제외
                if (isDecorationLayer(obj) || isFoliageSprite(obj)) {
                    decoCount++;
                    return;
                }

                // 수면: 지면/충돌 대상엔 남기되(카메라·레이 일관성) 이동 게이트가
                // "최상단 표면이 물이면 진입 금지"로 활용하도록 태그
                if (isWaterSurface(obj)) {
                    obj.userData.__water = true;
                    waterCount++;
                }

                envCount++;
                envMeshes.push(obj);
            }
        });
        console.log(`[EnvironmentModel] 풀숲 스프라이트 ${decoCount}개 충돌 제외, 수면 ${waterCount}개 태그`);

        const mapBox = new THREE.Box3().setFromObject(root);
        r3fScene.userData.__envBounds = mapBox.clone();

        if (center) {
            const box = new THREE.Box3().setFromObject(root);
            const offset = box.getCenter(new THREE.Vector3());
            root.position.sub(offset);
            (scene as any).userData._mapCenterOffset = offset.clone();
            // NavmeshController가 같은 좌표계를 쓸 수 있도록 r3fScene에도 저장
            r3fScene.userData.__envCenterOffset = offset.clone();
        }

        r3fScene.userData.__environmentMeshes = envMeshes;

        // 런타임 좌표계 진단 — 센터링 결과의 실제 월드 박스
        root.updateWorldMatrix(true, true);
        const wb = new THREE.Box3().setFromObject(root);
        console.log(
            `[EnvironmentModel] world box X:[${wb.min.x.toFixed(1)}, ${wb.max.x.toFixed(1)}] Y:[${wb.min.y.toFixed(1)}, ${wb.max.y.toFixed(1)}] Z:[${wb.min.z.toFixed(1)}, ${wb.max.z.toFixed(1)}]`
        );

        // ===== BVH 빌드: 스폰 근접(60m)만 동기, 나머지는 프레임 사이 분산 =====
        // 348개 일괄 빌드가 메인스레드를 ~1.2초 정지시키던 것(초반 렉 실측)을 분산.
        // 플레이어·카메라 레이는 전부 4m 미만 단거리라, 미빌드 원거리 메시는
        // 바운딩박스 선별에서 걸러져 느린 폴백 경로를 타지 않는다.
        const p = useGame.getState().player.pos;
        const _c = new THREE.Vector3();
        const entries = (envMeshes as THREE.Mesh[])
            .map((mesh) => {
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                mesh.geometry.boundingBox!.getCenter(_c).applyMatrix4(mesh.matrixWorld);
                return { mesh, d: Math.hypot(_c.x - p.x, _c.z - p.z) };
            })
            .sort((a, b) => a.d - b.d);
        let i = 0;
        while (i < entries.length && entries[i].d < 60) ensureBoundsTree(entries[i++].mesh);
        const nearMs = Math.round(performance.now() - bvhStart);
        let cancelled = false;
        const buildTick = () => {
            if (cancelled) return;
            const t0 = performance.now();
            while (i < entries.length && performance.now() - t0 < 30) {
                ensureBoundsTree(entries[i++].mesh);
            }
            if (i < entries.length) {
                setTimeout(buildTick, 0);
                return;
            }
            console.log(
                `[EnvironmentModel] ${envCount}개 메시 BVH 준비 완료 (근접 동기 ${nearMs}ms, 전체 분산 ${Math.round(
                    performance.now() - bvhStart
                )}ms)`
            );
        };
        setTimeout(buildTick, 0);
        return () => {
            cancelled = true;
        };
    }, [root, center, r3fScene, scene]);

    return (
        <group ref={ref} position={position} rotation={rotation} scale={scale}>
            <primitive object={root} />
        </group>
    );
});

useGLTF.preload("/rpgmap/Environment.glb");