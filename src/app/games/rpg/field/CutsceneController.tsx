// rpg/field/CutsceneController.tsx — 컷신 스텝 실행기 (카메라 보간·대사 대기·스킵)
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import { CUTSCENES } from "../data/cutsceneData";

const SKIP_HOLD_MS = 800;

type StepPhase = {
    key: string;
    startedAt: number;
    from?: THREE.Vector3;
    fromLook?: THREE.Vector3;
};

export function CutsceneController() {
    const { camera, scene } = useThree();
    const stepRef = useRef<StepPhase | null>(null);
    const savedCam = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
    const lookRef = useRef<THREE.Vector3 | null>(null);
    const holdStart = useRef<number | null>(null);
    const _look = useRef(new THREE.Vector3());

    // Enter 홀드 스킵
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key !== "Enter" || !useGame.getState().cutscene) return;
            if (holdStart.current === null) holdStart.current = performance.now();
        };
        const up = (e: KeyboardEvent) => {
            if (e.key !== "Enter") return;
            if (holdStart.current !== null && performance.now() - holdStart.current >= SKIP_HOLD_MS) {
                useGame.getState().skipCutscene();
                stepRef.current = null;
                savedCam.current = null;
                lookRef.current = null;
                scene.userData.__cutsceneCam = false;
            }
            holdStart.current = null;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, [scene]);

    // 언마운트 시 __cutsceneCam 정리 (battle 스텝으로 언마운트될 때 구 scene에 플래그 잔존 방지)
    useEffect(() => () => {
        scene.userData.__cutsceneCam = false;
    }, [scene]);

    useFrame(() => {
        const g = useGame.getState();
        const c = g.cutscene;
        if (!c) {
            if (scene.userData.__cutsceneCam) scene.userData.__cutsceneCam = false;
            stepRef.current = null;
            savedCam.current = null;
            lookRef.current = null;
            return;
        }
        // 전투 중에는 스텝을 진행하지 않는다 — battle 스텝이 startCombat한 같은/다음
        // 프레임에 다음 say 스텝까지 진입해 버리면, 언마운트 전 대사가 밀려
        // 복귀 후 해당 라인이 소리 없이 건너뛰어진다(T5 실측 레이스).
        // FieldScene 언마운트 전의 짧은 창을 이 게이트가 막고, 복귀 후 fresh
        // stepRef로 해당 스텝이 처음부터 재생된다.
        if (g.combat.phase !== "idle") return;
        scene.userData.__cutsceneCam = true;
        const steps = CUTSCENES[c.id] ?? [];
        const step = steps[c.index];
        if (!step) {
            g.advanceCutsceneStep();
            return;
        }
        const key = `${c.id}:${c.index}`;
        const now = performance.now();

        // 스텝 진입 처리 (1회)
        if (stepRef.current?.key !== key) {
            stepRef.current = { key, startedAt: now };
            if (!savedCam.current) {
                savedCam.current = {
                    pos: camera.position.clone(),
                    look: camera.position
                        .clone()
                        .add(camera.getWorldDirection(_look.current).clone().multiplyScalar(3)),
                };
                lookRef.current = savedCam.current.look.clone();
            }
            switch (step.type) {
                case "say":
                    g.startDialogue([step.line]);
                    break;
                case "fx":
                    g.spawnPopup({ side: "ally", ...step.popup });
                    g.advanceCutsceneStep();
                    return;
                case "set":
                    // startCutscene에서 선적용됨 — 재생 시에는 그냥 전진
                    g.advanceCutsceneStep();
                    return;
                case "battle":
                    // 복귀 후 다음 스텝부터 이어서 재생되도록 먼저 전진해 둔다
                    g.advanceCutsceneStep();
                    g.startCombat({
                        group: step.templates.map((template, i) => ({
                            template,
                            fieldId: `${step.id}_${i}`,
                        })),
                    });
                    return;
                case "cam":
                case "camReset":
                    stepRef.current.from = camera.position.clone();
                    stepRef.current.fromLook = lookRef.current!.clone();
                    break;
                case "wait":
                    break;
            }
        }

        const st = stepRef.current!;
        const elapsed = now - st.startedAt;

        switch (step.type) {
            case "say": {
                if (g.dialogue.length === 0) g.advanceCutsceneStep();
                return;
            }
            case "wait": {
                if (elapsed >= step.ms) g.advanceCutsceneStep();
                return;
            }
            case "cam": {
                const t = Math.min(1, elapsed / step.ms);
                const e = t * t * (3 - 2 * t); // smoothstep
                if (step.pos) {
                    camera.position.lerpVectors(
                        st.from!,
                        new THREE.Vector3(step.pos.x, step.pos.y, step.pos.z),
                        e
                    );
                }
                _look.current.lerpVectors(
                    st.fromLook!,
                    new THREE.Vector3(step.lookAt.x, step.lookAt.y, step.lookAt.z),
                    e
                );
                camera.lookAt(_look.current);
                lookRef.current!.copy(_look.current);
                if (t >= 1) {
                    st.fromLook = new THREE.Vector3(step.lookAt.x, step.lookAt.y, step.lookAt.z);
                    if (elapsed >= step.ms + (step.hold ?? 0)) g.advanceCutsceneStep();
                }
                return;
            }
            case "camReset": {
                const t = Math.min(1, elapsed / step.ms);
                const e = t * t * (3 - 2 * t);
                camera.position.lerpVectors(st.from!, savedCam.current!.pos, e);
                _look.current.lerpVectors(st.fromLook!, savedCam.current!.look, e);
                camera.lookAt(_look.current);
                lookRef.current!.copy(_look.current);
                if (t >= 1) {
                    savedCam.current = null;
                    lookRef.current = null;
                    g.advanceCutsceneStep();
                }
                return;
            }
            case "fx":
            case "set":
            case "battle":
                // 진입 처리에서 이미 advance 후 return 했으므로 도달하지 않음
                return;
        }
    });

    return null;
}
