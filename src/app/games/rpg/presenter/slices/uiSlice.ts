// rpg/presenter/slices/uiSlice.ts
"use client";

export const uiSlice = (set: any, get: any) => ({
    // ===== State =====
    ui: { pauseOpen: false, inventoryOpen: false },

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

    // ===== Close All UI =====
    closeAll: () =>
        set(() => ({ ui: { pauseOpen: false, inventoryOpen: false } })),
});