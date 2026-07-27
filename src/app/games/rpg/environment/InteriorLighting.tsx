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

        // SP0 Task 6 — 던전 조명 프로파일이 실내/실외 판정을 덮어쓴다(DungeonController가
        // scene.userData.__lightOverride를 진입/이탈 시점에만 설정·삭제)
        const ov = scene.userData.__lightOverride as
            | { ambient: number; lamp: number }
            | undefined;
        const targetAmb2 = ov ? ov.ambient : targetAmb;
        const targetLamp2 = ov ? ov.lamp : targetLamp;

        if (ambRef.current)
            ambRef.current.intensity +=
                (targetAmb2 - ambRef.current.intensity) * 0.1;

        if (lampRef.current) {
            lampRef.current.position.copy(camera.position);
            lampRef.current.intensity +=
                (targetLamp2 - lampRef.current.intensity) * 0.2;
        }
    });

    return (
        <>
            <ambientLight ref={ambRef} intensity={0.35} />
            <pointLight ref={lampRef} distance={6} decay={2} />
        </>
    );
}
