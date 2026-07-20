// rpg/field/FieldPlayerAvatar.tsx
import { forwardRef, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { ModelAvatar } from "../actors/ModelAvatar";

export const FieldPlayerAvatar = forwardRef<THREE.Group>(
    function FieldPlayerAvatar(_, ref) {
        const { scene } = useThree();
        const party = useGame((s) => s.player.party);
        const idx = useGame((s) => s.player.activeCharacter);
        const active = party[idx];

        const rootRef = useRef<THREE.Group>(null);
        const [animState, setAnimState] = useState<"idle" | "walk" | "run">("idle");
        const isShiftPressed = useRef(false);
        const speedEMA = useRef(0);
        const lastPos = useRef<THREE.Vector3 | null>(null);

        useEffect(() => {
            const down = (e: KeyboardEvent) => {
                if (e.key === "Shift") isShiftPressed.current = true;
            };
            const up = (e: KeyboardEvent) => {
                if (e.key === "Shift") isShiftPressed.current = false;
            };
            window.addEventListener("keydown", down);
            window.addEventListener("keyup", up);
            return () => {
                window.removeEventListener("keydown", down);
                window.removeEventListener("keyup", up);
            };
        }, []);

        const lerpAngle = (a: number, b: number, t: number) => {
            const PI2 = Math.PI * 2;
            let d = (b - a) % PI2;
            if (d > Math.PI) d -= PI2;
            else if (d < -Math.PI) d += PI2;
            return a + d * t;
        };

        // 위치 설정은 FieldPlayer.useFrame에서 처리 — 여기서는 애니메이션/회전만
        useFrame((_, dt) => {
            const worldPos = scene.userData.__playerWorldPos as THREE.Vector3 | null;
            const store = useGame.getState().player.pos;
            const px = worldPos?.x ?? store.x;
            const py = worldPos?.y ?? store.y;
            const pz = worldPos?.z ?? store.z;

            if (!lastPos.current) {
                lastPos.current = new THREE.Vector3(px, py, pz);
                return;
            }
            const dx = px - lastPos.current.x;
            const dz = pz - lastPos.current.z;
            const instSpeed = Math.hypot(dx, dz) / Math.max(1e-4, dt);
            speedEMA.current = THREE.MathUtils.lerp(speedEMA.current, instSpeed, 0.22);
            lastPos.current.set(px, py, pz);

            const moving = speedEMA.current > 0.2;
            let nextState: "idle" | "walk" | "run";
            if (!moving) nextState = "idle";
            else if (isShiftPressed.current) nextState = "run";
            else nextState = "walk";
            if (nextState !== animState) setAnimState(nextState);

            let targetYaw: number;
            if (moving && Math.abs(dx) + Math.abs(dz) > 1e-6) {
                targetYaw = Math.atan2(dx, dz);
            } else {
                const fwd =
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
            <group
                ref={(n) => {
                    rootRef.current = n;
                    if (typeof ref === "function") ref(n!);
                    else if (ref)
                        (ref as { current: THREE.Group | null }).current = n;
                }}
            >
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
);
