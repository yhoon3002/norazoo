// rpg/data/gameData.ts
import * as THREE from "three";
import type { Skill, Equipment, Character, Enemy, PartyId } from "../types/RpgTypes";
import { ZONE_DEFS, GEN_GATHER, GEN_ROAMERS, GEN_TREASURES, GEN_FISHING } from "./placementData";
import { ZONE_CONTENT } from "./zoneContent";


export const ENEMY_MODEL_BY_TEMPLATE: Record<string, string> = {
    slime: "/character/Zombie_Female.fbx",
    orc: "/character/Goblin_Male.fbx",
    mage: "/character/Wizard.fbx",
    zombie: "/character/Zombie_Male.fbx",
    witch: "/character/Witch.fbx",
    ninja: "/character/Ninja_Female.fbx",
    ghoul: "/character/Zombie_Female.fbx",
    mad_bull: "/character/Cow.fbx",
    wild_dog: "/character/Pug.fbx",
    orc_chief: "/character/Goblin_Male.fbx",
    frost_witch: "/character/Witch.fbx",
    clockwork_soldier: "/character/Goblin_Male.fbx",
    shade_beast: "/character/Zombie_Male.fbx",
    gear_devourer: "/character/Witch.fbx",
};

// 필드 적 데이터 단일 소스 — FieldScene(렌더링)·FieldPlayer(충돌) 공용
export const FIELD_ENEMIES: Array<
    | { id: string; pos: THREE.Vector3; templates: string[]; respawn?: number }
    | { id: string; pos: THREE.Vector3; template: string; respawn?: number }
> = [
    // y는 "의도한 층"의 지면 높이 — 스폰 스냅이 이 층 근처 walkable을 고른다.
    // (플레이어 y 기반이면 플레이어가 항구 등 다른 층에 있을 때 지하 수로층에 스냅됨)
    // e1은 튜토리얼 전투 — 스폰 남쪽 복도 끝 (서쪽 (-15,3)은 스폰 지역과 단절되어 도달 불가)
    { id: "e1", pos: new THREE.Vector3(12.8, -33.25, -28.8), templates: ["slime", "slime"] },
    { id: "e2", pos: new THREE.Vector3(10, -33.25, 2),   templates: ["orc", "slime", "mage"] },
    { id: "e3", pos: new THREE.Vector3(14, -33.25, 8),   template: "mage" },
    // ===== 배회 몬스터 — 길 밖 필드 라이프 (3분 리스폰) =====
    { id: "r1", pos: new THREE.Vector3(46, -33.25, -30), templates: ["slime", "slime"], respawn: 180_000 },
    { id: "r2", pos: new THREE.Vector3(68, -33.25, -33), template: "orc", respawn: 180_000 },
    { id: "r3", pos: new THREE.Vector3(80, -33.25, -10), templates: ["slime", "mage"], respawn: 180_000 },
    { id: "r4", pos: new THREE.Vector3(126, -33.25, -20), template: "orc", respawn: 180_000 },
    { id: "r5", pos: new THREE.Vector3(196, -37.25, 2), templates: ["slime", "slime", "slime"], respawn: 180_000 },
    // 파수꾼 퀘스트 전용 무리 (리스폰 없음 — Task 4에서 사용)
    { id: "bounty1", pos: new THREE.Vector3(52, -33.25, -46), templates: ["orc", "orc"] },
];

// ===== 상점 =====
// 구매가 기준표. 판매가는 SELL_RATIO 배율 (재료 아이템은 판매 전용 — 드랍템의 용처)
export const ITEM_PRICES: Record<string, number> = {
    health_potion: 30,
    mana_potion: 40,
    iron_sword: 80,
    steel_sword: 150,
    flame_blade: 400,
    mage_staff: 200,
    leather_armor: 60,
    chain_mail: 180,
    mage_robes: 160,
    power_ring: 250,
    health_amulet: 220,
    slime_gel: 8,
    orc_tusk: 20,
    mana_crystal: 35,
    herb: 12,
    monster_core: 45,
    golden_herb: 60,
    fish_common: 18,
    fish_rare: 90,
    clam: 10,
    sea_salt: 8,
    wind_flower: 25,
    forest_mushroom: 15,
    tree_sap: 12,
    frost_moss: 30,
    iron_ore: 35,
    silver_ore: 70,
    reed: 6,
    lotus: 28,
    driftwood: 9,
    silver_trout: 40,
    coral_fish: 55,
    dark_crystal: 90,
    ether_elixir: 60,
    war_elixir: 90,
    guard_elixir: 90,
    scout_leather: 100,
    gear_robe: 220,
    chef_apron: 240,
    dragon_scale: 520,
    silver_watch: 240,
    guard_charm: 260,
    hunter_ring: 320,
    sage_pendant: 340,
    knight_greatsword: 450,
    clock_staff: 480,
    chef_blade: 460,
};

export const SELL_RATIO = 0.5;

