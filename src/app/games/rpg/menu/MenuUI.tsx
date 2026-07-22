// rpg/menu/MenuUI.tsx
import { useEffect, useMemo, useState } from "react";
import { useGame } from "../presenter/useGameStore";
import { EQUIPMENT, SKILLS } from "../data/gameData";
import type { Character, Equipment, Player, Stats } from "../types/RpgTypes";
import { ACHIEVEMENTS } from "../data/achievementData";
import { SIDE_QUESTS } from "../data/questData";
import { etherBonus } from "../presenter/gameStoreHelpers";
import { CodexPane } from "./CodexPane";
import { JournalPane } from "./JournalPane";

/* ─────────────────────────── 공용 상수 ─────────────────────────── */

const GOLD = "#c9a86a";
const IVORY = "#efe6d0";
const MUTED = "#8b8474";
// 한글 세리프 렌더링: font-serif(ui-serif)는 한글에서 산세리프로 폴백되는 환경이 많다
const SERIF = 'Georgia, "Times New Roman", "Noto Serif KR", serif';

const RARITY_COLOR: Record<Equipment["rarity"], string> = {
    common: "#9ca3af",
    rare: "#7dd3fc",
    epic: "#c084fc",
    legendary: "#f5c96b",
};

const RARITY_LABEL: Record<Equipment["rarity"], string> = {
    common: "일반",
    rare: "희귀",
    epic: "영웅",
    legendary: "전설",
};

type EquipSlot = "weapon" | "armor" | "accessory";

const SLOT_LABEL: Record<EquipSlot, string> = {
    weapon: "무기",
    armor: "방어구",
    accessory: "장신구",
};

const SLOT_ICON: Record<EquipSlot, string> = {
    weapon: "⚔️",
    armor: "🛡️",
    accessory: "💍",
};

const STAT_ABBR: Record<string, string> = {
    hp: "HP",
    maxHp: "HP",
    mp: "MP",
    // maxMp는 원값을 노출하지 않고 "시작 에테르" 보너스로만 의미를 갖는다 (MP→에테르 연계)
    maxMp: "시작에테르",
    atk: "ATK",
    def: "DEF",
    speed: "SPD",
    luck: "LCK",
};

const STAT_ORDER = ["maxHp", "maxMp", "atk", "def", "speed", "luck", "hp", "mp"];

const FORMATION_OPTIONS: Array<{ key: Player["formation"]; label: string }> = [
    { key: "front", label: "돌격" },
    { key: "balanced", label: "균형" },
    { key: "back", label: "수비" },
];

const SKILL_TYPE_LABEL: Record<string, string> = {
    physical: "물리",
    magic: "마법",
    heal: "회복",
    buff: "버프",
};

/** 소모품/재료 — EQUIPMENT 에 없는 아이템 표시 정보 */
const CONSUMABLES: Record<string, { name: string; effect: string }> = {
    health_potion: { name: "회복 물약", effect: "HP +50" },
    mana_potion: { name: "마나 물약", effect: "에테르 +3" },
    ether_elixir: { name: "에테르 정수", effect: "전원 에테르 +2" },
    war_elixir: { name: "용맹의 비약", effect: "전투 중 공격 +20%" },
    guard_elixir: { name: "수호의 비약", effect: "전투 중 방어 +20%" },
    revive_elixir: { name: "부활의 정수", effect: "쓰러진 아군 부활 (HP 50%)" },
    purify_elixir: { name: "정화의 정수", effect: "파티 전원 해로운 효과 제거" },
    blast_elixir: { name: "폭염 정수", effect: "적 전체 60 피해" },
    frost_elixir: { name: "서리 정수", effect: "적 전체 빙결 1턴" },
    swift_elixir: { name: "신속의 비약", effect: "사용자 속도 +10 (99턴)" },
    vital_elixir: { name: "활력의 비약", effect: "사용자 매 턴 HP 8 회복 (4턴)" },
};

/** 전투 중에만 사용 가능한 비약 — bagSlice.useItem 은 이 아이템들에 필드 효과를 정의하지 않으므로
 *  필드 인벤토리에서 사용하면 무효 소모(수량만 차감)된다. 배틀 전용 UI 에서만 사용 버튼 활성화. */
const BATTLE_ONLY_CONSUMABLES = new Set([
    "ether_elixir",
    "war_elixir",
    "guard_elixir",
    "revive_elixir",
    "purify_elixir",
    "blast_elixir",
    "frost_elixir",
    "swift_elixir",
    "vital_elixir",
]);

const MATERIALS: Record<string, { name: string }> = {
    herb: { name: "약초" },
    slime_gel: { name: "슬라임 젤" },
    orc_tusk: { name: "오크 송곳니" },
    mana_crystal: { name: "마나 수정" },
    monster_core: { name: "마물 결정" },
    golden_herb: { name: "황금 약초" },
    fish_common: { name: "생선" },
    fish_rare: { name: "월광어" },
    kite: { name: "연" },
    clam: { name: "조개" },
    sea_salt: { name: "바닷소금" },
    wind_flower: { name: "바람꽃" },
    forest_mushroom: { name: "숲버섯" },
    tree_sap: { name: "나무수액" },
    frost_moss: { name: "서리이끼" },
    iron_ore: { name: "철광석" },
    silver_ore: { name: "은광석" },
    reed: { name: "갈대" },
    lotus: { name: "연꽃" },
    driftwood: { name: "유목" },
    silver_trout: { name: "은빛송어" },
    coral_fish: { name: "산호어" },
    wind_trout: { name: "바람송어" },
    ice_fish: { name: "빙어" },
    deep_fish: { name: "심연어" },
    gold_carp: { name: "황금잉어" },
    dark_crystal: { name: "어둠 수정" },
};

