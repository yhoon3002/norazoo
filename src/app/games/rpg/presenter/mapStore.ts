// rpg/presenter/mapStore.ts — 베이크된 지도 이미지/월드 경계 (세이브와 무관한 런타임 상태)
"use client";

import { create } from "zustand";

export type MapBounds = {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};

type MapState = {
    mapUrl: string | null;
    bounds: MapBounds | null;
    setMap: (mapUrl: string, bounds: MapBounds) => void;
};

export const useMapStore = create<MapState>((set) => ({
    mapUrl: null,
    bounds: null,
    setMap: (mapUrl, bounds) => set({ mapUrl, bounds }),
}));

/** 월드 (x,z) → 지도 이미지 UV. 이미지는 위가 북(-Z), 왼쪽이 서(-X). */
export function worldToUV(x: number, z: number, b: MapBounds) {
    return {
        u: (x - b.minX) / (b.maxX - b.minX),
        v: (z - b.minZ) / (b.maxZ - b.minZ),
    };
}
