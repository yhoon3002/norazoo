// rpg/field/MapBaker.tsx — 환경을 탑다운 오쏘 카메라로 1회 촬영해 지도 이미지 생성
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMapStore } from "../presenter/mapStore";

const TEX_W = 2048;
const WARMUP_FRAMES = 60; // 환경 텍스처/재질 로딩 대기

export function MapBaker() {
    const { gl, scene } = useThree();
    const done = useRef(false);
    const frame = useRef(0);

    useFrame(() => {
        if (done.current) return;
        frame.current++;
        if (frame.current < WARMUP_FRAMES) return;
        const envMeshes = scene.userData.__environmentMeshes as
            | THREE.Object3D[]
            | undefined;
        if (!envMeshes?.length) return;
        done.current = true;

        // 1) 환경 전체의 월드 바운즈 (센터링·회전 적용 후 실제 좌표)
        const box = new THREE.Box3();
        for (const m of envMeshes) box.expandByObject(m);
        const minX = box.min.x,
            maxX = box.max.x,
            minZ = box.min.z,
            maxZ = box.max.z;
        const width = maxX - minX;
        const depth = maxZ - minZ;
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        // 월드 비율 유지 — 정사각 텍스처로 늘어나는 왜곡 방지
        const texH = Math.max(256, Math.round((TEX_W * depth) / width));

        // 2) 탑다운 오쏘 카메라 — 화면 위 = 북(-Z), 오른쪽 = 동(+X)
        const cam = new THREE.OrthographicCamera(
            -width / 2,
            width / 2,
            depth / 2,
            -depth / 2,
            0.1,
            box.max.y - box.min.y + 60
        );
        cam.position.set(cx, box.max.y + 30, cz);
        cam.up.set(0, 0, -1);
        cam.lookAt(cx, 0, cz);
        cam.updateMatrixWorld();

        // 3) 환경 외 오브젝트 숨김 — 메시를 갖되 환경 태그 메시가 없는 최상위 그룹
        //    (라이트·카메라는 메시가 없어 유지 → 조명 그대로 촬영)
        const hidden: THREE.Object3D[] = [];
        for (const child of scene.children) {
            let hasMesh = false;
            let hasEnv = false;
            child.traverse((o: unknown) => {
                const obj = o as THREE.Mesh & {
                    userData: { __type?: string };
                };
                if ((obj as THREE.Mesh).isMesh) {
                    hasMesh = true;
                    if (obj.userData.__type === "environment") hasEnv = true;
                }
            });
            if (hasMesh && !hasEnv && child.visible) {
                child.visible = false;
                hidden.push(child);
            }
        }

        // 4) 렌더타겟 1회 렌더 → 픽셀 읽기 → 캔버스(dataURL)
        const rt = new THREE.WebGLRenderTarget(TEX_W, texH);
        const prevRT = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        gl.render(scene, cam);
        const pixels = new Uint8Array(TEX_W * texH * 4);
        gl.readRenderTargetPixels(rt, 0, 0, TEX_W, texH, pixels);
        gl.setRenderTarget(prevRT);
        rt.dispose();
        for (const o of hidden) o.visible = true;

        const canvas = document.createElement("canvas");
        canvas.width = TEX_W;
        canvas.height = texH;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(TEX_W, texH);
        // GL 픽셀은 아래→위 순서 → 행 반전. RT는 리니어 색공간 → sRGB 감마 보정.
        for (let y = 0; y < texH; y++) {
            const src = (texH - 1 - y) * TEX_W * 4;
            const dst = y * TEX_W * 4;
            for (let i = 0; i < TEX_W * 4; i += 4) {
                img.data[dst + i] = Math.round(
                    255 * Math.pow(pixels[src + i] / 255, 1 / 2.2)
                );
                img.data[dst + i + 1] = Math.round(
                    255 * Math.pow(pixels[src + i + 1] / 255, 1 / 2.2)
                );
                img.data[dst + i + 2] = Math.round(
                    255 * Math.pow(pixels[src + i + 2] / 255, 1 / 2.2)
                );
                img.data[dst + i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        useMapStore.getState().setMap(url, { minX, maxX, minZ, maxZ });
        // 디버깅용 — 콘솔에서 window.open(__mapUrl)로 베이크 결과 확인
        (window as unknown as { __mapUrl?: string }).__mapUrl = url;
        console.log(
            `[MapBaker] 지도 베이크 완료 ${TEX_W}x${texH} X:[${minX.toFixed(
                1
            )}, ${maxX.toFixed(1)}] Z:[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`
        );
    });

    return null;
}