type BagTab = "equipment" | "consumable" | "material" | "codex" | "journal";

const TAB_LABEL: Record<BagTab, string> = {
    equipment: "장비",
    consumable: "소모품",
    material: "재료",
    codex: "도감",
    journal: "일지",
};

/* ─────────────────────────── 헬퍼 ─────────────────────────── */

function categoryOf(id: string): BagTab {
    if (EQUIPMENT[id]) return "equipment";
    if (CONSUMABLES[id]) return "consumable";
    return "material";
}

function displayName(id: string): string {
    return (
        EQUIPMENT[id]?.name ??
        CONSUMABLES[id]?.name ??
        MATERIALS[id]?.name ??
        id.replace(/_/g, " ")
    );
}

function statVal(stats: Partial<Stats> | undefined, key: string): number {
    if (!stats) return 0;
    return (stats as Record<string, number | undefined>)[key] ?? 0;
}

function statSummary(eq: Equipment): string {
    return STAT_ORDER.filter((k) => statVal(eq.stats, k) !== 0)
        .map((k) => {
            const v = statVal(eq.stats, k);
            // maxMp는 원값이 아니라 시작 에테르 환산치로 표기 (30당 +1)
            if (k === "maxMp") {
                const b = etherBonus(Math.abs(v)) * Math.sign(v);
                return b === 0 ? "" : `${STAT_ABBR[k]} ${b > 0 ? `+${b}` : b}`;
            }
            return `${STAT_ABBR[k] ?? k.toUpperCase()} ${v > 0 ? `+${v}` : v}`;
        })
        .filter(Boolean)
        .join(" · ");
}

/** 장착 시 스탯 변화(현재 장비 대비) */
function equipDeltas(
    next: Equipment,
    current?: Equipment
): Array<{ key: string; delta: number }> {
    return STAT_ORDER.map((key) => {
        const rawDelta = statVal(next.stats, key) - statVal(current?.stats, key);
        let delta = rawDelta;
        // maxMp 델타는 시작 에테르 환산치로 (원값 노출 금지) — 원값은 rawDelta로 별도 보존
        if (key === "maxMp") delta = etherBonus(Math.abs(rawDelta)) * Math.sign(rawDelta);
        return { key, delta, rawDelta };
    }).filter((d) => d.delta !== 0 || d.rawDelta !== 0);
}

/** 열림 애니메이션 (opacity + 살짝 translate) */
function useEntered(open: boolean): boolean {
    const [entered, setEntered] = useState(false);
    useEffect(() => {
        if (!open) {
            setEntered(false);
            return;
        }
        const t = window.setTimeout(() => setEntered(true), 20);
        return () => window.clearTimeout(t);
    }, [open]);
    return entered;
}

/* ─────────────────────────── 소형 컴포넌트 ─────────────────────────── */

function Hairline({ className = "" }: { className?: string }) {
    return (
        <div
            className={`h-px w-full bg-gradient-to-r from-transparent via-[#c9a86a]/40 to-transparent ${className}`}
        />
    );
}

/** 섹션 라벨 + 뒤로 흐르는 헤어라인 */
function SectionLabel({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <span
                className="text-[10px] uppercase tracking-[0.35em]"
                style={{ color: MUTED }}
            >
                {children}
            </span>
            <span className="h-px flex-1 bg-[#c9a86a]/[0.13]" />
        </div>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd
            className="inline-flex min-w-[1.4rem] items-center justify-center border border-[#c9a86a]/30 px-1.5 py-0.5 text-[10px] not-italic"
            style={{ color: IVORY }}
        >
            {children}
        </kbd>
    );
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
    const pct =
        maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
    return (
        <div className="h-[3px] w-full bg-white/10">
            <div
                className="h-full transition-all duration-300"
                style={{
                    width: `${pct}%`,
                    background: pct <= 25 ? "#b45d51" : "#cfc6ad",
                }}
            />
        </div>
    );
}

function EtherDots({
    ether,
    maxEther,
    size = 5,
}: {
    ether: number;
    maxEther: number;
    size?: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-[3px]">
            {Array.from({ length: Math.max(maxEther, 0) }).map((_, i) => (
                <span
                    key={i}
                    className="rounded-full"
                    style={{
                        width: size,
                        height: size,
                        background: i < ether ? GOLD : "rgba(255,255,255,0.12)",
                        boxShadow:
                            i < ether
                                ? "0 0 4px rgba(201,168,106,0.55)"
                                : "none",
                    }}
                />
            ))}
        </div>
    );
}

