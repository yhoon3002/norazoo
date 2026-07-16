// rpg/data/gameData.ts
import * as THREE from "three";
import type { Skill, Equipment, Character, Enemy, PartyId } from "../types/RpgTypes";


export const ENEMY_MODEL_BY_TEMPLATE: Record<string, string> = {
    slime: "/character/Zombie_Female.fbx",
    orc: "/character/Goblin_Male.fbx",
    mage: "/character/Wizard.fbx",
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

// ===== 요리사 미니퀘스트: 멈춘 화덕을 위한 재료 =====
export const COOK_QUEST = {
    /** 수락 가능 스테이지 (튜토리얼 전투 이후) */
    availableFrom: ["ch2_cleanup", "ch3_port", "ch4_hill"],
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
};

export const SKILLS: Record<string, Skill> = {
    slash: {
        id: "slash",
        name: "Slash",
        damage: 120,
        etherCost: 0,
        type: "physical",
        targetType: "single",
        description: "A quick cutting strike.",
    },
    fireball: {
        id: "fireball",
        name: "Fireball",
        damage: 180,
        etherCost: 2,
        type: "magic",
        targetType: "single",
        description: "Cast a burning fireball.",
        element: "fire",
        statusEffect: { type: "burn", duration: 3, value: 10 },
    },
    heal: {
        id: "heal",
        name: "Heal",
        damage: -80,
        etherCost: 2,
        type: "heal",
        targetType: "single",
        description: "Restore HP to an ally.",
    },
    lightning: {
        id: "lightning",
        name: "Lightning Strike",
        damage: 200,
        etherCost: 3,
        type: "magic",
        targetType: "single",
        description: "Call down lightning.",
        element: "lightning",
        statusEffect: { type: "stun", duration: 1, value: 1 },
    },
    ice_shard: {
        id: "ice_shard",
        name: "Ice Shard",
        damage: 150,
        etherCost: 2,
        type: "magic",
        targetType: "single",
        description: "Launch freezing ice.",
        element: "ice",
        statusEffect: { type: "freeze", duration: 2, value: 1 },
    },
    guard_break: {
        id: "guard_break",
        name: "Guard Break",
        damage: 100,
        etherCost: 1,
        type: "physical",
        targetType: "single",
        description: "Ignore enemy defense briefly.",
        statusEffect: { type: "buff_atk", duration: 3, value: 20 },
    },
    group_heal: {
        id: "group_heal",
        name: "Group Heal",
        damage: -60,
        etherCost: 3,
        type: "heal",
        targetType: "all",
        description: "Heal all party members.",
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
};

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
};