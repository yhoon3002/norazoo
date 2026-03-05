// rpg/types/RpgTypes.ts
export type Vec3 = { x: number; y: number; z: number };

export type Stats = {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    atk: number;
    def: number;
    speed: number;
    luck: number;
};

export type Skill = {
    id: string;
    name: string;
    damage: number; // 힐은 음수
    etherCost: number; // 캐릭터별 에테르 소모
    type: "physical" | "magic" | "heal" | "buff";
    targetType: "single" | "all" | "self";
    description: string;
    element?: "fire" | "ice" | "lightning" | "earth";
    statusEffect?: {
        type: "poison" | "burn" | "freeze" | "stun" | "buff_atk" | "buff_def";
        duration: number;
        value: number;
    };
};

export type Equipment = {
    id: string;
    name: string;
    type: "weapon" | "armor" | "accessory";
    stats: Partial<Stats>;
    skills?: string[];
    rarity: "common" | "rare" | "epic" | "legendary";
};

export type Character = {
    id: string;
    name: string;
    level: number;
    exp: number;
    expToNext: number;
    stats?: Stats;
    baseStats: Stats;
    skills: string[];
    equipment: {
        weapon?: string;
        armor?: string;
        accessory?: string;
    };
    statusEffects: Array<{ type: string; duration: number; value: number }>;
    portrait: string;

    /** 33 원정대식 개인 에테르 */
    ether: number;
    maxEther: number;
    modelUrl?: string;
    preferredAttack?: PreferredAttack;
};

export type Player = {
    pos: Vec3;
    party: Character[];
    activeCharacter: number;
    gold: number;
    formation: "front" | "back" | "balanced";
};

export type Enemy = {
    id: string; // 전장 개체 식별자(필드 id)
    name: string;
    model: string;
    level: number;
    stats: Stats;
    skills: string[];
    statusEffects: Array<{ type: string; duration: number; value: number }>;
    aiPattern: "aggressive" | "defensive" | "balanced" | "smart";
    rewards: {
        exp: number;
        gold: number;
        items?: Array<{ id: string; chance: number }>;
    };
};

export type QTEType = "timing";
export type CombatAction = {
    type: "attack" | "skill" | "item" | "escape";
    actorId: string;
    targetId?: string; // 단일 대상
    targetIds?: string[]; // 다수 대상(AoE)
    skillId?: string;
    itemId?: string;
    qteType?: QTEType;
};

export type Telegraph = {
    startAt: number;
    hitAt: number;
    endAt: number;
};

/** ★ 타겟 선택 단계에서 사용할 보조 타입 */
export type PendingItem = { kind: "item"; actorId: string; itemId: string };
export type PendingAction = CombatAction | PendingItem;

/** CombatState: 전 단계에서 enemies 배열을 들고다님 */
export type CombatState =
    | { phase: "idle" }
    | { phase: "entering"; enemies: Enemy[] }
    | { phase: "playerMenu"; enemies: Enemy[] }
    | { phase: "skillMenu"; enemies: Enemy[]; availableSkills: string[] }
    | {
          phase: "itemMenu";
          enemies: Enemy[];
          availableItems: Array<{ id: string; qty: number }>;
      }
    | {
          /** 플레이어 QTE: 다이아 패턴(고정), 현재 스텝 인덱스 포함 */
          phase: "playerQTE";
          enemies: Enemy[];
          action: CombatAction;
          startAt: number;
          windowMs: number;
          plan: number[]; // 하이라이트 변들의 시퀀스(1~3만 사용)
          index: number; // 현재 스텝
      }
    | {
          /** ★ 타겟 선택 단계 (적/아군) */
          phase: "targetSelect";
          enemies: Enemy[];
          pending: PendingAction;
          allowedTargets: string[]; // id 목록 (아군 캐릭터 id 또는 enemy.id)
          index: number; // 현재 선택 인덱스
      }
    | {
          phase: "defenseWindow";
          enemies: Enemy[];
          enemyId: string; // 공격 주체(적)
          action: CombatAction;
          telegraph: Telegraph;
          showDefenseUi?: boolean;
      }
    | {
          phase: "enemyResolve";
          enemies: Enemy[];
          enemyId: string;
          action: CombatAction;
          effectMessage?: string;
      }
    | {
          phase: "victory";
          enemies: Enemy[];
          rewards: { exp: number; gold: number; items: string[] };
      }
    | { phase: "defeat" }
    | { phase: "turnEnd"; enemies: Enemy[] };

export type Treasure = {
    id: string;
    pos: Vec3;
    items: Array<{ id: string; qty: number }>;
    discovered: boolean;
};

export type Quest = {
    id: string;
    title: string;
    description: string;
    objectives: Array<{
        id: string;
        description: string;
        completed: boolean;
        progress: number;
        target: number;
    }>;
    rewards: {
        exp: number;
        gold: number;
        items?: Array<{ id: string; qty: number }>;
    };
    status: "available" | "active" | "completed";
};

export type SaveV1 = {
    version: 1;
    player: Player;
    world: { mapId: string; time: number };
    flags: Record<string, boolean>;
    bag: { id: string; qty: number }[];
    quests: Quest[];
    treasures: Treasure[];
    unlockedSkills: string[];
    unlockedEquipment: string[];
};

export type SaveData = SaveV1;

export type PreferredAttack = "attack" | "shoot" | "punch";
