// rpg/presenter/slices/uiSlice.ts
"use client";

export const uiSlice = (set: any, get: any) => ({
    // ===== State =====
    ui: {
        pauseOpen: false,
        inventoryOpen: false,
        shopOpen: false,
        fastTravelOpen: false,
        mapOpen: false,
        fishingOpen: false,
        smithOpen: false,
        bountyOpen: false,
        tailorOpen: false,
    },
    fishingSpotId: null as string | null,

    // ===== Toggle Pause =====
    togglePause: () =>
        set((s: any) => ({
            ui: { ...s.ui, pauseOpen: !s.ui.pauseOpen },
        })),

    // ===== Toggle Inventory =====
    toggleInventory: () =>
        set((s: any) => ({
            ui: { ...s.ui, inventoryOpen: !s.ui.inventoryOpen },
        })),

    // ===== Toggle Shop =====
    toggleShop: () =>
        set((s: any) => ({
            ui: { ...s.ui, shopOpen: !s.ui.shopOpen },
        })),

    // ===== Fast Travel (활성 깃발 간 이동) =====
    openFastTravel: () =>
        set((s: any) => ({ ui: { ...s.ui, fastTravelOpen: true } })),

    // ===== 전체지도 (M키) =====
    toggleMap: () =>
        set((s: any) => ({ ui: { ...s.ui, mapOpen: !s.ui.mapOpen } })),

    // ===== 낚시 (부두 + 존 낚시터) =====
    openFishing: (spotId: string) =>
        set((s: any) => ({ ui: { ...s.ui, fishingOpen: true }, fishingSpotId: spotId })),

    // ===== 대장간 강화 =====
    toggleSmith: () =>
        set((s: any) => ({ ui: { ...s.ui, smithOpen: !s.ui.smithOpen } })),

    // ===== 사냥 의뢰판 =====
    toggleBounty: () =>
        set((s: any) => ({ ui: { ...s.ui, bountyOpen: !s.ui.bountyOpen } })),

    // ===== 아낙 재봉소 =====
    toggleTailor: () =>
        set((s: any) => ({ ui: { ...s.ui, tailorOpen: !s.ui.tailorOpen } })),

    // ===== Close All UI =====
    closeAll: () =>
        set(() => ({
            ui: {
                pauseOpen: false,
                inventoryOpen: false,
                shopOpen: false,
                fastTravelOpen: false,
                mapOpen: false,
                fishingOpen: false,
                smithOpen: false,
                bountyOpen: false,
                tailorOpen: false,
            },
        })),
});