function DeltaBadge({ delta }: { delta: number }) {
    return (
        <span
            className={`text-[11px] tabular-nums ${
                delta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
        >
            {delta > 0 ? `+${delta}` : delta}
        </span>
    );
}

function StatTile({
    label,
    value,
    delta,
}: {
    label: string;
    value: string;
    delta?: number;
}) {
    return (
        <div className="border border-white/[0.06] px-3 py-2">
            <div
                className="text-[9px] uppercase tracking-[0.3em]"
                style={{ color: MUTED }}
            >
                {label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
                <span
                    className="text-base tabular-nums"
                    style={{ color: IVORY }}
                >
                    {value}
                </span>
                {delta !== undefined && delta !== 0 && (
                    <DeltaBadge delta={delta} />
                )}
            </div>
        </div>
    );
}

/** 4모서리 골드 코너 틱 */
function CornerTicks() {
    const base = "pointer-events-none absolute h-4 w-4 border-[#c9a86a]/50";
    return (
        <>
            <span className={`${base} left-0 top-0 border-l border-t`} />
            <span className={`${base} right-0 top-0 border-r border-t`} />
            <span className={`${base} bottom-0 left-0 border-b border-l`} />
            <span className={`${base} bottom-0 right-0 border-b border-r`} />
        </>
    );
}

const OVERLAY_BG: React.CSSProperties = {
    background:
        "radial-gradient(120% 90% at 50% 42%, rgba(15,16,21,0.96) 0%, rgba(8,8,11,0.985) 55%, rgba(2,2,3,1) 100%)",
};

/* ═══════════════════════════ 인벤토리 ═══════════════════════════ */

// 닫힘 시 무거운 구독(killCounts/flags/bag)이 아예 마운트되지 않도록 래퍼로 게이트
export function InventoryPanel() {
    const isOpen = useGame((s) => s.ui.inventoryOpen);
    if (!isOpen) return null;
    return <InventoryPanelInner />;
}

function InventoryPanelInner() {
    const isOpen = useGame((s) => s.ui.inventoryOpen);
    const bag = useGame((s) => s.bag);
    const party = useGame((s) => s.player.party);
    const gold = useGame((s) => s.player.gold);
    const useItem = useGame((s) => s.useItem);
    const equipItem = useGame((s) => s.equipItem);
    const unequipItem = useGame((s) => s.unequipItem);
    const getAvailableSkills = useGame((s) => s.getAvailableSkills);
    const toggleInventory = useGame((s) => s.toggleInventory);
    const formation = useGame((s) => s.player.formation);
    const setFormation = useGame((s) => s.setFormation);
    const killCounts = useGame((s) => s.killCounts);
    const flags = useGame((s) => s.flags);

    const [charIdx, setCharIdx] = useState(0);
    const [tab, setTab] = useState<BagTab>("equipment");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const entered = useEntered(isOpen);

    // 닫을 때 아이템 선택 초기화 — 재오픈 시 이전 선택이 남지 않게
    useEffect(() => {
        if (!isOpen) setSelectedItemId(null);
    }, [isOpen]);

    const safeIdx = Math.min(charIdx, Math.max(party.length - 1, 0));
    const selectedChar: Character | undefined =
        party.length > 0 ? party[safeIdx] : undefined;

    const tabCounts = useMemo(() => {
        const counts: Record<BagTab, number> = {
            equipment: 0,
            consumable: 0,
            material: 0,
            // 도감 탭 카운트는 아이템 개수가 아니라 업적 달성 수
            codex: ACHIEVEMENTS.filter((a) => a.check({ killCounts, flags })).length,
            // 일지 탭 카운트 = 진행 중 + 완료 사이드 퀘스트 수
            journal: SIDE_QUESTS.filter(
                (q) => flags[`quest_${q.id}`] || flags[`quest_${q.id}_done`]
            ).length,
        };
        for (const it of bag) counts[categoryOf(it.id)] += 1;
        return counts;
    }, [bag, killCounts, flags]);

    const tabItems = useMemo(
        () => bag.filter((it) => categoryOf(it.id) === tab),
        [bag, tab]
    );

    // 파생 선택 상태 — 가방에서 사라지면(장착/소진) 자동으로 해제됨
    const selectedItem = selectedItemId
        ? bag.find((b) => b.id === selectedItemId) ?? null
        : null;
    const selectedEquip: Equipment | undefined = selectedItem
        ? EQUIPMENT[selectedItem.id]
        : undefined;

    const currentInSlot: Equipment | undefined =
        selectedEquip && selectedChar
            ? (() => {
                  const curId = selectedChar.equipment[selectedEquip.type];
                  return curId ? EQUIPMENT[curId] : undefined;
              })()
            : undefined;

    const deltas = useMemo(
        () => (selectedEquip ? equipDeltas(selectedEquip, currentInSlot) : []),
        [selectedEquip, currentInSlot]
    );

    const deltaMap = useMemo(() => {
        const m: Record<string, number> = {};
        for (const d of deltas) m[d.key] = d.delta;
        return m;
    }, [deltas]);

    // maxMp 원값 델타(시작 에테르 재계산용 — 표시용 deltaMap은 환산치)
    const rawDeltaMap = useMemo(() => {
        const m: Record<string, number> = {};
        for (const d of deltas) m[d.key] = (d as { rawDelta?: number }).rawDelta ?? d.delta;
        return m;
    }, [deltas]);

    const skills = selectedChar ? getAvailableSkills(selectedChar) : [];
    const innateSkills = new Set(selectedChar?.skills ?? []);

    if (!isOpen) return null;

    const hp = selectedChar?.stats?.hp ?? 0;
    const maxHp = selectedChar?.stats?.maxHp ?? 0;
    const maxMp = selectedChar?.stats?.maxMp ?? 0;
    // MP→에테르 연계: mp/maxMp 원값은 노출하지 않고 전투 시작 에테르 보너스(+n)로만 표시한다
    const startEtherBonus = etherBonus(maxMp);
    // 이중 환산 방지 — 델타는 원값(rawDelta) 기준으로 기저 대비 차이를 계산
    const startEtherDelta =
        rawDeltaMap["maxMp"] !== undefined
            ? etherBonus(maxMp + rawDeltaMap["maxMp"]) - startEtherBonus
            : undefined;

    const consumableDisabled =
        !selectedChar ||
        (!!selectedItem && BATTLE_ONLY_CONSUMABLES.has(selectedItem.id)) ||
        (selectedItem?.id === "health_potion" && hp >= maxHp) ||
        (selectedItem?.id === "mana_potion" &&
            (selectedChar?.ether ?? 0) >= (selectedChar?.maxEther ?? 0));

    return (
        <div
            className={`absolute inset-0 z-50 flex items-center justify-center font-serif transition-opacity duration-300 ${
                entered ? "opacity-100" : "opacity-0"
            }`}
            style={{ ...OVERLAY_BG, fontFamily: SERIF }}
        >
            <div
                className={`relative flex h-[min(700px,90vh)] w-[min(1200px,94vw)] flex-col px-8 py-6 transition-all duration-300 ${
                    entered
                        ? "translate-y-0 opacity-100"
                        : "translate-y-3 opacity-0"
                }`}
            >
                <CornerTicks />

                {/* ── 헤더 ── */}
                <header className="flex items-end justify-between pb-4">
                    <div>
                        <div
                            className="text-[10px] uppercase tracking-[0.45em]"
                            style={{ color: GOLD }}
                        >
                            Expedition 33
                        </div>
                        <h1
                            className="mt-1 text-3xl tracking-[0.35em]"
                            style={{ color: IVORY }}
                        >
                            소지품
                        </h1>
                    </div>
                    <div className="flex items-end gap-6">
                        <div className="text-right">
                            <div
                                className="text-[9px] uppercase tracking-[0.35em]"
                                style={{ color: MUTED }}
                            >
                                보유 골드
                            </div>
                            <div
                                className="text-xl tabular-nums"
                                style={{ color: GOLD }}
                            >
                                {gold.toLocaleString()} G
                            </div>
                        </div>
                        <button
                            onClick={() => toggleInventory()}
                            className="border border-[#c9a86a]/25 px-3 py-1.5 text-[11px] tracking-[0.25em] text-[#efe6d0]/70 transition-colors hover:border-[#c9a86a]/60 hover:text-[#efe6d0]"
                        >
                            닫기
                        </button>
                    </div>
                </header>
                <Hairline />

                {/* ── 본문 3단 ── */}
                <div className="mt-5 grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)_320px] gap-6">
                    {/* 좌: 파티 */}
                    <aside className="flex min-h-0 flex-col">
                        <SectionLabel className="mb-3">원정대</SectionLabel>
                        <div className="mb-3 grid grid-cols-3 gap-1.5">
                            {FORMATION_OPTIONS.map(({ key, label }) => {
                                const active = formation === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setFormation(key)}
                                        className={`border px-2 py-1.5 text-center text-[10px] tracking-[0.15em] transition-colors ${
                                            active
                                                ? "border-[#c9a86a]/60 bg-[#c9a86a]/[0.1] text-[#efe6d0]"
                                                : "border-white/[0.08] text-white/40 hover:border-[#c9a86a]/30"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                            {party.map((char, i) => {
                                const active = i === safeIdx;
                                const chp = char.stats?.hp ?? 0;
                                const cmax = char.stats?.maxHp ?? 0;
                                return (
                                    <button
                                        key={char.id}
                                        onClick={() => setCharIdx(i)}
                                        className={`border px-3 py-3 text-left transition-colors ${
                                            active
                                                ? "border-[#c9a86a]/60 bg-[#c9a86a]/[0.06]"
                                                : "border-white/[0.06] hover:border-[#c9a86a]/30"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center border border-[#c9a86a]/25 text-xl">
                                                {char.portrait}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span
                                                        className="truncate text-sm"
                                                        style={{
                                                            color: active
                                                                ? IVORY
                                                                : "#c9c2af",
                                                        }}
                                                    >
                                                        {char.name}
                                                    </span>
                                                    <span
                                                        className="text-[10px] tracking-widest"
                                                        style={{ color: MUTED }}
                                                    >
                                                        Lv.{char.level}
                                                    </span>
                                                </div>
                                                <div className="mt-1.5">
                                                    <HpBar
                                                        hp={chp}
                                                        maxHp={cmax}
                                                    />
                                                </div>
                                                <div className="mt-1.5 flex items-center justify-between">
                                                    <EtherDots
                                                        ether={char.ether}
                                                        maxEther={
                                                            char.maxEther
                                                        }
                                                        size={4}
                                                    />
                                                    <span
                                                        className="text-[10px] tabular-nums"
                                                        style={{ color: MUTED }}
                                                    >
                                                        {chp}/{cmax}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* 중: 캐릭터 상세 */}
                    <section className="min-h-0 overflow-y-auto border-x border-white/[0.05] px-6">
                        {!selectedChar ? (
                            <div
                                className="flex h-full items-center justify-center text-sm tracking-widest"
                                style={{ color: MUTED }}
                            >
                                파티원이 없습니다
                            </div>
                        ) : (
                            <>
                                {/* 이름/레벨/경험치 */}
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h2
                                            className="text-2xl tracking-[0.2em]"
                                            style={{ color: IVORY }}
                                        >
                                            {selectedChar.name}
                                        </h2>
                                        <div
                                            className="mt-1 text-[10px] tracking-[0.3em]"
                                            style={{ color: MUTED }}
                                        >
                                            LV.{selectedChar.level} · EXP{" "}
                                            {selectedChar.exp}/
                                            {selectedChar.expToNext}
                                        </div>
                                    </div>
                                    <div className="text-3xl">
                                        {selectedChar.portrait}
                                    </div>
                                </div>
                                <div className="mt-2 h-[2px] w-full bg-white/[0.07]">
                                    <div
                                        className="h-full"
                                        style={{
                                            width: `${
                                                selectedChar.expToNext > 0
                                                    ? Math.min(
                                                          100,
                                                          (selectedChar.exp /
                                                              selectedChar.expToNext) *
                                                              100
                                                      )
                                                    : 0
                                            }%`,
                                            background: GOLD,
                                        }}
                                    />
                                </div>

                                {/* 스탯 그리드 (+장비 미리보기 델타) */}
                                <div
                                    className="mt-5 text-[10px] uppercase tracking-[0.35em]"
                                    style={{ color: MUTED }}
                                >
                                    능력치
                                    {selectedEquip && (
                                        <span className="ml-2 normal-case tracking-normal text-[#c9a86a]/80">
                                            — {selectedEquip.name} 장착 시 변화
                                            미리보기
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <StatTile
                                        label="체력"
                                        value={`${hp}/${maxHp}`}
                                        delta={deltaMap["maxHp"]}
                                    />
                                    <StatTile
                                        label="시작 에테르"
                                        value={`+${startEtherBonus}`}
                                        delta={startEtherDelta}
                                    />
                                    <StatTile
                                        label="에테르"
                                        value={`${selectedChar.ether}/${selectedChar.maxEther}`}
                                    />
                                    <StatTile
                                        label="공격"
                                        value={`${
                                            selectedChar.stats?.atk ?? 0
                                        }`}
                                        delta={deltaMap["atk"]}
                                    />
                                    <StatTile
                                        label="방어"
                                        value={`${
                                            selectedChar.stats?.def ?? 0
                                        }`}
                                        delta={deltaMap["def"]}
                                    />
                                    <StatTile
                                        label="속도"
                                        value={`${
                                            selectedChar.stats?.speed ?? 0
                                        }`}
                                        delta={deltaMap["speed"]}
                                    />
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <StatTile
                                        label="행운"
                                        value={`${
                                            selectedChar.stats?.luck ?? 0
                                        }`}
                                        delta={deltaMap["luck"]}
                                    />
                                </div>

                                {/* 장비 3슬롯 */}
                                <SectionLabel className="mt-6">
                                    장비
                                </SectionLabel>
                                <div className="mt-2 space-y-2">
                                    {(
                                        [
                                            "weapon",
                                            "armor",
                                            "accessory",
                                        ] as const
                                    ).map((slot) => {
                                        const eqId =
                                            selectedChar.equipment[slot];
                                        const eq = eqId
                                            ? EQUIPMENT[eqId]
                                            : undefined;
                                        const highlight =
                                            selectedEquip?.type === slot;
                                        return (
                                            <div
                                                key={slot}
                                                className={`flex items-center gap-3 border px-3 py-2.5 transition-colors ${
                                                    highlight
                                                        ? "border-[#c9a86a]/50 bg-[#c9a86a]/[0.05]"
                                                        : "border-white/[0.06]"
                                                }`}
                                            >
                                                <span className="w-6 text-center text-sm opacity-80">
                                                    {SLOT_ICON[slot]}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div
                                                        className="text-[9px] uppercase tracking-[0.3em]"
                                                        style={{ color: MUTED }}
                                                    >
                                                        {SLOT_LABEL[slot]}
                                                    </div>
                                                    {eq ? (
                                                        <>
                                                            <div
                                                                className="truncate text-sm"
                                                                style={{
                                                                    color: RARITY_COLOR[
                                                                        eq
                                                                            .rarity
                                                                    ],
                                                                }}
                                                            >
                                                                {eq.name}
                                                            </div>
                                                            <div
                                                                className="text-[10px]"
                                                                style={{
                                                                    color: MUTED,
                                                                }}
                                                            >
                                                                {statSummary(
                                                                    eq
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-white/25">
                                                            — 비어 있음
                                                        </div>
                                                    )}
                                                </div>
                                                {eq && (
                                                    <button
                                                        onClick={() =>
                                                            unequipItem(
                                                                selectedChar.id,
                                                                slot
                                                            )
                                                        }
                                                        className="border border-white/10 px-2.5 py-1 text-[10px] tracking-[0.2em] text-white/50 transition-colors hover:border-[#c9a86a]/50 hover:text-[#efe6d0]"
                                                    >
                                                        해제
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 스킬 */}
                                <SectionLabel className="mt-6">
                                    스킬
                                </SectionLabel>
                                <div className="mb-4 mt-2 space-y-1.5">
                                    {skills.length === 0 ? (
                                        <div
                                            className="py-3 text-center text-xs"
                                            style={{ color: MUTED }}
                                        >
                                            사용 가능한 스킬이 없습니다
                                        </div>
                                    ) : (
                                        skills.map((sk) => (
                                            <div
                                                key={sk.id}
                                                className="flex items-baseline gap-3 border border-white/[0.05] px-3 py-2"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span
                                                            className="text-sm"
                                                            style={{
                                                                color: IVORY,
                                                            }}
                                                        >
                                                            {sk.name}
                                                        </span>
                                                        {!innateSkills.has(
                                                            sk.id
                                                        ) && (
                                                            <span className="border border-[#c9a86a]/40 px-1.5 py-px text-[9px] tracking-widest text-[#c9a86a]">
                                                                장비
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        className="mt-0.5 truncate text-[11px]"
                                                        style={{ color: MUTED }}
                                                    >
                                                        {sk.description}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div
                                                        className="text-[11px] tabular-nums"
                                                        style={{
                                                            color:
                                                                sk.type ===
                                                                "heal"
                                                                    ? "#8fbf9f"
                                                                    : "#c9c2af",
                                                        }}
                                                    >
                                                        {SKILL_TYPE_LABEL[
                                                            sk.type
                                                        ] ?? sk.type}{" "}
                                                        ·{" "}
                                                        {sk.type === "heal"
                                                            ? `회복 ${-sk.damage}`
                                                            : `피해 ${sk.damage}`}
                                                    </div>
                                                    <div
                                                        className="text-[10px]"
                                                        style={{ color: GOLD }}
                                                    >
                                                        에테르 {sk.etherCost}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* 우: 가방 */}
                    <aside className="flex min-h-0 flex-col">
                        {/* 탭 */}
                        <div className="flex items-end gap-1">
                            {(
                                [
                                    "equipment",
                                    "consumable",
                                    "material",
                                    "codex",
                                    "journal",
                                ] as const
                            ).map((t) => {
                                const active = tab === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setTab(t);
                                            setSelectedItemId(null);
                                        }}
                                        className={`flex-1 border-b px-2 pb-2 text-center text-xs tracking-[0.25em] transition-colors ${
                                            active
                                                ? "border-[#c9a86a] text-[#efe6d0]"
                                                : "border-white/10 text-white/40 hover:text-white/70"
                                        }`}
                                    >
                                        {TAB_LABEL[t]}
                                        <span
                                            className="ml-1.5 text-[10px] tabular-nums"
                                            style={{
                                                color: active ? GOLD : MUTED,
                                            }}
                                        >
                                            {tabCounts[t]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 아이템 목록 */}
                        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
                            {tab === "codex" ? (
                                <CodexPane />
                            ) : tab === "journal" ? (
                                <JournalPane />
                            ) : tabItems.length === 0 ? (
                                <div
                                    className="flex flex-1 items-center justify-center text-xs tracking-[0.3em]"
                                    style={{ color: MUTED }}
                                >
                                    비어 있음
                                </div>
                            ) : (
                                tabItems.map((it) => {
                                    const eq = EQUIPMENT[it.id];
                                    const isSel = selectedItemId === it.id;
                                    const nameColor = eq
                                        ? RARITY_COLOR[eq.rarity]
                                        : IVORY;
                                    const icon = eq
                                        ? SLOT_ICON[eq.type]
                                        : CONSUMABLES[it.id]
                                        ? "🧪"
                                        : null;
                                    const sub = eq
                                        ? `${SLOT_LABEL[eq.type]} · ${statSummary(
                                              eq
                                          )}`
                                        : CONSUMABLES[it.id]?.effect ??
                                          "제작 재료";
                                    return (
                                        <button
                                            key={it.id}
                                            onClick={() =>
                                                setSelectedItemId(
                                                    isSel ? null : it.id
                                                )
                                            }
                                            className={`flex items-center gap-2.5 border px-3 py-2 text-left transition-colors ${
                                                isSel
                                                    ? "border-[#c9a86a]/60 bg-[#c9a86a]/[0.06]"
                                                    : "border-white/[0.06] hover:border-[#c9a86a]/30"
                                            }`}
                                        >
                                            <span className="w-5 text-center text-sm">
                                                {icon ?? (
                                                    <span className="text-[10px] text-[#c9a86a]/50">
                                                        ◆
                                                    </span>
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className="truncate text-sm"
                                                    style={{
                                                        color: nameColor,
                                                    }}
                                                >
                                                    {displayName(it.id)}
                                                </div>
                                                <div
                                                    className="truncate text-[10px]"
                                                    style={{ color: MUTED }}
                                                >
                                                    {sub}
                                                </div>
                                            </div>
                                            <span
                                                className="shrink-0 text-[11px] tabular-nums"
                                                style={{ color: MUTED }}
                                            >
                                                ×{it.qty}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* 선택 아이템 상세/액션 */}
                        {selectedItem && (
                            <div className="mt-3 border border-[#c9a86a]/25 px-4 py-3">
                                {selectedEquip ? (
                                    <>
                                        <div className="flex items-baseline justify-between">
                                            <span
                                                className="text-sm"
                                                style={{
                                                    color: RARITY_COLOR[
                                                        selectedEquip.rarity
                                                    ],
                                                }}
                                            >
                                                {selectedEquip.name}
                                            </span>
                                            <span
                                                className="text-[10px] tracking-[0.25em]"
                                                style={{
                                                    color: RARITY_COLOR[
                                                        selectedEquip.rarity
                                                    ],
                                                }}
                                            >
                                                {
                                                    RARITY_LABEL[
                                                        selectedEquip.rarity
                                                    ]
                                                }
                                            </span>
                                        </div>
                                        <div
                                            className="mt-1 text-[10px]"
                                            style={{ color: MUTED }}
                                        >
                                            {SLOT_LABEL[selectedEquip.type]} ·
                                            현재:{" "}
                                            {currentInSlot?.name ?? "없음"}
                                        </div>
                                        {(selectedEquip.skills?.length ?? 0) >
                                            0 && (
                                            <div className="mt-1 text-[10px] text-[#c9a86a]/80">
                                                부여 스킬:{" "}
                                                {selectedEquip.skills
                                                    ?.map(
                                                        (sid) =>
                                                            SKILLS[sid]
                                                                ?.name ?? sid
                                                    )
                                                    .join(", ")}
                                            </div>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                            {deltas.length === 0 ? (
                                                <span
                                                    className="text-[11px]"
                                                    style={{ color: MUTED }}
                                                >
                                                    능력치 변화 없음
                                                </span>
                                            ) : (
                                                deltas.map((d) => (
                                                    <span
                                                        key={d.key}
                                                        className="text-[11px]"
                                                    >
                                                        <span
                                                            style={{
                                                                color: MUTED,
                                                            }}
                                                        >
                                                            {STAT_ABBR[
                                                                d.key
                                                            ] ??
                                                                d.key.toUpperCase()}{" "}
                                                        </span>
                                                        <DeltaBadge
                                                            delta={d.delta}
                                                        />
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        <button
                                            disabled={!selectedChar}
                                            onClick={() => {
                                                if (!selectedChar) return;
                                                equipItem(
                                                    selectedChar.id,
                                                    selectedItem.id
                                                );
                                            }}
                                            className="mt-3 w-full border border-[#c9a86a]/60 py-2 text-xs tracking-[0.4em] text-[#e8d9b0] transition-colors hover:bg-[#c9a86a]/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {selectedChar
                                                ? `${selectedChar.name} 에게 장착`
                                                : "장착"}
                                        </button>
                                    </>
                                ) : CONSUMABLES[selectedItem.id] ? (
                                    <>
                                        <div className="flex items-baseline justify-between">
                                            <span
                                                className="text-sm"
                                                style={{ color: IVORY }}
                                            >
                                                {displayName(selectedItem.id)}
                                            </span>
                                            <span
                                                className="text-[11px]"
                                                style={{ color: GOLD }}
                                            >
                                                {
                                                    CONSUMABLES[
                                                        selectedItem.id
                                                    ].effect
                                                }
                                            </span>
                                        </div>
                                        <div
                                            className="mt-1 text-[10px]"
                                            style={{ color: MUTED }}
                                        >
                                            대상:{" "}
                                            {selectedChar
                                                ? `${selectedChar.name} (HP ${hp}/${maxHp} · 에테르 ${selectedChar.ether}/${selectedChar.maxEther})`
                                                : "없음"}
                                        </div>
                                        <button
                                            disabled={consumableDisabled}
                                            onClick={() => {
                                                if (!selectedChar) return;
                                                useItem(
                                                    selectedItem.id,
                                                    selectedChar.id
                                                );
                                            }}
                                            className="mt-3 w-full border border-[#c9a86a]/60 py-2 text-xs tracking-[0.4em] text-[#e8d9b0] transition-colors hover:bg-[#c9a86a]/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            사용
                                        </button>
                                        {consumableDisabled &&
                                            selectedChar && (
                                                <div
                                                    className="mt-1.5 text-center text-[10px]"
                                                    style={{ color: MUTED }}
                                                >
                                                    {BATTLE_ONLY_CONSUMABLES.has(
                                                        selectedItem.id
                                                    )
                                                        ? "전투 중에만 사용 가능"
                                                        : "이미 가득 찼습니다"}
                                                </div>
                                            )}
                                    </>
                                ) : (
                                    <>
                                        <div
                                            className="text-sm"
                                            style={{ color: IVORY }}
                                        >
                                            {displayName(selectedItem.id)}
                                        </div>
                                        <div
                                            className="mt-1 text-[10px]"
                                            style={{ color: MUTED }}
                                        >
                                            제작에 쓰이는 재료입니다. 상인에게
                                            판매할 수 있습니다.
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </aside>
                </div>

                {/* ── 하단 힌트 ── */}
                <Hairline className="mt-4" />
                <footer className="mt-3 flex items-center justify-between text-[11px]">
                    <div
                        className="flex items-center gap-2"
                        style={{ color: MUTED }}
                    >
                        <Kbd>I</Kbd> 닫기
                        <span className="mx-1 text-[#c9a86a]/40">·</span>
                        <Kbd>ESC</Kbd> 메뉴
                    </div>
                    <div style={{ color: MUTED }}>
                        가방에서 장비를 선택하면 능력치 변화를 미리 볼 수
                        있습니다
                    </div>
                </footer>
            </div>
        </div>
    );
}

/* ═══════════════════════════ 일시 정지 메뉴 ═══════════════════════════ */

export function GameMenu() {
    const isOpen = useGame((s) => s.ui.pauseOpen);
    const party = useGame((s) => s.player.party);
    const gold = useGame((s) => s.player.gold);
    const togglePause = useGame((s) => s.togglePause);
    const closeAll = useGame((s) => s.closeAll);
    const entered = useEntered(isOpen);

    if (!isOpen) return null;

    return (
        <div
            className={`absolute inset-0 z-50 flex items-center justify-center font-serif transition-opacity duration-300 ${
                entered ? "opacity-100" : "opacity-0"
            }`}
            style={{ ...OVERLAY_BG, fontFamily: SERIF }}
        >
            <div
                className={`relative w-[min(480px,92vw)] px-10 py-9 transition-all duration-300 ${
                    entered
                        ? "translate-y-0 opacity-100"
                        : "translate-y-3 opacity-0"
                }`}
            >
                <CornerTicks />

                <div className="text-center">
                    <div
                        className="text-[10px] uppercase tracking-[0.5em]"
                        style={{ color: GOLD }}
                    >
                        Expedition 33
                    </div>
                    <h1
                        className="mt-2 text-3xl tracking-[0.5em]"
                        style={{ color: IVORY }}
                    >
                        메뉴
                    </h1>
                </div>

                <Hairline className="mt-6" />

                <div className="mt-5 flex items-baseline justify-between">
                    <span
                        className="text-[10px] uppercase tracking-[0.35em]"
                        style={{ color: MUTED }}
                    >
                        보유 골드
                    </span>
                    <span
                        className="text-lg tabular-nums"
                        style={{ color: GOLD }}
                    >
                        {gold.toLocaleString()} G
                    </span>
                </div>

                <div
                    className="mt-5 text-[10px] uppercase tracking-[0.35em]"
                    style={{ color: MUTED }}
                >
                    원정대
                </div>
                <div className="mt-2 space-y-2">
                    {party.map((char) => {
                        const hp = char.stats?.hp ?? 0;
                        const maxHp = char.stats?.maxHp ?? 0;
                        return (
                            <div
                                key={char.id}
                                className="border border-white/[0.06] px-3.5 py-2.5"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {char.portrait}
                                    </span>
                                    <span
                                        className="flex-1 text-sm"
                                        style={{ color: IVORY }}
                                    >
                                        {char.name}
                                        <span
                                            className="ml-2 text-[10px] tracking-widest"
                                            style={{ color: MUTED }}
                                        >
                                            Lv.{char.level}
                                        </span>
                                    </span>
                                    <span
                                        className="text-[11px] tabular-nums"
                                        style={{ color: MUTED }}
                                    >
                                        {hp}/{maxHp}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <HpBar hp={hp} maxHp={maxHp} />
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <EtherDots
                                        ether={char.ether}
                                        maxEther={char.maxEther}
                                        size={4}
                                    />
                                    <div className="truncate text-[10px]">
                                        {(
                                            [
                                                "weapon",
                                                "armor",
                                                "accessory",
                                            ] as const
                                        ).map((slot, i) => {
                                            const eqId = char.equipment[slot];
                                            const eq = eqId
                                                ? EQUIPMENT[eqId]
                                                : undefined;
                                            return (
                                                <span key={slot}>
                                                    {i > 0 && (
                                                        <span className="mx-1 text-[#c9a86a]/30">
                                                            ·
                                                        </span>
                                                    )}
                                                    <span
                                                        style={{
                                                            color: eq
                                                                ? RARITY_COLOR[
                                                                      eq.rarity
                                                                  ]
                                                                : "rgba(255,255,255,0.2)",
                                                        }}
                                                    >
                                                        {eq?.name ?? "—"}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 space-y-2">
                    <button
                        onClick={() => togglePause()}
                        className="w-full border border-[#c9a86a]/60 py-2.5 text-xs tracking-[0.45em] text-[#e8d9b0] transition-colors hover:bg-[#c9a86a]/10"
                    >
                        계속하기
                    </button>
                    <button
                        onClick={() => closeAll()}
                        className="w-full border border-white/10 py-2.5 text-xs tracking-[0.45em] text-white/50 transition-colors hover:border-[#c9a86a]/40 hover:text-[#efe6d0]"
                    >
                        모두 닫기
                    </button>
                </div>

                <Hairline className="mt-6" />
                <div
                    className="mt-3 flex items-center justify-center gap-2 text-[11px]"
                    style={{ color: MUTED }}
                >
                    <Kbd>ESC</Kbd> 닫기
                    <span className="mx-1 text-[#c9a86a]/40">·</span>
                    <Kbd>I</Kbd> 인벤토리
                </div>
            </div>
        </div>
    );
}
