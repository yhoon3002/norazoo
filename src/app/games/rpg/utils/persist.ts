// rpg/utils/persist.ts
import type { SaveData } from "../types/RpgTypes";

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
    return JSON.parse(raw) as SaveData;
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
    return JSON.parse(text) as SaveData;
}
