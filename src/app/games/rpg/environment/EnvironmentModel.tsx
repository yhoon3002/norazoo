// rpg/environment/EnvironmentModel.tsx
import { forwardRef, useMemo, useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

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

        root.traverse((obj: any) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                obj.userData.__type = "environment";
                obj.layers.disableAll();
                obj.layers.enable(0); // Environment는 레이어 0

                envCount++;
                envMeshes.push(obj);
            }
        });

        const mapBox = new THREE.Box3().setFromObject(root);
        r3fScene.userData.__envBounds = mapBox.clone();

        if (center) {
            const box = new THREE.Box3().setFromObject(root);
            const offset = box.getCenter(new THREE.Vector3());
            root.position.sub(offset);
            (scene as any).userData._mapCenterOffset = offset.clone();
        }

        r3fScene.userData.__environmentMeshes = envMeshes;
    }, [root, center, r3fScene, scene]);

    return (
        <group ref={ref} position={position} rotation={rotation} scale={scale}>
            <primitive object={root} />
        </group>
    );
});

useGLTF.preload("/rpgmap/Environment.glb");