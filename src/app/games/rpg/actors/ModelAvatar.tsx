// rpg/actors/ModelAvatar.tsx
"use client";
import * as THREE from "three";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFBX, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { useGame } from "../presenter/useGameStore";

function findClip(clips: THREE.AnimationClip[], wants: string[]) {
    const keys = wants.map((s) => s.toLowerCase());

    for (const key of keys) {
        const exactMatch = clips.find((c) => {
            const parts = c.name.split("|");
            const animName = parts.length > 1 ? parts[1] : parts[0];
            return animName.toLowerCase() === key;
        });
        if (exactMatch) return exactMatch;
    }

    return (
        clips.find((c) => {
            const parts = c.name.split("|");
            const animName = parts.length > 1 ? parts[1] : parts[0];
            return keys.some((w) => animName.toLowerCase().includes(w));
        }) || null
    );
}

export type AnimState =
    | "idle"
    | "run"
    | "walk"
    | "attack"
    | "skill1"
    | "skill2"
    | "parry"
    | "hit"
    | "death"
    | "defeat"
    | "victory"
    | "jump"
    | "roll";

const CLIPS: Record<AnimState, string[]> = {
    idle: ["idle", "breath"],
    walk: ["walk"],
    run: ["run"],
    attack: ["punch", "box"],
    skill1: ["swordslash"],
    skill2: ["shoot_onehanded"],
    parry: ["roll"],
    hit: ["recievehit", "hit"],
    death: ["death"],
    defeat: ["defeat", "sitdown"],
    victory: ["victory"],
    jump: ["jump"],
    roll: ["roll"],
};

type Props = {
    url: string;
    state?: AnimState;
    preferredAttack?: "attack" | "shoot" | "punch";
    autoIdleAfterOneShot?: boolean;
    playNonce?: number;
    scale?: number | [number, number, number];
    rotation?: [number, number, number];
    position?: [number, number, number];
    normalizeHeightTo?: number;
};

export const ModelAvatar = forwardRef<THREE.Group, Props>(function ModelAvatar(
    {
        url,
        state = "idle",
        preferredAttack = "attack",
        autoIdleAfterOneShot = true,
        playNonce = 0,
        scale = 1,
        rotation = [0, 0, 0],
        position = [0, 0, 0],
        normalizeHeightTo,
    },
    ref
) {
    const fbx = useFBX(url);

    const root = useMemo(() => {
        const cloned = SkeletonUtils.clone(fbx) as THREE.Group;
        cloned.traverse((o: any) => {
            if (o.isMesh || o.isSkinnedMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                o.frustumCulled = false;
                const setMat = (m: any) => {
                    m.transparent = false;
                    m.opacity = 1;
                    m.side = THREE.DoubleSide;
                    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
                };
                Array.isArray(o.material)
                    ? o.material.forEach(setMat)
                    : o.material && setMat(o.material);
            }
        });

        const b1 = new THREE.Box3().setFromObject(cloned);
        const c = b1.getCenter(new THREE.Vector3());
        cloned.position.x -= c.x;
        cloned.position.z -= c.z;
        const b2 = new THREE.Box3().setFromObject(cloned);
        if (isFinite(b2.min.y)) cloned.position.y -= b2.min.y;
        if (normalizeHeightTo) {
            const sz = new THREE.Vector3();
            b2.getSize(sz);
            if (sz.y > 0) cloned.scale.setScalar(normalizeHeightTo / sz.y);
        }

        return cloned;
    }, [fbx, normalizeHeightTo]);

    const groupRef = useRef<THREE.Group>(null);
    const { mixer, clips } = useAnimations(fbx.animations, groupRef);

    const last = useRef<THREE.AnimationAction | null>(null);

    useEffect(() => {
        if (!clips.length || !groupRef.current) return;

        let desired = state;

        if (state === "attack" && !findClip(clips, CLIPS.attack)) {
            const order = ["attack", "skill1", "skill2"] as const;
            desired = (order.find((k) => !!findClip(clips, CLIPS[k])) ||
                "idle") as AnimState;
        }

        if (desired === "run" && !findClip(clips, CLIPS.run)) {
            desired = findClip(clips, CLIPS.walk) ? "walk" : "idle";
        }

        const clip =
            findClip(clips, CLIPS[desired]) || findClip(clips, CLIPS.idle);
        if (!clip) return;

        const action = mixer.clipAction(clip, groupRef.current);
        const oneShot = [
            "attack",
            "skill1",
            "skill2",
            "parry",
            "hit",
            "death",
            "defeat",
            "victory",
            "jump",
            "roll",
        ].includes(desired);

        action.reset();
        action.clampWhenFinished = oneShot;
        action.setLoop(
            oneShot ? THREE.LoopOnce : THREE.LoopRepeat,
            oneShot ? 1 : Infinity
        );
        action.enabled = true;
        action.fadeIn(last.current ? 0.12 : 0).play();
        last.current?.fadeOut(0.08);
        last.current = action;

        let finishedHandler: ((e: any) => void) | null = null;
        if (
            oneShot &&
            autoIdleAfterOneShot &&
            !["death", "defeat"].includes(desired)
        ) {
            finishedHandler = (e: THREE.Event & { action: THREE.AnimationAction }) => {
                if (e.action !== action) return;
                const idle = findClip(clips, CLIPS.idle);
                if (!idle) return;
                const idleAct = mixer.clipAction(idle, groupRef.current!);
                idleAct.reset().fadeIn(0.18).play();
                last.current = idleAct;
                mixer.removeEventListener("finished", finishedHandler!);
            };
            mixer.addEventListener("finished", finishedHandler);
        }

        return () => {
            action.stop();
            if (finishedHandler)
                mixer.removeEventListener("finished", finishedHandler);
        };
    }, [
        state,
        playNonce,
        clips,
        mixer,
        preferredAttack,
        autoIdleAfterOneShot,
        url,
    ]);

    useFrame((_, delta) => {
        if (!mixer) return;

        const slowMotion = useGame.getState().slowMotion;
        const effectiveDelta = slowMotion.active
            ? delta * slowMotion.scale
            : delta;

        mixer.update(effectiveDelta);
    });

    return (
        <group
            ref={(n) => {
                groupRef.current = n;
                if (typeof ref === "function") ref(n!);
                else if (ref) (ref as any).current = n;
            }}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            <primitive object={root} />
        </group>
    );
});

useFBX.preload("/character/BlueSoldier_Female.fbx");
useFBX.preload("/character/Knight_Golden_Female.fbx");
useFBX.preload("/character/Wizard.fbx");
useFBX.preload("/character/Goblin_Male.fbx");
useFBX.preload("/character/Zombie_Female.fbx");
useFBX.preload("/character/Chef_Hat.fbx");
