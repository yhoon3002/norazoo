// rpg/environment/InteriorLighting.tsx
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export function InteriorLighting() {
    const { scene, camera } = useThree();
    const ray = useMemo(() => new THREE.Raycaster(), []);
    const ambRef = useRef<THREE.AmbientLight>(null);
    const lampRef = useRef<THREE.PointLight>(null);

    useEffect(() => ray.layers.set(0), [ray]);

    useFrame(() => {
        const p = scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        if (!p) return;

        // 머리 위에서 위쪽으로 쏴서 낮은 천장 감지
        const head = new THREE.Vector3(p.x, p.y + 1.4, p.z);
        ray.set(head, new THREE.Vector3(0, 1, 0));
        ray.far = 2.2; // 2m 안에 천장 있으면 "실내"
        const env =
            (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
            scene.children;
        const inside = ray.intersectObjects(env, true).length > 0;

        // 부드럽게 보간
        const targetAmb = inside ? 0.8 : 0.35;
        const targetLamp = inside ? 1.2 : 0.0;

        if (ambRef.current)
            ambRef.current.intensity +=
                (targetAmb - ambRef.current.intensity) * 0.1;

        if (lampRef.current) {
            lampRef.current.position.copy(camera.position);
            lampRef.current.intensity +=
                (targetLamp - lampRef.current.intensity) * 0.2;
        }
    });

    return (
        <>
            <ambientLight ref={ambRef} intensity={0.35} />
            <pointLight ref={lampRef} distance={6} decay={2} />
        </>
    );
}