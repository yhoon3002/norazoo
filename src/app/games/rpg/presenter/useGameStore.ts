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
    ReturnType<typeof targetSlice> & {
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
    world: { mapId: "expedition_33", time: 0 },
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
}));

// ===== Export Helper Functions =====
export { getSkillAnimationState, clamp } from "./gameStoreHelpers";