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
    },

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

    // ===== Close All UI =====
    closeAll: () =>
        set(() => ({
            ui: {
        pauseOpen: false,
        inventoryOpen: false,
        shopOpen: false,
        fastTravelOpen: false,
        mapOpen: false,
    },
        })),
});