export const SHOP_STOCK: string[] = [
    "health_potion",
    "mana_potion",
    "iron_sword",
    "steel_sword",
    "flame_blade",
    "mage_staff",
    "leather_armor",
    "chain_mail",
    "mage_robes",
    "power_ring",
    "health_amulet",
    "scout_leather",
    "gear_robe",
    "silver_watch",
    "guard_charm",
    "knight_greatsword",
];

// 상인 위치 (y는 의도한 층의 지면 — navmesh 스냅 기준으로 사용)
// (구 위치 (4,-4)는 돌담 안쪽이라 스폰 지역에서 걸어서 도달 불가)
export const MERCHANT_POS = new THREE.Vector3(12.8, -33.25, -14);

// ===== 필드 보물상자 — 단일 소스 (렌더링·충돌·획득 공용) =====
// 위치는 전부 도보 도달 가능 + 8방향 개방 검증 좌표만 사용
export const FIELD_TREASURES: Array<{
    id: string;
    pos: THREE.Vector3;
    items: Array<{ id: string; qty: number }>;
}> = [
    // 튜토리얼 상자 (광장)
    {
        id: "t1",
        pos: new THREE.Vector3(11.2, -33.25, -16),
        items: [
            { id: "steel_sword", qty: 1 },
            { id: "health_potion", qty: 2 },
        ],
    },
    // 북쪽 분수 근처
    {
        id: "t2",
        pos: new THREE.Vector3(10, -33.25, 10),
        items: [
            { id: "mage_staff", qty: 1 },
            { id: "mana_potion", qty: 3 },
        ],
    },
    // ── 숨은 보물 (길에서 벗어난 곳) ──
    { id: "t3", pos: new THREE.Vector3(11.2, -33.25, -8.4), items: [{ id: "health_potion", qty: 2 }, { id: "herb", qty: 2 }] },
    { id: "t4", pos: new THREE.Vector3(12.8, -33.25, -17.2), items: [{ id: "mana_potion", qty: 2 }] },
    { id: "t5", pos: new THREE.Vector3(35, -33.25, -42), items: [{ id: "health_amulet", qty: 1 }] },
    { id: "t6", pos: new THREE.Vector3(66.5, -33.25, -42.2), items: [{ id: "slime_gel", qty: 3 }, { id: "health_potion", qty: 1 }] },
    { id: "t7", pos: new THREE.Vector3(89.8, -33.25, -32.3), items: [{ id: "mana_crystal", qty: 2 }, { id: "herb", qty: 1 }] },
    { id: "t8", pos: new THREE.Vector3(172.4, -37.25, 8.4), items: [{ id: "leather_armor", qty: 1 }, { id: "herb", qty: 2 }] },
    { id: "t9", pos: new THREE.Vector3(215.8, -38.25, -8.4), items: [{ id: "power_ring", qty: 1 }] },
    { id: "t10", pos: new THREE.Vector3(218.6, -38.25, -14.7), items: [{ id: "health_potion", qty: 2 }, { id: "mana_crystal", qty: 1 }] },
    // ===== 숨은 보물 — 길 밖 탐험 보상 (지도에 25m 접근 시 '?') =====
    { id: "t11", pos: new THREE.Vector3(30, -33.25, -48), items: [{ id: "mana_crystal", qty: 2 }, { id: "health_potion", qty: 1 }] },
    { id: "t12", pos: new THREE.Vector3(58, -33.25, -12), items: [{ id: "monster_core", qty: 2 }] },
    { id: "t13", pos: new THREE.Vector3(78, -33.25, -50), items: [{ id: "herb", qty: 3 }, { id: "health_potion", qty: 1 }] },
    { id: "t14", pos: new THREE.Vector3(66, -33.25, -8), items: [{ id: "kite", qty: 1 }] }, // 소년 퀘스트: 잃어버린 연
    { id: "t15", pos: new THREE.Vector3(150, -34.25, 2), items: [{ id: "mana_potion", qty: 2 }] },
    { id: "t16", pos: new THREE.Vector3(226, -38.25, -4), items: [{ id: "orc_tusk", qty: 3 }, { id: "golden_herb", qty: 1 }] },
];

// ===== 채집물 — 반짝이는 약초/수정 (E로 획득, 1회성) =====
export const FIELD_GATHERABLES: Array<{
    id: string;
    pos: THREE.Vector3;
    item: string;
    qty: number;
}> = [
    // 길잡이 트레일 위가 아니라 길가 풀밭·수풀 속에 배치한다 — "탐색하면 발견"하는
    // 느낌을 주기 위해 도로에서 2.5~4m 비켜난 지점. (navFindWalkable이 최근접
    // walkable로 스냅하므로 좌표가 다소 어긋나도 안전)
    { id: "g1", pos: new THREE.Vector3(33.8, -33.25, -31.6), item: "herb", qty: 1 },
    { id: "g2", pos: new THREE.Vector3(44.6, -33.25, -36.0), item: "herb", qty: 1 },
    { id: "g3", pos: new THREE.Vector3(59.4, -33.25, -39.2), item: "herb", qty: 1 },
    { id: "g4", pos: new THREE.Vector3(103.9, -33.25, -31.8), item: "herb", qty: 1 },
    { id: "g5", pos: new THREE.Vector3(121.6, -33.25, -24.3), item: "mana_crystal", qty: 1 },
    { id: "g6", pos: new THREE.Vector3(141.2, -34.25, -13.6), item: "herb", qty: 1 },
    { id: "g7", pos: new THREE.Vector3(187.4, -37.25, 12.0), item: "mana_crystal", qty: 1 },
    { id: "g8", pos: new THREE.Vector3(211.0, -38.25, -13.6), item: "herb", qty: 1 },
    { id: "g9", pos: new THREE.Vector3(25.6, -33.25, -22.2), item: "slime_gel", qty: 1 },
    { id: "g10", pos: new THREE.Vector3(16.4, -33.25, -20.0), item: "herb", qty: 1 },
];

