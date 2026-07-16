// rpg/utils/persist.ts
import type { SaveData } from "../types/RpgTypes";
import { DEFAULT_PARTY } from "../data/gameData";

// 구버전 세이브 캐릭터 id → 신 id (2026-07 오리지널 리네이밍)
const ID_MIGRATION: Record<string, string> = {
    gustave: "arin",
    maelle: "theo",
    sciel: "lotti",
};

/** 구버전 세이브의 파티 정체성(id/이름/초상화/모델)을 새 메타로 갱신 — 스탯·성장·장비는 보존 */
export function migrateSave(d: SaveData): SaveData {
    const party = d.player.party.map((c) => {
        const newId = ID_MIGRATION[c.id] ?? c.id;
        const base = DEFAULT_PARTY.find((b) => b.id === newId);
        if (!base) return c;
        return {
            ...c,
            id: newId,
            name: base.name,
            portrait: base.portrait,
            modelUrl: base.modelUrl,
        };
    });
    return { ...d, player: { ...d.player, party } };
}

const PREFIX = "rpg-r3f";
const MAX_SLOTS = 3;
const key = (slot: number) => `${PREFIX}:slot:${slot}`;

export function listSaves() {
    if (typeof window === "undefined")
        return Array.from({ length: MAX_SLOTS }, () => null);
    return Array.from({ length: MAX_SLOTS }, (_, i) => {
        try {
            const raw = localStorage.getItem(key(i));
            if (!raw) return null;
            const ts = localStorage.getItem(key(i) + ":ts");
            return { slot: i, updatedAt: ts ? new Date(JSON.parse(ts)) : null };
        } catch {
            return null;
        }
    });
}

export function save(slot: number, data: SaveData) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key(slot), JSON.stringify(data));
    localStorage.setItem(key(slot) + ":ts", JSON.stringify(Date.now()));
}

export function load(slot: number): SaveData | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    return migrateSave(JSON.parse(raw) as SaveData);
}

export function exportToFile(data: SaveData) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<SaveData> {
    const text = await file.text();
    return migrateSave(JSON.parse(text) as SaveData);
}
