// rpg/hooks/useRuntimeNavMesh.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

type Options = {
    url: string;
    maxSlopeDeg?: number;
    debug?: boolean;
    allow?: (nodeName: string, matName: string) => boolean;
};

type Triangle = {
    a: THREE.Vector3;
    b: THREE.Vector3;
    c: THREE.Vector3;
    normal: THREE.Vector3;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};

const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : "");
const materialNameOf = (mat: any): string => {
    if (!mat) return "";
    if (Array.isArray(mat)) return mat.map((m) => m?.name ?? "").join(" ");
    return mat?.name ?? "";
};

export function useRuntimeNavMesh(opts: Options) {
    const { url, maxSlopeDeg = 50, debug = false, allow } = opts;
    const { scene } = useGLTF(url);
    const [hasNavmesh, setHasNavmesh] = useState(false);
    const trisRef = useRef<Triangle[]>([]);
    const debugMeshRef = useRef<THREE.LineSegments | null>(null);

    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const degToRad = (d: number) => (d * Math.PI) / 180;

    useEffect(() => {
        const root = scene.clone(true);
        const acc: Triangle[] = [];
        root.updateMatrixWorld(true);

        const addTriangle = (
            a: THREE.Vector3,
            b: THREE.Vector3,
            c: THREE.Vector3
        ) => {
            const ab = new THREE.Vector3().subVectors(b, a);
            const ac = new THREE.Vector3().subVectors(c, a);
            const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
            const slope = Math.acos(Math.min(1, Math.max(-1, normal.dot(up))));
            if (slope > degToRad(maxSlopeDeg)) return;
            const tri: Triangle = {
                a: a.clone(),
                b: b.clone(),
                c: c.clone(),
                normal: normal.clone(),
                minX: Math.min(a.x, b.x, c.x),
                maxX: Math.max(a.x, b.x, c.x),
                minZ: Math.min(a.z, b.z, c.z),
                maxZ: Math.max(a.z, b.z, c.z),
            };
            acc.push(tri);
        };

        root.traverse((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;

            const nodeName = lower(mesh.name ?? "");
            const matName = lower(materialNameOf((mesh as any).material));
            if (allow && !allow(nodeName, matName)) return;

            const geo = mesh.geometry as THREE.BufferGeometry;
            if (!geo) return;
            const posAttr = geo.getAttribute(
                "position"
            ) as THREE.BufferAttribute | null;
            if (!posAttr) return;

            const indexAttr = geo.getIndex();
            const m = mesh.matrixWorld;
            const vA = new THREE.Vector3();
            const vB = new THREE.Vector3();
            const vC = new THREE.Vector3();

            if (indexAttr) {
                const arr = indexAttr.array as ArrayLike<number>;
                for (let i = 0; i < arr.length; i += 3) {
                    const i0 = arr[i] * 3;
                    const i1 = arr[i + 1] * 3;
                    const i2 = arr[i + 2] * 3;
                    vA.set(
                        posAttr.array[i0],
                        posAttr.array[i0 + 1],
                        posAttr.array[i0 + 2]
                    ).applyMatrix4(m);
                    vB.set(
                        posAttr.array[i1],
                        posAttr.array[i1 + 1],
                        posAttr.array[i1 + 2]
                    ).applyMatrix4(m);
                    vC.set(
                        posAttr.array[i2],
                        posAttr.array[i2 + 1],
                        posAttr.array[i2 + 2]
                    ).applyMatrix4(m);
                    addTriangle(vA, vB, vC);
                }
            } else {
                for (let i = 0; i < posAttr.count; i += 3) {
                    const i0 = i * 3;
                    const i1 = i0 + 3;
                    const i2 = i1 + 3;
                    vA.set(
                        posAttr.array[i0],
                        posAttr.array[i0 + 1],
                        posAttr.array[i0 + 2]
                    ).applyMatrix4(m);
                    vB.set(
                        posAttr.array[i1],
                        posAttr.array[i1 + 1],
                        posAttr.array[i1 + 2]
                    ).applyMatrix4(m);
                    vC.set(
                        posAttr.array[i2],
                        posAttr.array[i2 + 1],
                        posAttr.array[i2 + 2]
                    ).applyMatrix4(m);
                    addTriangle(vA, vB, vC);
                }
            }
        });

        trisRef.current = acc;
        setHasNavmesh(acc.length > 0);

        if (debug) {
            const g = new THREE.BufferGeometry();
            const lineVerts: number[] = [];
            acc.forEach((t) => {
                lineVerts.push(
                    t.a.x,
                    t.a.y,
                    t.a.z,
                    t.b.x,
                    t.b.y,
                    t.b.z,
                    t.b.x,
                    t.b.y,
                    t.b.z,
                    t.c.x,
                    t.c.y,
                    t.c.z,
                    t.c.x,
                    t.c.y,
                    t.c.z,
                    t.a.x,
                    t.a.y,
                    t.a.z
                );
            });
            g.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(lineVerts, 3)
            );
            const ls = new THREE.LineSegments(
                g,
                new THREE.LineBasicMaterial({ color: 0x00ff88 })
            );
            debugMeshRef.current = ls;
        } else {
            debugMeshRef.current = null;
        }
    }, [scene, allow, maxSlopeDeg, debug, up]);

    const ray = useMemo(() => new THREE.Ray(), []);
    const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
    const tmp = useMemo(() => new THREE.Vector3(), []);
    const triA = useMemo(() => new THREE.Vector3(), []);
    const triB = useMemo(() => new THREE.Vector3(), []);
    const triC = useMemo(() => new THREE.Vector3(), []);

    const intersectDown = (x: number, z: number, fromY: number) => {
        ray.set(tmp.set(x, fromY, z), down);
        let closestY = -Infinity;
        let hitY: number | null = null;

        const tris = trisRef.current;
        for (let i = 0; i < tris.length; i++) {
            const t = tris[i];
            if (
                x < t.minX - 0.5 ||
                x > t.maxX + 0.5 ||
                z < t.minZ - 0.5 ||
                z > t.maxZ + 0.5
            )
                continue;
            triA.copy(t.a);
            triB.copy(t.b);
            triC.copy(t.c);
            const p = ray.intersectTriangle(triA, triB, triC, true, tmp);
            if (!p) continue;
            if (p.y > closestY) {
                closestY = p.y;
                hitY = p.y;
            }
        }
        return hitY;
    };

    const groundAt = (x: number, z: number, fromY = 200): number | null => {
        return intersectDown(x, z, fromY);
    };

    const clampStep = (
        from: THREE.Vector3,
        to: THREE.Vector3,
        radius = 0.55
    ) => {
        const fromY = groundAt(from.x, from.z) ?? from.y;
        const toY = groundAt(to.x, to.z);
        if (toY == null) return new THREE.Vector3(from.x, fromY, from.z);
        const maxStep = 2.0;
        if (Math.abs(toY - fromY) > maxStep)
            return new THREE.Vector3(from.x, fromY, from.z);
        return new THREE.Vector3(to.x, toY, to.z);
    };

    return {
        clampStep,
        groundAt,
        debugMesh: debugMeshRef.current,
        hasNavmesh,
    };
}
