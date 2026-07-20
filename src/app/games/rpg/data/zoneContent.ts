// rpg/data/zoneContent.ts — 존 티어 구성 단일 소스 (채집 아이템·배회 조합·보물 전리품)
// 배치 좌표는 placementData가, "무엇을 놓을지"는 이 파일이 결정한다.
import type { ZoneId } from "./placementData";

export const ZONE_CONTENT: Record<
    ZoneId,
    {
        /** 채집 스폰에 순환 배정할 아이템 id */
        gatherItems: string[];
        /** 배회 무리 조합(순환) */
        roamerPacks: string[][];
        /** 숨은 보물 전리품(순환) */
        treasureLoot: Array<Array<{ id: string; qty: number }>>;
    }
> = {
    town: {
        gatherItems: ["herb", "slime_gel"],
        roamerPacks: [["slime", "slime"]],
        treasureLoot: [
            [{ id: "health_potion", qty: 2 }],
            [{ id: "herb", qty: 3 }, { id: "mana_potion", qty: 1 }],
            [{ id: "monster_core", qty: 1 }],
        ],
    },
    port: {
        gatherItems: ["clam", "sea_salt", "clam"],
        roamerPacks: [["slime", "orc"]],
        treasureLoot: [
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "sea_salt", qty: 3 }],
            [{ id: "mana_crystal", qty: 2 }],
        ],
    },
    hill: {
        gatherItems: ["wind_flower", "herb"],
        roamerPacks: [["orc", "orc"]],
        treasureLoot: [
            [{ id: "wind_flower", qty: 2 }, { id: "health_potion", qty: 1 }],
            [{ id: "orc_tusk", qty: 3 }],
            [{ id: "golden_herb", qty: 1 }],
        ],
    },
    west_forest: {
        gatherItems: ["forest_mushroom", "tree_sap", "forest_mushroom"],
        roamerPacks: [["zombie", "zombie"], ["zombie", "slime"], ["zombie", "zombie", "slime"]],
        treasureLoot: [
            [{ id: "forest_mushroom", qty: 3 }],
            [{ id: "tree_sap", qty: 2 }, { id: "health_potion", qty: 2 }],
            [{ id: "monster_core", qty: 2 }],
        ],
    },
    north_woods: {
        gatherItems: ["frost_moss", "iron_ore"],
        roamerPacks: [["witch"], ["witch", "zombie"], ["witch", "witch"]],
        treasureLoot: [
            [{ id: "iron_ore", qty: 2 }],
            [{ id: "frost_moss", qty: 2 }, { id: "mana_potion", qty: 2 }],
            [{ id: "silver_ore", qty: 1 }],
        ],
    },
    ne_water: {
        gatherItems: ["reed", "lotus", "silver_ore"],
        roamerPacks: [["ninja"], ["ninja", "ninja"], ["ninja", "witch"]],
        treasureLoot: [
            [{ id: "silver_ore", qty: 2 }],
            [{ id: "lotus", qty: 2 }, { id: "mana_crystal", qty: 2 }],
            [{ id: "monster_core", qty: 2 }, { id: "golden_herb", qty: 1 }],
        ],
    },
    south_coast: {
        gatherItems: ["clam", "driftwood"],
        roamerPacks: [["zombie", "orc"], ["orc", "slime", "slime"], ["zombie", "zombie"]],
        treasureLoot: [
            [{ id: "driftwood", qty: 3 }],
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "coral_fish", qty: 1 }, { id: "sea_salt", qty: 2 }],
        ],
    },
};
