// rpg/data/gameData.ts
import * as THREE from "three";
import type { Skill, Equipment, Character, Enemy } from "../types/RpgTypes";


export const ENEMY_MODEL_BY_TEMPLATE: Record<string, string> = {
    slime: "/character/Zombie_Female.fbx",
    orc: "/character/Goblin_Male.fbx",
    mage: "/character/Wizard.fbx",
};

// 필드 적 데이터 단일 소스 — FieldScene(렌더링)·FieldPlayer(충돌) 공용
export const FIELD_ENEMIES: Array<
    | { id: string; pos: THREE.Vector3; templates: string[] }
    | { id: string; pos: THREE.Vector3; template: string }
> = [
    { id: "e1", pos: new THREE.Vector3(-10, 0, 3), templates: ["slime", "slime"] },
    { id: "e2", pos: new THREE.Vector3(2, 0, 2),   templates: ["orc", "slime", "mage"] },
    { id: "e3", pos: new THREE.Vector3(4, 0, 8),   template: "mage" },
];

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

export const DEFAULT_PARTY: Character[] = [
    {
        id: "gustave",
        name: "Gustave",
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
        id: "maelle",
        name: "Maëlle",
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
        id: "sciel",
        name: "Sciel",
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
        portrait: "⚔️",
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
            ],
        },
    },
};