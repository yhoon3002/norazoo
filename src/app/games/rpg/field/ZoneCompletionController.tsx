// rpg/field/ZoneCompletionController.tsx — 존 정복 판정 (깃발+보물3+전망 5요소 충족 → 1회 보상)
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../presenter/useGameStore";
import { ZONE_DEFS } from "../data/placementData";
import { ZONE_REWARDS, zoneProgress } from "../data/zoneRewards";

export function ZoneCompletionController() {
    const frame = useRef(0);

    useFrame(() => {
        frame.current++;
        if (frame.current % 60 !== 0) return; // ~1초 주기
        const g = useGame.getState() as any;
        if (g.combat.phase !== "idle") return;

        for (const zd of ZONE_DEFS) {
            const doneFlag = `zone_done_${zd.id}`;
            if (g.flags[doneFlag]) continue;
            const { done, total } = zoneProgress(zd.id, g.flags);
            if (done !== total) continue;

            // 정복 완료 — 플래그 확정 + 보상 지급
            useGame.setState((s: { flags: Record<string, boolean> }) => ({
                flags: { ...s.flags, [doneFlag]: true },
            }));
            const reward = ZONE_REWARDS[zd.id];
            g.gainGold(reward.gold);
            for (const it of reward.items) g.addItem(it.id, it.qty);
            g.spawnPopup({
                side: "ally",
                text: `🏆 ${zd.label} 정복! +${reward.gold}G`,
                color: "#fbbf24",
            });
        }
    });

    return null;
}
