// rpg/environment/InteriorLighting.tsx
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const THROTTLE_FRAMES = 20;

export function InteriorLighting() {
    const { scene, camera } = useThree();
    const ray = useMemo(() => new THREE.Raycaster(), []);
    const ambRef = useRef<THREE.AmbientLight>(null);
    const lampRef = useRef<THREE.PointLight>(null);
    const frameRef = useRef(0);
    const isInsideRef = useRef(false);

    // 매 프레임 new THREE.Vector3() 방지 — 한 번만 생성
    const _head = useMemo(() => new THREE.Vector3(), []);
    const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

    useEffect(() => ray.layers.set(0), [ray]);

    useFrame(() => {
        const p = scene.userData.__playerWorldPos as THREE.Vector3 | undefined;
        if (!p) return;

        frameRef.current++;

        // 레이캐스팅은 N프레임에 1번만
        if (frameRef.current % THROTTLE_FRAMES === 0) {
            _head.set(p.x, p.y + 1.4, p.z);
            ray.set(_head, _up);
            ray.far = 2.2;

            const env =
                (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
                scene.children;
            // __environmentMeshes는 leaf mesh 배열 → recursive=false 사용
            isInsideRef.current = ray.intersectObjects(env, false).length > 0;
        }

        // 보간은 매 프레임
        const targetAmb = isInsideRef.current ? 0.8 : 0.35;
        const targetLamp = isInsideRef.current ? 1.2 : 0.0;

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
