// rpg/field/MapBaker.tsx — 환경을 탑다운 오쏘 카메라로 촬영해 지도 이미지 생성.
// 전체 맵을 한 프레임에 그리면 미업로드 지오메트리 수백 개가 그 프레임에 몽땅
// GPU 업로드되어 초반 정지가 생긴다(실측) — 세로 스트립 8개로 나눠 프레임당
// 1개씩 렌더+readback하고, 픽셀 후처리·JPEG 인코딩도 프레임 밖에서 비동기로 한다.
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMapStore } from "../presenter/mapStore";

const TEX_W = 2048;
const WARMUP_FRAMES = 60; // 환경 텍스처/재질 로딩 대기
const STRIPS = 8; // 스트립 수 — 업로드·렌더·readback 비용을 8프레임에 분산
const STRIP_W = TEX_W / STRIPS;

// 리니어→sRGB 감마 룩업 테이블 — 픽셀당 Math.pow(1830만 회)가 베이크 프레임을
// 수백 ms 정지시키던 것을 배열 조회로 대체한다
const SRGB_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    SRGB_LUT[i] = Math.round(255 * Math.pow(i / 255, 1 / 2.2));
}

type BakeState = {
    texH: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    width: number;
    depth: number;
    topY: number;
    bottomY: number;
    pixels: Uint8Array;
    rt: THREE.WebGLRenderTarget;
    strip: number;
};

