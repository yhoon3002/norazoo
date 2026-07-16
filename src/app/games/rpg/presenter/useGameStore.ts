// rpg/presenter/useGameStore.ts
"use client";

import { create } from "zustand";
import type {
    CombatState,
    Enemy,
    Player,
    SaveData,
    Vec3,
    Character,
    Skill,
    CombatAction,
    Quest,
    Treasure,
    Telegraph,
    PendingAction,
} from "../types/RpgTypes";

// ===== Import All Slices =====
import { playerSlice } from "./slices/playerSlice";
import { bagSlice } from "./slices/bagSlice";
import { combatSlice } from "./slices/combatSlice";
import { uiSlice } from "./slices/uiSlice";
import { battleActionsSlice } from "./slices/battleActionsSlice";
import { enemyActionsSlice } from "./slices/enemyActionsSlice";
import { effectsSlice } from "./slices/effectsSlice";
import { animationSlice } from "./slices/animationSlice";
import { turnSlice } from "./slices/turnSlice";
import { statusSlice } from "./slices/statusSlice";
import { targetSlice } from "./slices/targetSlice";
import { storySlice } from "./slices/storySlice";
import { fieldSlice } from "./slices/fieldSlice";

// ===== Type Definition =====
export type GameState = ReturnType<typeof playerSlice> &
    ReturnType<typeof bagSlice> &
    ReturnType<typeof combatSlice> &
    ReturnType<typeof uiSlice> &
    ReturnType<typeof battleActionsSlice> &
    ReturnType<typeof enemyActionsSlice> &
    ReturnType<typeof effectsSlice> &
    ReturnType<typeof animationSlice> &
    ReturnType<typeof turnSlice> &
    ReturnType<typeof statusSlice> &
    ReturnType<typeof targetSlice> &
    ReturnType<typeof storySlice> &
    ReturnType<typeof fieldSlice> & {
        // World state
        world: { mapId: string; time: number };
        flags: Record<string, boolean>;

        // Additional state
        encounterFieldIds?: string[];
        battleStartPartyState?: Character[];
        battleStartPosition?: Vec3;
    };

// ===== Create Store =====
export const useGame = create<GameState>((set, get) => ({
    // ===== World & Flags =====
    world: { mapId: "nora", time: 0 },
    flags: {},

    // ===== Integrate All Slices =====
    ...playerSlice(set, get),
    ...bagSlice(set, get),
    ...combatSlice(set, get),
    ...uiSlice(set, get),
    ...battleActionsSlice(set, get),
    ...enemyActionsSlice(set, get),
    ...effectsSlice(set, get),
    ...animationSlice(set, get),
    ...turnSlice(set, get),
    ...statusSlice(set, get),
    ...targetSlice(set, get),
    ...storySlice(set, get),
    ...fieldSlice(set, get),
}));

// 디버깅용 전역 핸들 — 브라우저 콘솔에서 __game.getState()로 상태 확인 가능
if (typeof window !== "undefined") {
    (window as unknown as { __game?: typeof useGame }).__game = useGame;
}

// ===== Export Helper Functions =====
export { getSkillAnimationState, clamp } from "./gameStoreHelpers";