// ===== 황금 약초 — 필드 진입마다 후보 3곳 중 랜덤 1곳 스폰 (3분 리스폰) =====
export const GOLDEN_HERB_SPOTS: Array<{ x: number; y: number; z: number }> = [
    { x: 52, y: -33.25, z: -24 },
    { x: 112, y: -33.25, z: -32 },
    { x: 205, y: -38.25, z: 8 },
];

// ===== 낚시터 — 부두(기존) + 존 물가 3곳 (placementData 도달 검증 좌표) =====
export const FISHING_SPOTS: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    table: { common: string; rare: string };
}> = [
    { id: "pier", x: 222.5, y: -38.25, z: -18.9, table: { common: "fish_common", rare: "fish_rare" } },
    ...GEN_FISHING.map((f) => ({
        id: `z_fish_${f.zone}`,
        x: f.x,
        y: f.y,
        z: f.z,
        table:
            f.zone === "south_coast"
                ? { common: "fish_common", rare: "coral_fish" }
                : { common: "silver_trout", rare: "fish_rare" },
    })),
];

// ===== 존 확장 배치 — placementData(도달 검증 좌표) × zoneContent(티어 구성) 전개 =====
for (const zd of ZONE_DEFS) {
    const zc = ZONE_CONTENT[zd.id];
    GEN_GATHER[zd.id].forEach((s, i) => {
        FIELD_GATHERABLES.push({
            id: `z_${zd.id}_g${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            item: zc.gatherItems[i % zc.gatherItems.length],
            qty: 1,
        });
    });
    GEN_ROAMERS[zd.id].forEach((s, i) => {
        FIELD_ENEMIES.push({
            id: `z_${zd.id}_r${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            templates: zc.roamerPacks[i % zc.roamerPacks.length],
            respawn: 180_000,
        });
    });
    GEN_TREASURES[zd.id].forEach((s, i) => {
        FIELD_TREASURES.push({
            id: `z_${zd.id}_t${i}`,
            pos: new THREE.Vector3(s.x, s.y, s.z),
            items: zc.treasureLoot[i % zc.treasureLoot.length],
        });
    });
}

// ===== 요리사 미니퀘스트: 멈춘 화덕을 위한 재료 =====
export const COOK_QUEST = {
    /** 수락 가능 스테이지 (튜토리얼 전투 이후) — 종장 이후에도 수락/turn-in 가능하게 유지 */
    availableFrom: ["ch2_cleanup", "ch3_port", "ch4_hill", "ch5_gorge", "epilogue"],
    needs: [
        { id: "herb", qty: 3, name: "약초" },
        { id: "slime_gel", qty: 2, name: "슬라임 젤" },
    ],
    rewards: [
        { id: "health_potion", qty: 2 },
        { id: "mana_potion", qty: 1 },
    ],
    rewardGold: 120,
};
// 상인 보호 반경 — 적이 이 안으로 들어오지 못한다 (밖으로 나가는 이동은 허용)
export const MERCHANT_KEEPOUT = 5;

// ===== 적 유닛별 공격 타이밍 프로필 =====
// 33원정대처럼 "적을 보고 반응"하는 방어의 핵심 — 유닛마다 리듬이 다르다.
// chargeMs: 차지 시간(수축 링이 조여드는 시간), hits: 첫 타격 기준 오프셋(ms) 배열(다단 히트),
// parryable: false면 회피(W) 전용 공격, ringColor: 수축 링/차징 글로우 색
export const ENEMY_ATTACK_PROFILES: Record<
    string,
    { chargeMs: number; hits: number[]; parryable: boolean; ringColor: string }
> = {
    slime: { chargeMs: 1200, hits: [0], parryable: true, ringColor: "#ffd54a" }, // 느긋한 단타 (입문)
    orc: { chargeMs: 700, hits: [0, 450], parryable: true, ringColor: "#c084fc" }, // 빠른 2연타
    mage: { chargeMs: 1600, hits: [0], parryable: false, ringColor: "#ff5252" }, // 긴 차지 후 회피 전용 마법
    zombie: { chargeMs: 1000, hits: [0, 600], parryable: true, ringColor: "#84cc16" }, // 굼뜬 2연타
    witch: { chargeMs: 1800, hits: [0], parryable: false, ringColor: "#a78bfa" }, // 긴 차지 회피 전용
    ninja: { chargeMs: 600, hits: [0, 300, 600], parryable: true, ringColor: "#f472b6" }, // 빠른 3연타
    ghoul: { chargeMs: 800, hits: [0, 400], parryable: true, ringColor: "#a3e635" },
    mad_bull: { chargeMs: 1100, hits: [0, 500], parryable: false, ringColor: "#f97316" }, // 돌진 — 회피 전용
    wild_dog: { chargeMs: 500, hits: [0, 250, 500], parryable: true, ringColor: "#d4d4d8" },
    orc_chief: { chargeMs: 750, hits: [0, 400, 800], parryable: true, ringColor: "#c084fc" },
    frost_witch: { chargeMs: 1500, hits: [0], parryable: false, ringColor: "#67e8f9" },
    clockwork_soldier: { chargeMs: 700, hits: [0, 350, 700], parryable: true, ringColor: "#fbbf24" },
    shade_beast: { chargeMs: 1000, hits: [0, 650], parryable: true, ringColor: "#6b21a8" },
    gear_devourer: { chargeMs: 900, hits: [0, 450, 900], parryable: true, ringColor: "#f59e0b" }, // 보스 — 3연타
};

export const DEFAULT_ATTACK_PROFILE = {
    chargeMs: 900,
    hits: [0],
    parryable: true,
    ringColor: "#ffd54a",
};

// ✅ 스킬별 애니메이션 매핑 추가
export const SKILL_ANIMATIONS: Record<string, string> = {
    slash: "skill1", // SwordSlash
    fireball: "skill2", // Shoot_OneHanded
    lightning: "skill1", // SwordSlash
    ice_shard: "skill2", // Shoot_OneHanded
    guard_break: "skill1", // SwordSlash
    heal: "skill2", // Shoot_OneHanded (마법 시전)
    group_heal: "skill2", // Shoot_OneHanded (마법 시전)
    parry: "parry",
    // 캐릭터 전용 신규 11종
    arin_whirl: "skill1",
    arin_bastion: "skill2",
    arin_execute: "skill1",
    arin_bless: "skill2",
    theo_gearburst: "skill2",
    theo_haste: "skill2",
    theo_corrode: "skill2",
    theo_collapse: "skill2",
    lotti_pan: "skill1",
    lotti_spice: "skill2",
    lotti_fullcourse: "skill2",
};

export const SKILLS: Record<string, Skill> = {
    slash: {
        id: "slash",
        name: "베기",
        damage: 120,
        etherCost: 0,
        type: "physical",
        targetType: "single",
        description: "빠르게 베어내는 일격.",
    },
    fireball: {
        id: "fireball",
        name: "화염구",
        damage: 180,
        etherCost: 2,
        type: "magic",
        targetType: "single",
        description: "타오르는 화염구를 발사한다.",
        element: "fire",
        statusEffect: { type: "burn", duration: 3, value: 10 },
    },
    heal: {
        id: "heal",
        name: "치유",
        damage: -80,
        etherCost: 2,
        type: "heal",
        targetType: "single",
        description: "아군 하나의 HP를 회복시킨다.",
    },
    lightning: {
        id: "lightning",
        name: "낙뢰",
        damage: 200,
        etherCost: 3,
        type: "magic",
        targetType: "single",
        description: "번개를 내리쳐 적을 공격한다.",
        element: "lightning",
        statusEffect: { type: "stun", duration: 1, value: 1 },
    },
    ice_shard: {
        id: "ice_shard",
        name: "얼음 조각",
        damage: 150,
        etherCost: 2,
        type: "magic",
        targetType: "single",
        description: "얼어붙은 파편을 날려 적을 공격한다.",
        element: "ice",
        statusEffect: { type: "freeze", duration: 2, value: 1 },
    },
    guard_break: {
        id: "guard_break",
        name: "철갑 부수기",
        damage: 100,
        etherCost: 1,
        type: "physical",
        targetType: "single",
        description: "적의 방어를 무너뜨리는 일격.",
        statusEffect: { type: "buff_atk", duration: 3, value: 20 },
    },
    group_heal: {
        id: "group_heal",
        name: "집단 치유",
        damage: -60,
        etherCost: 3,
        type: "heal",
        targetType: "all",
        description: "파티 전원의 HP를 회복시킨다.",
    },
    // ===== 캐릭터 전용 레벨 언락 스킬 (신규 11종) =====
    arin_whirl: {
        id: "arin_whirl",
        name: "회전 베기",
        character: "arin",
        unlockLevel: 3,
        damage: 90,
        etherCost: 2,
        type: "physical",
        targetType: "all",
        description: "몸을 회전시켜 주변 적 전체를 베어낸다.",
    },
    arin_bastion: {
        id: "arin_bastion",
        name: "철벽의 맹세",
        character: "arin",
        unlockLevel: 5,
        damage: 0,
        etherCost: 2,
        type: "buff",
        targetType: "all",
        description: "방패를 굳게 세워 파티 전원의 방어력을 높인다.",
        statusEffect: { type: "buff_def", duration: 3, value: 12 },
    },
    arin_execute: {
        id: "arin_execute",
        name: "처형 일격",
        character: "arin",
        unlockLevel: 7,
        damage: 260,
        etherCost: 3,
        type: "physical",
        targetType: "single",
        description: "빈틈을 노려 적 하나에게 강력한 일격을 꽂는다.",
    },
    arin_bless: {
        id: "arin_bless",
        name: "수호기사의 축복",
        character: "arin",
        unlockLevel: 10,
        damage: 0,
        etherCost: 3,
        type: "buff",
        targetType: "all",
        description: "성스러운 가호로 파티 전원에게 지속 회복을 건다.",
        statusEffect: { type: "regen", duration: 3, value: 12 },
    },
    theo_gearburst: {
        id: "theo_gearburst",
        name: "태엽 폭발",
        character: "theo",
        unlockLevel: 3,
        damage: 130,
        etherCost: 2,
        type: "magic",
        targetType: "all",
        description: "과열된 태엽을 터뜨려 적 전체에게 번개 피해를 준다.",
        element: "lightning",
    },
    theo_haste: {
        id: "theo_haste",
        name: "시간 가속",
        character: "theo",
        unlockLevel: 5,
        damage: 0,
        etherCost: 2,
        type: "buff",
        targetType: "all",
        description: "시간을 조작해 파티 전원의 속도를 끌어올린다.",
        statusEffect: { type: "speed", duration: 3, value: 6 },
    },
    theo_corrode: {
        id: "theo_corrode",
        name: "부식 태엽",
        character: "theo",
        unlockLevel: 7,
        damage: 120,
        etherCost: 2,
        type: "magic",
        targetType: "single",
        description: "부식성 톱니를 박아 적 하나에게 중독을 건다.",
        statusEffect: { type: "poison", duration: 3, value: 14 },
    },
    theo_collapse: {
        id: "theo_collapse",
        name: "시공 붕괴",
        character: "theo",
        unlockLevel: 10,
        damage: 210,
        etherCost: 4,
        type: "magic",
        targetType: "all",
        description: "시공간을 붕괴시켜 적 전체에게 막대한 번개 피해를 준다.",
        element: "lightning",
    },
    lotti_pan: {
        id: "lotti_pan",
        name: "프라이팬 강타",
        character: "lotti",
        unlockLevel: 4,
        damage: 140,
        etherCost: 1,
        type: "physical",
        targetType: "single",
        description: "무거운 프라이팬으로 적 하나를 강타해 기절시킨다.",
        statusEffect: { type: "stun", duration: 1, value: 1 },
    },
    lotti_spice: {
        id: "lotti_spice",
        name: "매운맛 양념",
        character: "lotti",
        unlockLevel: 6,
        damage: 0,
        etherCost: 2,
        type: "buff",
        targetType: "all",
        description: "매콤한 양념을 나눠 먹여 파티 전원의 공격력을 높인다.",
        statusEffect: { type: "buff_atk", duration: 3, value: 10 },
    },
    lotti_fullcourse: {
        id: "lotti_fullcourse",
        name: "풀코스",
        character: "lotti",
        unlockLevel: 8,
        damage: -70,
        etherCost: 3,
        type: "heal",
        targetType: "all",
        description: "정성스런 풀코스 요리로 파티 전원을 회복시키고 재생 효과를 건다.",
        statusEffect: { type: "regen", duration: 2, value: 8 },
    },
};

export const EQUIPMENT: Record<string, Equipment> = {
    iron_sword: {
        id: "iron_sword",
        name: "Iron Sword",
        type: "weapon",
        stats: { atk: 15, speed: 2 },
        rarity: "common",
    },
    steel_sword: {
        id: "steel_sword",
        name: "Steel Sword",
        type: "weapon",
        stats: { atk: 25, speed: 3 },
        skills: ["guard_break"],
        rarity: "rare",
    },
    flame_blade: {
        id: "flame_blade",
        name: "Flame Blade",
        type: "weapon",
        stats: { atk: 35, speed: 5 },
        skills: ["fireball"],
        rarity: "epic",
    },
    mage_staff: {
        id: "mage_staff",
        name: "Mage Staff",
        type: "weapon",
        stats: { atk: 12, maxMp: 30, speed: -2 },
        skills: ["lightning", "ice_shard"],
        rarity: "rare",
    },
    leather_armor: {
        id: "leather_armor",
        name: "Leather Armor",
        type: "armor",
        stats: { def: 8, speed: 1 },
        rarity: "common",
    },
    chain_mail: {
        id: "chain_mail",
        name: "Chain Mail",
        type: "armor",
        stats: { def: 15, maxHp: 20, speed: -1 },
        rarity: "rare",
    },
    mage_robes: {
        id: "mage_robes",
        name: "Mage Robes",
        type: "armor",
        stats: { def: 5, maxMp: 40, speed: 2 },
        skills: ["group_heal"],
        rarity: "rare",
    },
    power_ring: {
        id: "power_ring",
        name: "Power Ring",
        type: "accessory",
        stats: { atk: 10, luck: 5 },
        rarity: "epic",
    },
    health_amulet: {
        id: "health_amulet",
        name: "Health Amulet",
        type: "accessory",
        stats: { maxHp: 50, def: 5 },
        rarity: "rare",
    },
    // ===== 신규 11종 (액세서리·에픽 방어구·캐릭터 무기) =====
    scout_leather: {
        id: "scout_leather",
        name: "정찰병 경갑",
        type: "armor",
        stats: { def: 8, speed: 4 },
        rarity: "common",
    },
    gear_robe: {
        id: "gear_robe",
        name: "태엽 로브",
        type: "armor",
        stats: { def: 10, maxHp: 10, atk: 5 },
        rarity: "rare",
    },
    chef_apron: {
        id: "chef_apron",
        name: "셰프의 앞치마",
        type: "armor",
        stats: { def: 12, maxHp: 25 },
        rarity: "rare",
    },
    dragon_scale: {
        id: "dragon_scale",
        name: "용린 갑옷",
        type: "armor",
        stats: { def: 22, maxHp: 40, speed: -2 },
        rarity: "epic",
    },
    silver_watch: {
        id: "silver_watch",
        name: "은빛 회중시계",
        type: "accessory",
        stats: { speed: 8 },
        rarity: "rare",
    },
    guard_charm: {
        id: "guard_charm",
        name: "수호 부적",
        type: "accessory",
        stats: { def: 8, maxHp: 15 },
        rarity: "rare",
    },
    hunter_ring: {
        id: "hunter_ring",
        name: "사냥꾼의 반지",
        type: "accessory",
        stats: { atk: 12, speed: 3 },
        rarity: "epic",
    },
    sage_pendant: {
        id: "sage_pendant",
        name: "현자의 목걸이",
        type: "accessory",
        stats: { atk: 8, luck: 8 },
        skills: ["ice_shard"],
        rarity: "epic",
    },
    knight_greatsword: {
        id: "knight_greatsword",
        name: "기사단 대검",
        type: "weapon",
        stats: { atk: 40, speed: -3 },
        rarity: "epic",
    },
    clock_staff: {
        id: "clock_staff",
        name: "태엽 지팡이",
        type: "weapon",
        stats: { atk: 30, maxMp: 15 },
        skills: ["lightning"],
        rarity: "epic",
    },
    chef_blade: {
        id: "chef_blade",
        name: "명장의 조리검",
        type: "weapon",
        stats: { atk: 32, speed: 6 },
        rarity: "epic",
    },
};

// ===== 장비 강화 파생 (+1~+5) — 모듈 로드 시 자동 생성 =====
// id 규약: `${원본}_p{n}`. 스탯 ×1.15/1.30/1.50/1.75/2.05 반올림, 표시명 "+n".
export const UPGRADE_MULT = [1.15, 1.3, 1.5, 1.75, 2.05];
export const UPGRADE_COSTS: Array<{ needs: Array<{ id: string; qty: number }>; gold: number }> = [
    { needs: [{ id: "iron_ore", qty: 2 }], gold: 100 },
    { needs: [{ id: "iron_ore", qty: 3 }, { id: "monster_core", qty: 1 }], gold: 250 },
    { needs: [{ id: "silver_ore", qty: 2 }, { id: "monster_core", qty: 2 }], gold: 600 },
    { needs: [{ id: "dark_crystal", qty: 2 }, { id: "orc_tusk", qty: 2 }], gold: 1200 },
    { needs: [{ id: "dark_crystal", qty: 3 }, { id: "orc_tusk", qty: 3 }], gold: 2500 },
];
for (const baseId of Object.keys(EQUIPMENT)) {
    const base = EQUIPMENT[baseId];
    for (let n = 1; n <= UPGRADE_MULT.length; n++) {
        const stats: Record<string, number> = {};
        for (const [k, v] of Object.entries(base.stats)) {
            if (typeof v === "number") stats[k] = Math.round(v * UPGRADE_MULT[n - 1]);
        }
        EQUIPMENT[`${baseId}_p${n}`] = {
            ...base,
            id: `${baseId}_p${n}`,
            name: `${base.name} +${n}`,
            stats: stats as any,
        };
        if (ITEM_PRICES[baseId])
            ITEM_PRICES[`${baseId}_p${n}`] = Math.round(ITEM_PRICES[baseId] * UPGRADE_MULT[n - 1]);
    }
}

// ===== 파티 캐릭터 메타 — 표시명/고유색/초상화 단일 소스 (대사 UI·필드 마커·HUD 공용) =====
export type PartyMeta = {
    displayName: string;
    /** 대사 박스 테두리·이름·화자 마커에 쓰는 고유색 */
    color: string;
    portrait: string;
    role: string;
};

export const PARTY_META: Record<PartyId, PartyMeta> = {
    arin: {
        displayName: "아린",
        color: "#6EA8FE",
        portrait: "🗡️",
        role: "왕도 조사대 대장",
    },
    theo: {
        displayName: "테오",
        color: "#B58CF6",
        portrait: "🔮",
        role: "태엽학자 겸 마법사",
    },
    lotti: {
        displayName: "로티",
        color: "#7BD88F",
        portrait: "🍳",
        role: "견습 요리사 출신 검사",
    },
};

export const DEFAULT_PARTY: Character[] = [
    {
        id: "arin",
        name: "아린",
        level: 5,
        exp: 0,
        expToNext: 100,
        baseStats: {
            hp: 120,
            maxHp: 120,
            mp: 25,
            maxMp: 25,
            atk: 20,
            def: 10,
            speed: 15,
            luck: 5,
        },
        skills: ["slash", "guard_break"],
        equipment: { weapon: "steel_sword", armor: "chain_mail" },
        statusEffects: [],
        portrait: "🗡️",
        ether: 3,
        maxEther: 9,
        modelUrl: "/character/Knight_Golden_Female.fbx",
        preferredAttack: "attack", // 기본공격은 Punch 애니메이션 사용
    },
    {
        id: "theo",
        name: "테오",
        level: 4,
        exp: 0,
        expToNext: 80,
        baseStats: {
            hp: 80,
            maxHp: 80,
            mp: 60,
            maxMp: 60,
            atk: 12,
            def: 6,
            speed: 20,
            luck: 10,
        },
        skills: ["fireball", "heal", "lightning"],
        equipment: { weapon: "mage_staff", armor: "mage_robes" },
        statusEffects: [],
        portrait: "🔮",
        ether: 3,
        maxEther: 9,
        modelUrl: "/character/Wizard.fbx",
        preferredAttack: "attack", // 기본공격은 Punch 애니메이션 사용
    },
    {
        id: "lotti",
        name: "로티",
        level: 4,
        exp: 0,
        expToNext: 80,
        baseStats: {
            hp: 100,
            maxHp: 100,
            mp: 30,
            maxMp: 30,
            atk: 18,
            def: 12,
            speed: 14,
            luck: 4,
        },
        skills: ["slash", "ice_shard"],
        equipment: {
            weapon: "iron_sword",
            armor: "leather_armor",
            accessory: "health_amulet",
        },
        statusEffects: [],
        portrait: "🍳",
        ether: 3,
        maxEther: 9,
        modelUrl: "/character/Chef_Hat.fbx",
        preferredAttack: "attack", // 기본공격은 Punch 애니메이션 사용
    },
];

export const ENEMY_TEMPLATES: Record<string, Omit<Enemy, "id">> = {
    slime: {
        name: "Slime",
        model: "/character/Zombie_Female.fbx", 
        level: 3,
        stats: {
            hp: 800,
            maxHp: 800,
            mp: 20,
            maxMp: 20,
            atk: 15,
            def: 5,
            speed: 12,
            luck: 3,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 25,
            gold: 15,
            items: [
                { id: "slime_gel", chance: 0.7 },
                { id: "iron_sword", chance: 0.1 },
            ],
        },
    },
    orc: {
        name: "Orc Warrior",
        model: "/character/Goblin_Male.fbx",
        level: 6,
        stats: {
            hp: 1800,
            maxHp: 1800,
            mp: 30,
            maxMp: 30,
            atk: 28,
            def: 12,
            speed: 14,
            luck: 5,
        },
        skills: ["slash", "guard_break"],
        statusEffects: [],
        aiPattern: "balanced",
        rewards: {
            exp: 60,
            gold: 35,
            items: [
                { id: "orc_tusk", chance: 0.8 },
                { id: "steel_sword", chance: 0.2 },
                { id: "monster_core", chance: 0.15 },
            ],
        },
    },
    mage: {
        name: "Dark Mage",
        model: "/character/Wizard.fbx",
        level: 7,
        stats: {
            hp: 1200,
            maxHp: 1200,
            mp: 100,
            maxMp: 100,
            atk: 22,
            def: 8,
            speed: 20,
            luck: 12,
        },
        skills: ["fireball", "lightning", "ice_shard"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 80,
            gold: 50,
            items: [
                { id: "mana_crystal", chance: 0.9 },
                { id: "mage_staff", chance: 0.3 },
                { id: "monster_core", chance: 0.15 },
            ],
        },
    },
    zombie: {
        name: "썩은 좀비",
        model: "/character/Zombie_Male.fbx",
        level: 6,
        stats: {
            hp: 140,
            maxHp: 140,
            mp: 0,
            maxMp: 0,
            atk: 22,
            def: 12,
            speed: 8,
            luck: 3,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 45,
            gold: 30,
            items: [
                { id: "tree_sap", chance: 0.35 },
                { id: "monster_core", chance: 0.2 },
            ],
        },
    },
    witch: {
        name: "숲의 마녀",
        model: "/character/Witch.fbx",
        level: 8,
        stats: {
            hp: 110,
            maxHp: 110,
            mp: 60,
            maxMp: 60,
            atk: 30,
            def: 8,
            speed: 18,
            luck: 10,
        },
        skills: ["fireball", "lightning"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 70,
            gold: 55,
            items: [
                { id: "frost_moss", chance: 0.4 },
                { id: "monster_core", chance: 0.25 },
            ],
        },
    },
    ninja: {
        name: "그림자 닌자",
        model: "/character/Ninja_Female.fbx",
        level: 9,
        stats: {
            hp: 130,
            maxHp: 130,
            mp: 20,
            maxMp: 20,
            atk: 26,
            def: 10,
            speed: 26,
            luck: 12,
        },
        skills: ["slash", "ice_shard"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 85,
            gold: 70,
            items: [
                { id: "silver_ore", chance: 0.2 },
                { id: "monster_core", chance: 0.25 },
            ],
        },
    },
    ghoul: {
        name: "구울",
        model: "/character/Zombie_Female.fbx",
        level: 7,
        stats: {
            hp: 120,
            maxHp: 120,
            mp: 0,
            maxMp: 0,
            atk: 24,
            def: 8,
            speed: 20,
            luck: 5,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 55,
            gold: 40,
            items: [
                { id: "tree_sap", chance: 0.3 },
                { id: "monster_core", chance: 0.2 },
            ],
        },
    },
    mad_bull: {
        name: "미친 들소",
        model: "/character/Cow.fbx",
        level: 7,
        stats: {
            hp: 160,
            maxHp: 160,
            mp: 0,
            maxMp: 0,
            atk: 28,
            def: 14,
            speed: 12,
            luck: 5,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 65,
            gold: 45,
            items: [
                { id: "herb", chance: 0.5 },
                { id: "monster_core", chance: 0.2 },
            ],
        },
    },
    wild_dog: {
        name: "안개 들개",
        model: "/character/Pug.fbx",
        level: 4,
        stats: {
            hp: 70,
            maxHp: 70,
            mp: 0,
            maxMp: 0,
            atk: 14,
            def: 5,
            speed: 24,
            luck: 8,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 30,
            gold: 20,
            items: [{ id: "slime_gel", chance: 0.3 }],
        },
    },
    orc_chief: {
        name: "오크 족장",
        model: "/character/Goblin_Male.fbx",
        level: 10,
        stats: {
            hp: 220,
            maxHp: 220,
            mp: 0,
            maxMp: 0,
            atk: 32,
            def: 16,
            speed: 14,
            luck: 8,
        },
        skills: ["slash", "guard_break"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 120,
            gold: 100,
            items: [
                { id: "orc_tusk", chance: 0.8 },
                { id: "iron_ore", chance: 0.3 },
                { id: "monster_core", chance: 0.3 },
            ],
        },
    },
    frost_witch: {
        name: "서리 마녀",
        model: "/character/Witch.fbx",
        level: 10,
        stats: {
            hp: 140,
            maxHp: 140,
            mp: 60,
            maxMp: 60,
            atk: 34,
            def: 10,
            speed: 20,
            luck: 12,
        },
        skills: ["ice_shard", "lightning"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 110,
            gold: 90,
            items: [
                { id: "frost_moss", chance: 0.5 },
                { id: "silver_ore", chance: 0.2 },
                { id: "monster_core", chance: 0.3 },
            ],
        },
    },
    clockwork_soldier: {
        name: "태엽 병정",
        model: "/character/Goblin_Male.fbx",
        level: 11,
        stats: {
            hp: 180,
            maxHp: 180,
            mp: 0,
            maxMp: 0,
            atk: 30,
            def: 18,
            speed: 16,
            luck: 6,
        },
        skills: ["slash"],
        statusEffects: [],
        aiPattern: "balanced",
        rewards: {
            exp: 130,
            gold: 95,
            items: [
                { id: "dark_crystal", chance: 0.35 },
                { id: "monster_core", chance: 0.3 },
            ],
        },
    },
    shade_beast: {
        name: "어둠 마수",
        model: "/character/Zombie_Male.fbx",
        level: 12,
        stats: {
            hp: 240,
            maxHp: 240,
            mp: 0,
            maxMp: 0,
            atk: 36,
            def: 14,
            speed: 15,
            luck: 10,
        },
        skills: ["slash", "guard_break"],
        statusEffects: [],
        aiPattern: "aggressive",
        rewards: {
            exp: 160,
            gold: 120,
            items: [
                { id: "dark_crystal", chance: 0.45 },
                { id: "monster_core", chance: 0.35 },
            ],
        },
    },
    gear_devourer: {
        name: "태엽을 삼킨 마수",
        model: "/character/Witch.fbx",
        level: 15,
        stats: {
            hp: 900,
            maxHp: 900,
            mp: 80,
            maxMp: 80,
            atk: 42,
            def: 20,
            speed: 18,
            luck: 12,
        },
        skills: ["fireball", "lightning", "guard_break"],
        statusEffects: [],
        aiPattern: "smart",
        rewards: {
            exp: 800,
            gold: 1500,
            // 드롭 없음 — 스토리 보상
        },
        scale: 2.4,
    },
};
