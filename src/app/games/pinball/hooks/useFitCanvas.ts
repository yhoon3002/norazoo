import { useLayoutEffect } from "react";

export default function useFitCanvas(
    wrapRef: React.RefObject<HTMLElement | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    baseWidth: number,
    baseHeight: number
) {
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) {
            return;
        }

        const apply = () => {
            const rect = wrap.getBoundingClientRect(); // padding/border 제외한 실제 내용영역
            const wRatio = rect.width / baseWidth;
            const hRatio = rect.height / baseHeight;
            const scale = Math.max(0.01, Math.min(wRatio, hRatio)); // 안전가드

            const cssW = Math.floor(baseWidth * scale);
            const cssH = Math.floor(baseHeight * scale);

            canvas.style.width = `${cssW}px`;
            canvas.style.height = `${cssH}px`;

            // 내부 픽셀 해상도(HiDPI)
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            canvas.width = Math.floor(baseWidth * dpr);
            canvas.height = Math.floor(baseHeight * dpr);

            const ctx = canvas.getContext("2d");
            if (ctx) {
                // 논리좌표(baseWidth x baseHeight)에 맞춰 dpr만 적용
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.imageSmoothingEnabled = true;
            }
        };

        const ro = new ResizeObserver(apply);
        ro.observe(wrap);

        // 초기 1회 적용
        apply();

        return () => {
            ro.disconnect();
        };
    }, [wrapRef, canvasRef, baseWidth, baseHeight]);
}
