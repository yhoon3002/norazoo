// rpg/field/FieldPlayerAvatar.tsx
import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

export function FieldPlayerAvatar() {
    const { scene } = useThree();
    const party = useGame((s) => s.player.party);
    const idx = useGame((s) => s.player.activeCharacter);
    const active = party[idx];

    const rootRef = useRef<THREE.Group>(null);

    const [animState, setAnimState] = useState<"idle" | "walk" | "run">("idle");

    // ✅ Shift 키 상태 추적
    const isShiftPressed = useRef(false);
    const speedEMA = useRef(0);
    const lastPos = useRef<THREE.Vector3 | null>(null);

    // ✅ Shift 키 이벤트 리스너
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift") isShiftPressed.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") isShiftPressed.current = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    const lerpAngle = (a: number, b: number, t: number) => {
        const PI2 = Math.PI * 2;
        let d = (b - a) % PI2;
        if (d > Math.PI) d -= PI2;
        else if (d < -Math.PI) d += PI2;
        return a + d * t;
    };

    useFrame((_, dt) => {
        const p = useGame.getState().player.pos;

        if (rootRef.current) {
            rootRef.current.position.set(p.x, p.y, p.z);
        }

        if (!lastPos.current) {
            lastPos.current = new THREE.Vector3(p.x, p.y, p.z);
            return;
        }
        const dx = p.x - lastPos.current.x;
        const dz = p.z - lastPos.current.z;
        const instSpeed = Math.hypot(dx, dz) / Math.max(1e-4, dt);
        speedEMA.current = THREE.MathUtils.lerp(
            speedEMA.current,
            instSpeed,
            0.22
        );
        lastPos.current.set(p.x, p.y, p.z);

        // ✅ Shift 키 기반 애니메이션 전환
        const moving = speedEMA.current > 0.2;
        let nextState: "idle" | "walk" | "run";

        if (!moving) {
            nextState = "idle";
        } else if (isShiftPressed.current) {
            nextState = "run"; // Shift + 이동 = 뛰기
        } else {
            nextState = "walk"; // 이동만 = 걷기
        }

        if (nextState !== animState) setAnimState(nextState);

        let targetYaw: number;
        if (moving && Math.abs(dx) + Math.abs(dz) > 1e-6) {
            targetYaw = Math.atan2(dx, dz);
        } else {
            const fwd: THREE.Vector3 =
                (scene.userData.__camForward as THREE.Vector3) ??
                new THREE.Vector3(0, 0, 1);
            targetYaw = Math.atan2(fwd.x, fwd.z);
        }

        if (rootRef.current) {
            const cur = rootRef.current.rotation.y;
            const damp = THREE.MathUtils.clamp(dt * 12, 0, 1);
            rootRef.current.rotation.y = lerpAngle(cur, targetYaw, damp);
        }
    });

    const url = active?.modelUrl || "/character/BlueSoldier_Female.fbx";

    return (
        <group ref={rootRef}>
            <ModelAvatar
                url={url}
                state={animState}
                rotation={[0, 0, 0]}
                preferredAttack={active?.preferredAttack || "attack"}
                scale={0.005}
            />
        </group>
    );
}