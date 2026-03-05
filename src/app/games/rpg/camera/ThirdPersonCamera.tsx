// rpg/camera/ThirdPersonCamera.tsx
import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";

export function ThirdPersonCamera({
    dist = 3.3,
    height = 1.6,
    shoulder = 0.55,
    lookAhead = 2.2,
    camRadius = 0.28,
    posLerp = 0.16,
    castEvery = 2,
    mouseSens = 0.0025,
}: Partial<{
    dist: number;
    height: number;
    shoulder: number;
    lookAhead: number;
    camRadius: number;
    posLerp: number;
    castEvery: number;
    mouseSens: number;
}>) {
    const { camera, scene, gl } = useThree();
    const ray = useMemo(() => new THREE.Raycaster(), []);
    const U = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const V = useMemo(
        () => ({
            p: new THREE.Vector3(),
            f: new THREE.Vector3(0, 0, 1),
            r: new THREE.Vector3(),
            desired: new THREE.Vector3(),
            dir: new THREE.Vector3(),
            tmp: new THREE.Vector3(),
            // 매 프레임 .clone() 방지용 스크래치 버퍼
            scratch: new THREE.Vector3(),
            camPos: new THREE.Vector3(),
            lookAt: new THREE.Vector3(),
        }),
        []
    );
    const envTargets = useRef<THREE.Object3D[]>([]);
    const yaw = useRef(0);
    const locked = useRef(false);
    const frame = useRef(0);
    const lastAllowed = useRef<number | null>(null);

    // Pointer lock 세팅
    useEffect(() => {
        envTargets.current =
            (scene.userData.__environmentMeshes as THREE.Object3D[]) ??
            scene.children;
        ray.layers.set(0);

        const el = gl.domElement as HTMLCanvasElement;
        const tryLock = () => {
            const s = useGame.getState();
            if (
                s.combat.phase !== "idle" ||
                s.ui.pauseOpen ||
                s.ui.inventoryOpen
            )
                return;
            el.requestPointerLock?.();
        };
        const onLockChange = () => {
            locked.current = document.pointerLockElement === el;
            el.style.cursor = locked.current ? "none" : "";
        };
        const onMove = (e: MouseEvent) => {
            if (!locked.current) return;
            yaw.current -= e.movementX * mouseSens;
        };

        el.addEventListener("click", tryLock);
        document.addEventListener("pointerlockchange", onLockChange);
        window.addEventListener("mousemove", onMove);

        return () => {
            el.removeEventListener("click", tryLock);
            document.removeEventListener("pointerlockchange", onLockChange);
            window.removeEventListener("mousemove", onMove);
        };
    }, [gl, scene, mouseSens, ray]);

    useFrame(() => {
        frame.current++;

        const upos: THREE.Vector3 =
            (scene.userData.__playerWorldPos as THREE.Vector3) ||
            V.scratch.set(
                useGame.getState().player.pos.x,
                useGame.getState().player.pos.y,
                useGame.getState().player.pos.z
            );

        // yaw → 전/우 벡터
        V.f.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
        V.r.crossVectors(U, V.f).negate().normalize();

        // 기준점(머리 부근)
        V.p.set(upos.x, upos.y + 0.9, upos.z);

        // 원하는 카메라 위치
        V.desired
            .copy(V.p)
            .addScaledVector(V.f, -dist)
            .addScaledVector(U, height)
            .addScaledVector(V.r, shoulder);
        const baseDist = V.p.distanceTo(V.desired);
        V.dir.copy(V.desired).sub(V.p).normalize();

        // 충돌-단축 캐스팅(중앙+4 오프셋) — scratch로 .clone() 제거
        let allowed = lastAllowed.current ?? baseDist;
        if (frame.current % castEvery === 0) {
            let min = Infinity;
            const env = envTargets.current;
            const filter = (h: THREE.Intersection) => {
                if (!h.face) return false;
                for (let o: any = h.object; o; o = o.parent)
                    if (o.userData?.__ui || o.userData?.__player) return false;
                return true;
            };
            const test = (start: THREE.Vector3) => {
                ray.set(start, V.dir);
                ray.far = baseDist + camRadius;
                const hit = ray.intersectObjects(env, true).filter(filter)[0];
                if (hit) min = Math.min(min, hit.distance);
            };
            test(V.p);
            V.tmp.copy(V.r).multiplyScalar(camRadius);
            test(V.scratch.copy(V.p).add(V.tmp));
            V.tmp.copy(V.r).multiplyScalar(-camRadius);
            test(V.scratch.copy(V.p).add(V.tmp));
            V.tmp.copy(V.f).cross(U).normalize().multiplyScalar(camRadius);
            test(V.scratch.copy(V.p).add(V.tmp));
            V.tmp.copy(V.f).cross(U).normalize().multiplyScalar(-camRadius);
            test(V.scratch.copy(V.p).add(V.tmp));

            allowed =
                min !== Infinity
                    ? Math.max(0.6, min - camRadius * 0.9)
                    : 0.92 * allowed + 0.08 * baseDist;
            lastAllowed.current = allowed;
        }

        // 위치/시선 — camPos·lookAt도 스크래치 재사용
        V.camPos.copy(V.p).addScaledVector(V.dir, Math.min(allowed, baseDist));
        camera.position.lerp(V.camPos, posLerp);
        V.lookAt.copy(V.p).addScaledVector(V.f, lookAhead);
        camera.lookAt(V.lookAt);

        // 이동용 전/우向 벡터 공유
        (scene.userData.__camForward ??= new THREE.Vector3()).copy(V.f);
        (scene.userData.__camRight ??= new THREE.Vector3()).copy(V.r);
    });

    return null;
}