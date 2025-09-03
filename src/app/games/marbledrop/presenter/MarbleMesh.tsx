import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Marble } from "../types/MarbleDropTypes";

interface MarblesMeshProps {
    marbles: Marble[];
}

export function MarbleMesh({ marbles }: MarblesMeshProps) {
    const ref = useRef<THREE.InstancedMesh>(null!);
    const tempObj = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (!ref.current) return;
        const colors = new Float32Array(marbles.length * 3);
        for (let i = 0; i < marbles.length; i++) {
            const m = marbles[i];
            // Winning: light-cyan glass; Blank: warm gray
            const c = m.isWinning
                ? new THREE.Color(0.65, 0.9, 1.0)
                : new THREE.Color(0.8, 0.78, 0.75);
            colors[i * 3 + 0] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        (ref.current as any).instanceColor = colorAttr;
    }, [marbles.length]);

    useFrame(() => {
        if (!ref.current) return;
        for (let i = 0; i < marbles.length; i++) {
            const m = marbles[i];
            tempObj.position.copy(m.pos);
            tempObj.rotation.set(0, 0, 0);
            tempObj.scale.setScalar(1);
            tempObj.updateMatrix();
            ref.current.setMatrixAt(i, tempObj.matrix);
        }
        ref.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={ref} args={[undefined, undefined, marbles.length]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshPhysicalMaterial
                transparent
                roughness={0}
                metalness={0}
                transmission={1}
                thickness={0.2}
                ior={1.5}
                reflectivity={1}
                envMapIntensity={1.5}
                vertexColors
            />
        </instancedMesh>
    );
}
