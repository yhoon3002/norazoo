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
import { FIELD_TREASURES } from "../data/gameData";
import { ChapterTitle } from "../ui/ChapterTitle";
import { FastTravelPanel } from "../menu/FastTravelPanel";
import { FullMapPanel } from "../menu/FullMapPanel";
import { FishingPanel } from "../menu/FishingPanel";
import { BattleRig } from "../battle/BattleRig";
import { BattleStage } from "../battle/BattleStage";
import { BattleUI } from "../ui/BattleUI";
import {
    QTEInterface,
    DefenseInterface,
    DefenseTutorial,
} from "../ui/QTEDefenseInterface";
import { DamageFeed, EnemyHealthBarTop } from "../ui/DamageFeedUI";
import { SlowMotionEffect } from "../ui/HitEffects";
import { InventoryPanel, GameMenu } from "../menu/MenuUI";
import { ShopPanel } from "../menu/ShopPanel";
import { SaveLoadPanel } from "../menu/SaveLoadPanel";
import { DialogueUI } from "../ui/DialogueUI";
import { MiniMap } from "../ui/MiniMap";



// 목표 텍스트 + 목표 지점까지 거리 (0.5초 간격 갱신)
function ObjectiveHud({ objective }: { objective: string }) {
    const [dist, setDist] = useState<number | null>(null);
    useEffect(() => {
        const id = setInterval(() => {
            const s = useGame.getState();
            const t = s.story.target;
            if (!t) return setDist(null);
            const p = s.player.pos;
            setDist(Math.round(Math.hypot(p.x - t.x, p.z - t.z)));
        }, 500);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="pointer-events-none absolute top-4 left-4 bg-black/70 backdrop-blur border border-amber-400/50 rounded-xl px-4 py-2">
            <div className="text-amber-300 text-xs mb-0.5">목표</div>
            <div className="text-white text-sm">
                🧭 {objective}
                {dist !== null && (
                    <span className="text-sky-300 ml-2">({dist}m)</span>
                )}
            </div>
        </div>
    );
}

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
    const objective = useGame((s) => s.story.objective);
    const dialogueLen = useGame((s) => s.dialogue.length);
    const ui = useGame((s) => s.ui);

    const [saves, setSaves] = useState(listSaves());
    const [fade, setFade] = useState<"none" | "to-battle" | "to-field">("none");
    const [showSavePanel, setShowSavePanel] = useState(false);
    const transitioning = useRef(false);
    const prevPhase = useRef(combat.phase);

    // 배틀 → 필드 복귀 시 검은 화면에서 페이드인
    useEffect(() => {
        const was = prevPhase.current;
        prevPhase.current = combat.phase;
        if (was !== "idle" && combat.phase === "idle") {
            setFade("to-field");
            const t = setTimeout(() => setFade("none"), 80);
            return () => clearTimeout(t);
        }
    }, [combat.phase]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (combat.phase === "idle") {
                if (key === "escape") {
                    // 상점/패스트트래블/지도가 열려 있으면 ESC는 그것만 닫는다
                    const ui = useGame.getState().ui as any;
                    if (ui.shopOpen || ui.fastTravelOpen || ui.mapOpen || ui.fishingOpen) {
                        closeAll();
                        return;
                    }
                    togglePause();
                } else if (key === "i") {
                    const u = useGame.getState().ui as any;
                    if (u.mapOpen || u.shopOpen || u.fastTravelOpen || u.fishingOpen) return;
                    toggleInventory();
                } else if (key === "m") {
                    const st = useGame.getState();
                    if (st.dialogue.length > 0) return;
                    const u = st.ui as any;
                    if (u.pauseOpen || u.inventoryOpen || u.shopOpen || u.fastTravelOpen || u.fishingOpen) return;
                    document.exitPointerLock?.();
                    (st as any).toggleMap();
                }
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
        closeAll();
        setFade("to-battle");
        setTimeout(() => {
            startCombat(payload);
            setFade("none");
            transitioning.current = false;
        }, 500);
    };

    const handleTreasureCollide = (treasureId: string) => {
        const treasure = FIELD_TREASURES.find((t) => t.id === treasureId);
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
                    <DefenseTutorial />
                    <DamageFeed />
                    <SlowMotionEffect />
                </div>
            )}

            <div
                className={`pointer-events-none absolute inset-0 bg-black ${
                    fade !== "none" ? "opacity-100" : "opacity-0"
                } ${
                    // to-field는 즉시 검게(전환 순간) 깔고, none으로 바뀔 때 페이드인
                    fade === "to-field" ? "" : "transition-opacity duration-500"
                }`}
            />

            {/* 목표 HUD */}
            {combat.phase === "idle" && objective && (
                <ObjectiveHud objective={objective} />
            )}

            {/* 미니맵 — 대화/메뉴 중에는 숨김 */}
            {combat.phase === "idle" &&
                dialogueLen === 0 &&
                !ui.pauseOpen &&
                !ui.inventoryOpen &&
                !ui.shopOpen &&
                !ui.fastTravelOpen &&
                !ui.mapOpen &&
                !ui.fishingOpen && <MiniMap />}

            {combat.phase === "idle" && <DialogueUI />}

            {combat.phase === "idle" && (
                <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2">
                    <div className="px-4 py-2 rounded-xl bg-black/80 backdrop-blur border border-yellow-500 text-yellow-300 font-medium">
                        💰 {gold} Gold
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                        ESC: Menu | I: Inventory | M: Map | TAB: Save/Load
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
            {combat.phase === "idle" && <ShopPanel />}
            {combat.phase === "idle" && <FastTravelPanel />}
            {combat.phase === "idle" && <FullMapPanel />}
            {combat.phase === "idle" && <FishingPanel />}
            <ChapterTitle />
        </div>
    );
}