export function MapBaker() {
    const { gl, scene } = useThree();
    const done = useRef(false);
    const attempts = useRef(0);
    const frame = useRef(0);
    const bake = useRef<BakeState | null>(null);

    useFrame(() => {
        if (done.current || attempts.current >= 3) return;
        frame.current++;
        if (frame.current < WARMUP_FRAMES) return;
        const envMeshes = scene.userData.__environmentMeshes as
            | THREE.Object3D[]
            | undefined;
        if (!envMeshes?.length) return;

        // ===== 최초 1회: 바운즈 계산 + 스트립 상태 준비 =====
        if (!bake.current) {
            const box = new THREE.Box3();
            for (const m of envMeshes) box.expandByObject(m);
            const width = box.max.x - box.min.x;
            const depth = box.max.z - box.min.z;
            // 바운즈가 비정상(폭/깊이가 거의 0)이면 렌더타겟 크기가 NaN이 되므로 이번 시도는 건너뜀
            if (!(width > 1) || !(depth > 1)) {
                attempts.current++;
                console.warn("[MapBaker] 비정상 환경 바운즈 — 베이크 건너뜀", width, depth);
                return;
            }
            // 월드 비율 유지 — 정사각 텍스처로 늘어나는 왜곡 방지
            const texH = Math.max(256, Math.round((TEX_W * depth) / width));
            bake.current = {
                texH,
                minX: box.min.x,
                maxX: box.max.x,
                minZ: box.min.z,
                maxZ: box.max.z,
                width,
                depth,
                topY: box.max.y,
                bottomY: box.min.y,
                pixels: new Uint8Array(TEX_W * texH * 4),
                rt: new THREE.WebGLRenderTarget(STRIP_W, texH),
                strip: 0,
            };
        }
        const st = bake.current;

        // ===== 프레임당 스트립 1개: 부분 오쏘 카메라 렌더 → readback → 버퍼 합성 =====
        // 화면 위 = 북(-Z), 오른쪽 = 동(+X). 스트립 k는 X 구간 [minX + k*w/8, minX + (k+1)*w/8].
        const cx = (st.minX + st.maxX) / 2;
        const cz = (st.minZ + st.maxZ) / 2;
        const stripWorldW = st.width / STRIPS;
        const left = -st.width / 2 + st.strip * stripWorldW;
        const cam = new THREE.OrthographicCamera(
            left,
            left + stripWorldW,
            st.depth / 2,
            -st.depth / 2,
            0.1,
            st.topY - st.bottomY + 60
        );
        cam.position.set(cx, st.topY + 30, cz);
        cam.up.set(0, 0, -1);
        cam.lookAt(cx, 0, cz);
        cam.updateMatrixWorld();

        const hidden: THREE.Object3D[] = [];
        const prevRT = gl.getRenderTarget();
        try {
            // 환경 외 오브젝트 숨김 — 메시를 갖되 환경 태그 메시가 없는 최상위 그룹
            //    (라이트·카메라는 메시가 없어 유지 → 조명 그대로 촬영)
            for (const child of scene.children) {
                let hasMesh = false;
                let hasEnv = false;
                child.traverse((o: unknown) => {
                    const obj = o as THREE.Mesh & { userData: { __type?: string } };
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

            gl.setRenderTarget(st.rt);
            gl.render(scene, cam);
            const stripPixels = new Uint8Array(STRIP_W * st.texH * 4);
            gl.readRenderTargetPixels(st.rt, 0, 0, STRIP_W, st.texH, stripPixels);
            // 스트립 → 전체 버퍼 행 복사 (같은 GL 아래→위 행 순서 유지)
            const xOff = st.strip * STRIP_W * 4;
            for (let y = 0; y < st.texH; y++) {
                st.pixels.set(
                    stripPixels.subarray(y * STRIP_W * 4, (y + 1) * STRIP_W * 4),
                    y * TEX_W * 4 + xOff
                );
            }
            st.strip++;
        } catch (e) {
            attempts.current++;
            bake.current = null;
            st.rt.dispose();
            console.error("[MapBaker] 베이크 실패", e);
            return;
        } finally {
            // 예외 발생 여부와 무관하게 렌더타겟 바인딩·가시성을 항상 복구
            gl.setRenderTarget(prevRT);
            for (const o of hidden) o.visible = true;
        }

        if (st.strip < STRIPS) return; // 다음 프레임에 다음 스트립

        // ===== 전 스트립 완료: 후처리(행 반전·감마 LUT)·인코딩은 프레임 밖에서 =====
        done.current = true;
        st.rt.dispose();
        const { texH, minX, maxX, minZ, maxZ, pixels } = st;
        bake.current = null;

        const canvas = document.createElement("canvas");
        canvas.width = TEX_W;
        canvas.height = texH;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(TEX_W, texH);
        let y = 0;
        const processRows = () => {
            const t0 = performance.now();
            while (y < texH && performance.now() - t0 < 12) {
                const src = (texH - 1 - y) * TEX_W * 4;
                const dst = y * TEX_W * 4;
                for (let i = 0; i < TEX_W * 4; i += 4) {
                    img.data[dst + i] = SRGB_LUT[pixels[src + i]];
                    img.data[dst + i + 1] = SRGB_LUT[pixels[src + i + 1]];
                    img.data[dst + i + 2] = SRGB_LUT[pixels[src + i + 2]];
                    img.data[dst + i + 3] = 255;
                }
                y++;
            }
            if (y < texH) {
                setTimeout(processRows, 0);
                return;
            }
            ctx.putImageData(img, 0, 0);
            // toBlob: 동기 toDataURL(2048폭 수백 ms) 대신 비동기 인코딩
            canvas.toBlob(
                (blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    useMapStore.getState().setMap(url, { minX, maxX, minZ, maxZ });
                    // 디버깅용 — 콘솔에서 window.open(__mapUrl)로 베이크 결과 확인
                    (window as unknown as { __mapUrl?: string }).__mapUrl = url;
                    console.log(
                        `[MapBaker] 지도 베이크 완료 ${TEX_W}x${texH} X:[${minX.toFixed(
                            1
                        )}, ${maxX.toFixed(1)}] Z:[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`
                    );
                },
                "image/jpeg",
                0.85
            );
        };
        setTimeout(processRows, 0);
    });

    return null;
}
