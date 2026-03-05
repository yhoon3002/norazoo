import { useEffect } from "react";
import { useGame } from "../presenter/useGameStore";
import { SKILLS } from "../data/gameData";
import type { Enemy } from "../types/RpgTypes";

// phase !== "idle" | "defeat" 일 때 enemies가 존재함을 도와주는 헬퍼 타입
type ActiveCombat = { enemies: Enemy[]; phase: string; [key: string]: unknown };

export function BattleUI() {
    const combat = useGame((s) => s.combat);
    const party = useGame((s) => s.player.party);
    const turnQueue = useGame((s) => s.turnQueue);
    const currentTurn = useGame((s) => s.currentTurn);
    const exitBattle = useGame((s) => s.exitBattle);
    const startCombat = useGame((s) => s.startCombat);
    const encounterFieldIds = useGame((s) => s.encounterFieldIds);

    const menu = useGame((s) => s.battleMenu);
    const subMenu = useGame((s) => s.battleSubMenu);
    const idx = useGame((s) => s.battleIndex);
    const subIdx = useGame((s) => s.subMenuIndex);

    const confirmAt = useGame((s) => s.confirmSelectionAt);
    const selectSkill = useGame((s) => s.selectSkill);
    const selectItem = useGame((s) => s.selectItem);

    // enemies가 존재하는 phase에서만 접근 (idle·defeat 제외)
    const hasEnemies = combat.phase !== "idle" && combat.phase !== "defeat";
    const activeCombat = hasEnemies ? (combat as unknown as ActiveCombat) : null;

    const currentId = turnQueue[currentTurn];
    const activeChar = party.find((c) => c.id === currentId);

    const currentCharacter = party.find((c) => c.id === currentId);
    const currentEnemy = activeCombat
        ? activeCombat.enemies.find((e) => e.id === currentId)
        : null;

    const isPlayerTurn = !!currentCharacter;
    const turnName = currentCharacter?.name || currentEnemy?.name || "???";

    const handleRetry = () => {
        const state = useGame.getState();

        if (state.battleStartPartyState) {
            useGame.setState({
                player: {
                    ...state.player,
                    party: state.battleStartPartyState.map((c) => ({ ...c })),
                },
            });
        }

        if (encounterFieldIds && encounterFieldIds.length > 0) {
            const enemies = (combat as unknown as ActiveCombat).enemies ?? [];

            if (enemies.length === 1) {
                const enemy = enemies[0];
                const template = enemy.name?.toLowerCase().includes("orc")
                    ? "orc"
                    : enemy.name?.toLowerCase().includes("slime")
                    ? "slime"
                    : "mage";

                startCombat({ template, fieldId: encounterFieldIds[0] });
            } else {
                const group = enemies.map((enemy, i) => {
                    const template = enemy.name?.toLowerCase().includes("orc")
                        ? "orc"
                        : enemy.name?.toLowerCase().includes("slime")
                        ? "slime"
                        : "mage";
                    return { template, fieldId: encounterFieldIds[i] };
                });

                startCombat({ group });
            }
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            // 항상 최신 상태를 직접 읽어 클로저 의존성 제거
            const gs = useGame.getState();
            const phase = gs.combat.phase;

            if (phase === "playerQTE") {
                if (k === "f" || e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    gs.qteTap();
                }
                return;
            }

            if (phase === "targetSelect") {
                const pending = (gs.combat as any).pending;
                const isAllyTarget =
                    ("kind" in pending && pending.kind === "item") ||
                    (pending.type === "skill" &&
                        pending.skillId &&
                        (SKILLS[pending.skillId]?.type === "heal" ||
                            SKILLS[pending.skillId]?.type === "buff"));

                if (k === "a" || k === "arrowleft") {
                    gs.moveTargetIndex(isAllyTarget ? 1 : -1);
                } else if (k === "d" || k === "arrowright") {
                    gs.moveTargetIndex(isAllyTarget ? -1 : 1);
                } else if (k === "f" || k === "enter") {
                    gs.confirmTarget();
                } else if (k === "escape") {
                    e.preventDefault();
                    gs.cancelTargeting();
                }
                return;
            }

            if (phase === "playerMenu") {
                const { battleMenu, battleIndex } = gs;
                if (k === "w" || k === "arrowup") gs.moveBattleIndex(-1);
                else if (k === "s" || k === "arrowdown") gs.moveBattleIndex(1);
                else if (k === "f" || k === "enter") {
                    if (battleMenu[battleIndex] === "Attack") {
                        gs.executeAttack();
                    } else {
                        gs.confirmSelection();
                    }
                }
            } else if (phase === "skillMenu") {
                const { battleSubMenu, subMenuIndex } = gs;
                if (k === "w" || k === "arrowup") gs.moveSubMenuIndex(-1);
                else if (k === "s" || k === "arrowdown") gs.moveSubMenuIndex(1);
                else if (k === "f" || k === "enter") {
                    if (battleSubMenu[subMenuIndex]) gs.selectSkill(battleSubMenu[subMenuIndex]);
                } else if (k === "escape") {
                    e.preventDefault();
                    gs.backToMenu();
                }
            } else if (phase === "itemMenu") {
                const { battleSubMenu, subMenuIndex } = gs;
                if (k === "w" || k === "arrowup") gs.moveSubMenuIndex(-1);
                else if (k === "s" || k === "arrowdown") gs.moveSubMenuIndex(1);
                else if (k === "f" || k === "enter") {
                    if (battleSubMenu[subMenuIndex]) gs.selectItem(battleSubMenu[subMenuIndex]);
                } else if (k === "escape") {
                    e.preventDefault();
                    gs.backToMenu();
                }
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    // 마운트 시 한 번만 등록 - 항상 getState()로 최신 값을 읽음
    }, []);

    return (
        <>
            {/* 승리 UI */}
            {combat.phase === "victory" && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50">
                    <div className="bg-black/90 border-4 border-yellow-500 rounded-2xl p-8 text-center max-w-md">
                        <div className="text-6xl mb-6">🏆</div>
                        <div className="text-4xl font-bold text-yellow-400 mb-4">
                            VICTORY!
                        </div>
                        <div className="text-gray-300 mb-6">
                            All enemies defeated!
                        </div>

                        {/* 보상 표시 */}
                        {(() => {
                            const rewards = (combat as any).rewards;
                            if (!rewards) return null;

                            return (
                                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                                    <div className="text-lg font-semibold text-white mb-3">
                                        Rewards
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Experience:</span>
                                            <span className="text-blue-400">+{rewards.exp} XP</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Gold:</span>
                                            <span className="text-yellow-400">+{rewards.gold} G</span>
                                        </div>
                                        {rewards.items && rewards.items.length > 0 && (
                                            <div className="border-t border-gray-700 pt-2 mt-2">
                                                <div className="text-gray-400 mb-2">Items:</div>
                                                {rewards.items.map((itemId: string, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="flex justify-between text-green-400"
                                                    >
                                                        <span>• {itemId.replace(/_/g, " ")}</span>
                                                        <span>x1</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        <button
                            onClick={() => exitBattle()}
                            className="w-full px-6 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-semibold transition"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* 패배 UI */}
            {combat.phase === "defeat" && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50">
                    <div className="bg-black/90 border-4 border-red-600 rounded-2xl p-8 text-center max-w-md">
                        <div className="text-6xl mb-6">💀</div>
                        <div className="text-4xl font-bold text-red-400 mb-4">
                            DEFEAT
                        </div>
                        <div className="text-gray-300 mb-8">
                            Your party has been defeated...
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={handleRetry}
                                className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                            >
                                다시하기
                            </button>
                            <button
                                onClick={() => exitBattle()}
                                className="w-full px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition"
                            >
                                나가기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeCombat &&
                combat.phase !== "entering" &&
                combat.phase !== "defeat" &&
                combat.phase !== "victory" && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
                        <div
                            className={`px-6 py-3 rounded-xl border-2 backdrop-blur ${
                                isPlayerTurn
                                    ? "bg-blue-900/80 border-blue-400"
                                    : "bg-red-900/80 border-red-400"
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-xs text-gray-300 mb-1">
                                    CURRENT TURN
                                </div>
                                <div
                                    className={`text-xl font-bold ${
                                        isPlayerTurn
                                            ? "text-blue-200"
                                            : "text-red-200"
                                    }`}
                                >
                                    {currentCharacter?.portrait || "👹"}{" "}
                                    {turnName}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {activeCombat &&
                combat.phase !== "entering" &&
                combat.phase !== "defeat" &&
                combat.phase !== "victory" && (
                    <div className="absolute top-4 right-4">
                        <div className="bg-black/70 border border-gray-600 rounded-xl p-3">
                            <div className="text-xs text-gray-400 mb-2">
                                Turn Order
                            </div>
                            <div className="flex gap-1">
                                {turnQueue.slice(0, 5).map((id, i) => {
                                    const char = party.find((c) => c.id === id);
                                    const enemy = activeCombat.enemies.find((e) => e.id === id);
                                    const isCurrent = i === currentTurn;
                                    const isDead = char
                                        ? (char.stats?.hp ?? 1) <= 0
                                        : enemy
                                        ? (enemy.stats?.hp ?? 1) <= 0
                                        : false;

                                    return (
                                        <div
                                            key={id}
                                            className={`w-8 h-8 rounded flex items-center justify-center text-sm border-2 ${
                                                isCurrent
                                                    ? "border-yellow-400 bg-yellow-600/50"
                                                    : "border-gray-600 bg-gray-800/50"
                                            } ${isDead ? "opacity-30" : ""}`}
                                        >
                                            {char?.portrait || "👹"}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

            {combat.phase === "playerMenu" && activeChar && (
                <div className="absolute left-[6%] top-1/2 -translate-y-1/2">
                    <div className="bg-black/70 border border-gray-600 rounded-2xl p-4 w-64">
                        <div className="text-white font-semibold mb-3">
                            {activeChar.name}
                        </div>
                        <div className="space-y-2">
                            {menu.map((m, i) => (
                                <button
                                    key={m}
                                    onClick={() => {
                                        if (m === "Attack") {
                                            useGame.getState().executeAttack();
                                        } else {
                                            confirmAt(i);
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-2 rounded-lg border ${
                                        i === idx
                                            ? "bg-blue-600/80 text-white border-blue-400"
                                            : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-gray-400 mt-3">
                            W/S 선택 · F/Enter 확인
                        </div>
                    </div>
                </div>
            )}

            {combat.phase === "skillMenu" && activeChar && (
                <div className="absolute left-[16%] top-1/2 -translate-y-1/2 flex gap-4">
                    <div className="bg-black/70 border border-purple-600 rounded-2xl p-4 w-72 max-h-96 overflow-y-auto">
                        <div className="text-white font-semibold mb-3">
                            Skills
                        </div>
                        <div className="space-y-2">
                            {subMenu.map((label, i) => {
                                const skillName = label.split("  [")[0];
                                const skill = Object.values(SKILLS).find(
                                    (s) => s.name === skillName
                                );
                                const canAfford = skill
                                    ? activeChar.ether >= skill.etherCost
                                    : true;

                                return (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            if (canAfford && label)
                                                selectSkill(label);
                                        }}
                                        disabled={!canAfford}
                                        className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                                            i === subIdx
                                                ? canAfford
                                                    ? "bg-purple-600/80 text-white border-purple-400"
                                                    : "bg-gray-700/50 text-gray-500 border-gray-600"
                                                : canAfford
                                                ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                                                : "bg-gray-900/50 text-gray-600 border-gray-700 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{skillName}</span>
                                            <span
                                                className={`text-xs ${
                                                    canAfford
                                                        ? "text-cyan-400"
                                                        : "text-red-400"
                                                }`}
                                            >
                                                [{skill?.etherCost || 0} ETH]
                                            </span>
                                        </div>
                                        {!canAfford && (
                                            <div className="text-xs text-red-400 mt-1">
                                                Not enough Ether
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="text-xs text-gray-400 mt-3">
                            W/S 선택 · F/Enter 사용 · ESC 뒤로
                        </div>
                    </div>

                    <div className="bg-black/70 border border-purple-600 rounded-2xl p-4 w-80">
                        <div className="text-white font-semibold mb-3">
                            Skill Details
                        </div>
                        {(() => {
                            const selectedLabel = subMenu[subIdx];
                            if (!selectedLabel)
                                return (
                                    <div className="text-gray-500 text-sm">
                                        No skill selected
                                    </div>
                                );

                            const skillName = selectedLabel.split("  [")[0];
                            const skill = Object.values(SKILLS).find(
                                (s) => s.name === skillName
                            );

                            if (!skill)
                                return (
                                    <div className="text-gray-500 text-sm">
                                        Skill not found
                                    </div>
                                );

                            return (
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-purple-300 text-lg font-bold">
                                            {skill.name}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {skill.type === "physical"
                                                ? "⚔️ Physical"
                                                : skill.type === "magic"
                                                ? "✨ Magic"
                                                : skill.type === "heal"
                                                ? "💚 Heal"
                                                : "🛡️ Buff"}
                                            {skill.element && ` • ${skill.element}`}
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-300">
                                        {skill.description}
                                    </div>

                                    <div className="border-t border-gray-700 pt-3 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Damage:</span>
                                            <span
                                                className={
                                                    skill.damage < 0
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                }
                                            >
                                                {skill.damage < 0
                                                    ? `+${Math.abs(skill.damage)}`
                                                    : skill.damage}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Ether Cost:</span>
                                            <span className="text-cyan-400">
                                                {skill.etherCost}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Target:</span>
                                            <span className="text-yellow-400">
                                                {skill.targetType === "single"
                                                    ? "Single"
                                                    : skill.targetType === "all"
                                                    ? "All"
                                                    : "Self"}
                                            </span>
                                        </div>

                                        {skill.statusEffect && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Effect:</span>
                                                <span className="text-orange-400">
                                                    {skill.statusEffect.type} (
                                                    {skill.statusEffect.duration} turns)
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-700 pt-3">
                                        <div className="text-xs text-gray-400">
                                            Current Ether:
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            {Array.from({ length: 9 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-3 h-3 ${
                                                        i < activeChar.ether
                                                            ? "bg-cyan-400"
                                                            : "bg-gray-700"
                                                    }`}
                                                    style={{ transform: "rotate(45deg)" }}
                                                />
                                            ))}
                                            <span className="text-cyan-400 ml-2">
                                                {activeChar.ether}/9
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {combat.phase === "itemMenu" && (
                <div className="absolute left-[16%] top-1/2 -translate-y-1/2">
                    <div className="bg-black/70 border border-emerald-600 rounded-2xl p-4 w-72 max-h-64 overflow-y-auto">
                        <div className="text-white font-semibold mb-3">Items</div>
                        <div className="space-y-2">
                            {subMenu.length === 0 ? (
                                <div className="text-gray-400 text-sm px-2 py-6 text-center">
                                    No usable items.
                                </div>
                            ) : (
                                subMenu.map((label, i) => (
                                    <button
                                        key={label}
                                        onClick={() => label && selectItem(label)}
                                        className={`w-full text-left px-4 py-2 rounded-lg border ${
                                            i === subIdx
                                                ? "bg-emerald-600/80 text-white border-emerald-400"
                                                : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="text-xs text-gray-400 mt-3">
                            W/S 선택 · F/Enter 사용 · ESC 뒤로
                        </div>
                    </div>
                </div>
            )}

            {combat.phase === "targetSelect" && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                    <div className="bg-black/80 border border-yellow-600 rounded-2xl p-4 text-center">
                        <div className="text-yellow-200 font-semibold mb-2">
                            Choose Target
                        </div>
                        <div className="text-xs text-gray-400">
                            A/D: 타겟 변경 · F/Enter: 확정 · ESC: 취소
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute left-4 bottom-4 pointer-events-none">
                <div className="bg-black/70 border border-white/15 rounded-xl px-3 py-2 text-xs text-gray-200">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 bg-red-500 rounded-sm" />
                        <span>HP</span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span
                            className="inline-block w-3 h-3"
                            style={{ transform: "rotate(45deg)", background: "#22d3ee" }}
                        />
                        <span>ETH</span>
                    </div>
                </div>
            </div>
        </>
    );
}
