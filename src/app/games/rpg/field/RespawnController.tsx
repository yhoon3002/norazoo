// rpg/field/RespawnController.tsx — 필드 리스폰 관리 (전멸 무리 예약 + 만료 소거)
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../presenter/useGameStore";
import { FIELD_ENEMIES, FIELD_GATHERABLES, GOLDEN_HERB_SPOTS } from "../data/gameData";

export function RespawnController() {
    const frame = useRef(0);

    useFrame(() => {
        frame.current++;
        if (frame.current % 60 !== 0) return; // ~1초 주기
        const g = useGame.getState() as any;
        if (g.combat.phase !== "idle") return;

        // 1) 전멸한 리스폰 무리 → 타이머 예약
        for (const s of FIELD_ENEMIES) {
            if (!s.respawn) continue;
            const ids =
                "templates" in s && s.templates
                    ? (s.templates as string[]).map(
                          (_, i) => `defeated_${s.id}_${i}`
                      )
                    : [`defeated_${s.id}`];
            const key = ids.join("|");
            if (g.fieldRespawn[key] !== undefined) continue;
            if (ids.every((f: string) => g.flags[f])) {
                g.scheduleRespawn(key, s.respawn);
            }
        }

        // 2) 채집물 — 플래그가 서 있는데 타이머가 없으면 예약 (세이브/로드 후에도 복원)
        for (const gt of FIELD_GATHERABLES) {
            const key = `gather_${gt.id}`;
            if (g.fieldRespawn[key] === undefined && g.flags[key]) {
                g.scheduleRespawn(key, 180_000);
            }
        }
        for (let i = 0; i < GOLDEN_HERB_SPOTS.length; i++) {
            const key = `gather_golden_${i}`;
            if (g.fieldRespawn[key] === undefined && g.flags[key]) {
                g.scheduleRespawn(key, 180_000);
            }
        }

        // 3) 만료 타이머 소거 → 플래그 부활(리스폰)
        g.consumeRespawns();
    });

    return null;
}
