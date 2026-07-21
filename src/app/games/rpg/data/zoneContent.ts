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
        roamerPacks: [["slime", "slime"], ["wild_dog", "wild_dog", "wild_dog"], ["slime", "wild_dog"]],
        treasureLoot: [
            [{ id: "health_potion", qty: 2 }],
            [{ id: "herb", qty: 3 }, { id: "mana_potion", qty: 1 }],
            [{ id: "monster_core", qty: 1 }],
        ],
    },
    port: {
        gatherItems: ["clam", "sea_salt", "clam"],
        roamerPacks: [["slime", "orc"], ["wild_dog", "wild_dog"], ["ghoul", "slime"]],
        treasureLoot: [
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "sea_salt", qty: 3 }],
            [{ id: "mana_crystal", qty: 2 }],
        ],
    },
    hill: {
        gatherItems: ["wind_flower", "herb"],
        // hill은 배회 스폰이 1곳뿐이라 index 0만 실사용 — 다양성 조합을 앞에 둔다
        roamerPacks: [["mad_bull", "orc"], ["orc", "orc"], ["orc_chief", "orc"], ["mad_bull"]],
        treasureLoot: [
            [{ id: "wind_flower", qty: 2 }, { id: "health_potion", qty: 1 }, { id: "hunter_ring", qty: 1 }],
            [{ id: "orc_tusk", qty: 3 }],
            [{ id: "golden_herb", qty: 1 }],
        ],
    },
    west_forest: {
        gatherItems: ["forest_mushroom", "tree_sap", "forest_mushroom"],
        roamerPacks: [
            ["zombie", "zombie"],
            ["ghoul", "zombie"],
            ["ghoul", "ghoul", "slime"],
            ["zombie", "wild_dog", "wild_dog"],
            ["ghoul", "mad_bull"],
        ],
        treasureLoot: [
            [{ id: "forest_mushroom", qty: 3 }, { id: "chef_apron", qty: 1 }],
            [{ id: "tree_sap", qty: 2 }, { id: "health_potion", qty: 2 }],
            [{ id: "monster_core", qty: 2 }],
        ],
    },
    north_woods: {
        gatherItems: ["frost_moss", "iron_ore"],
        roamerPacks: [["witch"], ["frost_witch", "zombie"], ["witch", "witch"], ["frost_witch", "ghoul"]],
        treasureLoot: [
            [{ id: "iron_ore", qty: 2 }, { id: "clock_staff", qty: 1 }],
            [{ id: "frost_moss", qty: 2 }, { id: "mana_potion", qty: 2 }],
            [{ id: "silver_ore", qty: 1 }],
        ],
    },
    ne_water: {
        gatherItems: ["reed", "lotus", "silver_ore"],
        roamerPacks: [["ninja"], ["ninja", "ninja"], ["ninja", "witch"], ["ninja", "ghoul"], ["frost_witch", "ninja"]],
        treasureLoot: [
            [{ id: "silver_ore", qty: 2 }, { id: "sage_pendant", qty: 1 }],
            [{ id: "lotus", qty: 2 }, { id: "mana_crystal", qty: 2 }],
            [{ id: "monster_core", qty: 2 }, { id: "golden_herb", qty: 1 }],
        ],
    },
    south_coast: {
        gatherItems: ["clam", "driftwood"],
        roamerPacks: [
            ["zombie", "orc"],
            ["mad_bull", "mad_bull"],
            ["ghoul", "ghoul"],
            ["orc", "slime", "slime"],
            ["wild_dog", "wild_dog", "mad_bull"],
        ],
        treasureLoot: [
            [{ id: "driftwood", qty: 3 }, { id: "chef_blade", qty: 1 }],
            [{ id: "clam", qty: 3 }, { id: "health_potion", qty: 1 }],
            [{ id: "coral_fish", qty: 1 }, { id: "sea_salt", qty: 2 }],
        ],
    },
    gorge: {
        gatherItems: ["dark_crystal", "mana_crystal", "dark_crystal"],
        roamerPacks: [
            ["clockwork_soldier", "clockwork_soldier"],
            ["shade_beast"],
            ["clockwork_soldier", "shade_beast"],
            ["shade_beast", "clockwork_soldier", "clockwork_soldier"],
            ["shade_beast", "shade_beast"],
        ],
        treasureLoot: [
            [{ id: "dark_crystal", qty: 2 }, { id: "health_potion", qty: 2 }, { id: "dragon_scale", qty: 1 }],
            [{ id: "silver_ore", qty: 2 }, { id: "mana_potion", qty: 2 }],
            [{ id: "golden_herb", qty: 2 }, { id: "monster_core", qty: 2 }],
        ],
    },
};
