// rpg/container/RpgGame.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../presenter/useGameStore";
import {
    exportToFile,
    importFromFile,
    listSaves,
    load,
    save,
} from "../utils/persist";
import { FieldScene } from "../field/FieldScene";
import { BattleRig } from "../battle/BattleRig";
import { BattleStage } from "../battle/BattleStage";
import { BattleUI } from "../ui/BattleUI";
import { QTEInterface, DefenseInterface } from "../ui/QTEDefenseInterface";
import { DamageFeed, EnemyHealthBarTop } from "../ui/DamageFeedUI";
import { SlowMotionEffect } from "../ui/HitEffects";
import { InventoryPanel, GameMenu } from "../menu/MenuUI";
import { SaveLoadPanel } from "../menu/SaveLoadPanel";

const TREASURES = [
    {
        id: "t1",
        pos: new THREE.Vector3(-1, 0, -1),
        items: [
            { id: "steel_sword", qty: 1 },
            { id: "health_potion", qty: 2 },
        ],
    },
    {
        id: "t2",
        pos: new THREE.Vector3(10, 0, 10),
        items: [
            { id: "mage_staff", qty: 1 },
            { id: "mana_potion", qty: 3 },
        ],
    },
] as const;

function BattleScene() {
    return (
        <Canvas shadows camera={{ fov: 42, near: 0.1, far: 100 }}>
            <BattleRig />
            <BattleStage />
        </Canvas>
    );
}

export default function RpgGame() {
    const snapshot = useGame((s) => s.snapshot);
    const applySave = useGame((s) => s.applySave);
    const gold = useGame((s) => s.player.gold);
    const addItem = useGame((s) => s.addItem);
    const combat = useGame((s) => s.combat);
    const startCombat = useGame((s) => s.startCombat);
    const exitBattle = useGame((s) => s.exitBattle);
    const togglePause = useGame((s) => s.togglePause);
    const toggleInventory = useGame((s) => s.toggleInventory);
    const closeAll = useGame((s) => s.closeAll);

    const [saves, setSaves] = useState(listSaves());
    const [fade, setFade] = useState<"none" | "to-battle" | "to-field">("none");
    const [showSavePanel, setShowSavePanel] = useState(false);
    const transitioning = useRef(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (combat.phase === "idle") {
                if (key === "escape") togglePause();
                else if (key === "i") toggleInventory();
                else if (key === "tab") {
                    e.preventDefault();
                    setShowSavePanel((v) => !v);
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [combat.phase, togglePause, toggleInventory]);

    useEffect(() => {
        const id = setInterval(() => {
            save(0, snapshot());
            setSaves(listSaves());
        }, 30_000);
        return () => clearInterval(id);
    }, [snapshot]);

    useEffect(() => {
        if (combat.phase !== "entering") return;

        const s = useGame.getState();
        const q = [...s.turnQueue];
        if (q.length === 0) return;

        const isAlive = (id: string) => {
            const pAlive = s.player.party.some(
                (c) => c.id === id && c.stats.hp > 0
            );
            const eAlive = s.combat.enemies.some(
                (e) => e.id === id && e.stats.hp > 0
            );
            return pAlive || eAlive;
        };

        let idx = s.currentTurn % q.length;
        let guard = 0;
        while ((!q[idx] || !isAlive(q[idx])) && guard++ < q.length + 5) {
            idx = (idx + 1) % q.length;
        }

        if (idx !== s.currentTurn) {
            useGame.setState({ currentTurn: idx });
        }

        const currentId = q[idx];
        if (!currentId) return;

        const isEnemyTurn = !s.player.party.some((c) => c.id === currentId);

        setTimeout(() => {
            if (isEnemyTurn) {
                useGame.getState().startEnemyTelegraph();
            } else {
                useGame.setState((st) => ({
                    combat: { phase: "playerMenu", enemies: st.combat.enemies },
                }));
            }
        }, 800);
    }, [combat.phase]);

    const handleEnemyCollide = (
        payload:
            | { template: string; fieldId: string }
            | { group: Array<{ template: string; fieldId: string }> }
    ) => {
        if (transitioning.current) return;
        transitioning.current = true;
        setFade("to-battle");
        setTimeout(() => {
            startCombat(payload);
            setFade("none");
            transitioning.current = false;
        }, 500);
    };

    const handleTreasureCollide = (treasureId: string) => {
        const treasure = TREASURES.find((t) => t.id === treasureId);
        if (!treasure) return;
        treasure.items.forEach((item) => addItem(item.id, item.qty));
        useGame.setState((s) => ({
            flags: { ...s.flags, [`treasure_${treasureId}`]: true },
        }));
    };

    return (
        <div className="w-screen h-screen relative bg-black">
            {combat.phase === "idle" ? (
                <FieldScene
                    onEnemyCollide={handleEnemyCollide}
                    onTreasureCollide={handleTreasureCollide}
                />
            ) : (
                <div className="absolute inset-0">
                    <BattleScene />
                    <BattleUI />
                    <EnemyHealthBarTop />
                    <QTEInterface />
                    <DefenseInterface />
                    <DamageFeed />
                    <SlowMotionEffect />
                </div>
            )}

            <div
                className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                    fade !== "none" ? "opacity-100 bg-black" : "opacity-0"
                }`}
            />

            {combat.phase === "idle" && (
                <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2">
                    <div className="px-4 py-2 rounded-xl bg-black/80 backdrop-blur border border-yellow-500 text-yellow-300 font-medium">
                        💰 {gold} Gold
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                        ESC: Menu | I: Inventory | TAB: Save/Load
                    </div>
                </div>
            )}

            <SaveLoadPanel
                isOpen={showSavePanel && combat.phase === "idle"}
                onClose={() => setShowSavePanel(false)}
                snapshot={snapshot}
            />

            <GameMenu />
            <InventoryPanel />
        </div>
    );
}