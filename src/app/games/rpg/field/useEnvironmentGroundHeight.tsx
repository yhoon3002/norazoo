// rpg/field/useEnvironmentGroundHeight.tsx
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const MAX_SLOPE_DEG = 75;

export function useEnvironmentGroundHeight(maxTiltDeg: number = MAX_SLOPE_DEG) {
    const { scene } = useThree();
    const ray = useMemo(() => new THREE.Raycaster(), []);
    const normalMat = useMemo(() => new THREE.Matrix3(), []);
    const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    // 호출마다 new THREE.Vector3() 방지 — 재사용 가능한 인스턴스
    const _origin = useMemo(() => new THREE.Vector3(), []);
    const _dir = useMemo(() => new THREE.Vector3(0, -1, 0), []);
    const cosMax = Math.cos(THREE.MathUtils.degToRad(maxTiltDeg));

    useEffect(() => {
        ray.layers.set(0); // Environment 레이어만
    }, [ray]);

    return (
        x: number,
        z: number,
        fromY: number = 200,
        opts?: {
            baseY?: number;
            maxRise?: number | null;
            maxDrop?: number | null;
            /** 후보 중 "가장 높은 y" 대신 baseY에 가장 가까운 층을 선택 (텔레포트 착지용) */
            preferClosest?: boolean;
        }
    ): number | null => {
        const targets =
            (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
            scene.children;

        _origin.set(x, fromY, z);
        // _dir는 항상 (0,-1,0)이므로 재할당 불필요
        ray.set(_origin, _dir);
        ray.near = 0;
        ray.far = 500;

        // __environmentMeshes는 leaf mesh 배열 → recursive=false 사용
        const hits = ray.intersectObjects(targets, false);
        if (hits.length === 0) return null;

        let maxAllowedY = Infinity;
        let minAllowedY = -Infinity;

        if (opts?.baseY !== undefined) {
            const b = opts.baseY;
            if (opts.maxRise != null) maxAllowedY = b + opts.maxRise;
            if (opts.maxDrop != null) minAllowedY = b - opts.maxDrop;
        }

        // 조건을 만족하는 후보 중 "가장 높은 y"를 선택.
        // 알파마스크(잎/식생) 상면은 1순위 지면이 아니다 — 긴 풀 위가 "지면"으로
        // 잡히면 풀 진입이 상승 한계에 걸려 이동이 취소된다. 진짜 지면은 그 아래
        // 흙/돌 블록. 단, 잎 덤불이 놓인 컬럼은 익스포터가 그 아래 지면 윗면을
        // 컬링해서 불투명 지면이 아예 없다(실측: 스폰 우측 덤불 컬럼) — 그 경우에만
        // 잎 상면을 폴백 지면으로 사용해 덤불 위를 밟고 지나가게 한다.
        let bestY: number | null = null;
        let bestMaskY: number | null = null;

        for (const h of hits) {
            const obj: any = h.object;
            if (!h.face) continue;

            const rawMat = obj.material;
            const m = Array.isArray(rawMat) ? rawMat[0] : rawMat;
            const isMask = !!m && (m.alphaTest ?? 0) > 0;

            // 슬로프/천장 거르기
            const n = h.face.normal.clone();
            normalMat.getNormalMatrix(obj.matrixWorld);
            n.applyNormalMatrix(normalMat).normalize();

            const upDot = n.dot(UP); // 1=바닥, 0=수직, <0=천장
            if (upDot <= 0) continue; // 천장/하부면 제외
            if (upDot < cosMax) continue; // 너무 가파르면 제외

            const y = h.point.y;
            if (y > maxAllowedY || y < minAllowedY) continue;

            const better = (cur: number | null) => {
                if (cur == null) return true;
                if (opts?.preferClosest && opts.baseY !== undefined) {
                    return Math.abs(y - opts.baseY) < Math.abs(cur - opts.baseY);
                }
                return y > cur;
            };
            if (isMask) {
                if (better(bestMaskY)) bestMaskY = y;
            } else if (better(bestY)) {
                bestY = y;
            }
        }

        return bestY ?? bestMaskY;
    };
}
