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
    const cosMax = Math.cos(THREE.MathUtils.degToRad(maxTiltDeg));

    useEffect(() => {
        ray.layers.set(0); // Environment 레이어만
    }, [ray]);

    /**
     * 샘플러
     * @param x
     * @param z
     * @param fromY   위에서 쏠 시작 높이
     * @param opts    { baseY, maxRise, maxDrop }
     *   - baseY가 있으면 baseY + maxRise 이하, baseY - maxDrop 이상만 바닥 후보로 채택
     *   - 없으면 가장 위의 유효한 바닥을 반환(초기 스냅 시엔 baseY를 주는 걸 권장)
     */
    return (
        x: number,
        z: number,
        fromY: number = 200,
        opts?: {
            baseY?: number;
            maxRise?: number | null;
            maxDrop?: number | null;
        }
    ): number | null => {
        const targets =
            (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
            scene.children;

        ray.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
        ray.near = 0;
        ray.far = 500;

        const hits = ray.intersectObjects(targets, true);
        if (hits.length === 0) return null;

        let maxAllowedY = Infinity;
        let minAllowedY = -Infinity;

        if (opts?.baseY !== undefined) {
            const b = opts.baseY;
            if (opts.maxRise != null) maxAllowedY = b + opts.maxRise;
            if (opts.maxDrop != null) minAllowedY = b - opts.maxDrop;
        }

        // 조건을 만족하는 후보 중 "가장 높은 y"를 선택
        let bestY: number | null = null;

        for (const h of hits) {
            const obj: any = h.object;
            if (!h.face) continue;

            // 슬로프/천장 거르기
            const n = h.face.normal.clone();
            normalMat.getNormalMatrix(obj.matrixWorld);
            n.applyNormalMatrix(normalMat).normalize();

            const upDot = n.dot(UP); // 1=바닥, 0=수직, <0=천장
            if (upDot <= 0) continue; // 천장/하부면 제외
            if (upDot < cosMax) continue; // 너무 가파르면 제외

            const y = h.point.y;
            if (y > maxAllowedY || y < minAllowedY) continue;

            if (bestY == null || y > bestY) bestY = y;
        }

        return bestY;
    };
}