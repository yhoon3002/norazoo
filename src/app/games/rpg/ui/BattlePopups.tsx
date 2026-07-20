// rpg/ui/BattlePopups.tsx — spawnPopup을 3D 플로팅 텍스트로 렌더링
// (effectsSlice의 popups는 이 컴포넌트가 붙기 전까지 어디에도 표시되지 않던 상태였다)
"use client";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useGame } from "../presenter/useGameStore";

const LIFE_MS = 1300;
const PARTY_Z = -4.5;
const ENEMY_Z = 4.5;
const PARTY_SPACING = 2.2;
const ENEMY_SPACING = 1.8;

export function BattlePopups() {
    const popups = useGame((s) => s.popups);
    const party = useGame((s) => s.player.party);
    const combat = useGame((s) => s.combat);
    const clearOldPopups = useGame((s) => s.clearOldPopups);

    // 만료 팝업 정리 (프레임 루프에서 저비용 체크)
    useFrame(() => {
        const ps = useGame.getState().popups;
        if (ps.length && performance.now() - ps[0].createdAt > LIFE_MS) {
            clearOldPopups(LIFE_MS);
        }
    });

    if (combat.phase === "idle") return null;
    const enemies =
        (combat as { enemies?: Array<{ id: string }> }).enemies ?? [];

    const posFor = (p: {
        side: string;
        charId?: string;
    }): [number, number, number] => {
        if (p.side === "ally") {
            const i = p.charId
                ? party.findIndex((c) => c.id === p.charId)
                : -1;
            const x =
                i >= 0 ? (i - (party.length - 1) / 2) * PARTY_SPACING : 0;
            return [x, 2.4, PARTY_Z];
        }
        const i = p.charId
            ? enemies.findIndex((e) => e.id === p.charId)
            : -1;
        const x = i >= 0 ? (i - (enemies.length - 1) / 2) * ENEMY_SPACING : 0;
        return [x, 2.7, ENEMY_Z];
    };

    return (
        <>
            {popups.map((p) => {
                const isNumber =
                    p.text.startsWith("-") || p.text.startsWith("+");
                return (
                    <Html
                        key={p.id}
                        position={posFor(p)}
                        center
                        zIndexRange={[30, 0]}
                        style={{ pointerEvents: "none" }}
                    >
                        <div
                            style={{
                                whiteSpace: "nowrap",
                                color: p.color,
                                fontWeight: 800,
                                fontSize: isNumber ? 24 : 15,
                                textShadow:
                                    "0 0 6px rgba(0,0,0,0.9), 0 2px 2px rgba(0,0,0,0.8)",
                                marginLeft: ((p.id % 3) - 1) * 22,
                                animation: `rpgPopupRise ${LIFE_MS}ms ease-out forwards`,
                            }}
                        >
                            {p.text}
                        </div>
                    </Html>
                );
            })}
        </>
    );
}
