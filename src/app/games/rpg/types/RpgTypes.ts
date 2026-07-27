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
        type: "poison" | "burn" | "freeze" | "stun" | "buff_atk" | "buff_def" | "debuff_def" | "regen" | "speed";
        duration: number;
        value: number;
    };
    /** 전용 캐릭터 — 지정 시 해당 캐릭터만 습득 */
    character?: PartyId;
    /** 습득 레벨 — 지정 시 해당 레벨부터 자동 습득 (기본 1) */
    unlockLevel?: number;
};

export type Equipment = {
    id: string;
    name: string;
    type: "weapon" | "armor" | "accessory";
    stats: Partial<Stats>;
    skills?: string[];
    rarity: "common" | "rare" | "epic" | "legendary";
};

/** 파티 캐릭터 고정 id — 대사 speakerId/메타 조회 키 */
export type PartyId = "arin" | "theo" | "lotti";

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
    /** 생성 원본 템플릿 키 (유닛별 공격 프로필 조회용) */
    template?: string;
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
    /** 모델 스케일 배율 (기본 1) — 보스급 대형 몬스터용 */
    scale?: number;
    /** 기본공격 모션 변형(예: 원거리 시전형은 shoot) — 미지정 시 attack(펀치) */
    preferredAttack?: PreferredAttack;
    /** 보스 정의 — 있으면 applyDamage에서 hp 임계 페이즈 전이를 체크 (세이브 호환 위해 optional) */
    boss?: BossDef;
    /** 현재 비주얼 틴트(페이즈 전이로 부여) — ModelAvatar가 머티리얼 색상에 곱함 */
    tint?: string;
    /** 도달한 최고 보스 페이즈 인덱스 (-1/미지정 = 기본 페이즈) */
    phase?: number;
    /** 보스 기믹(카운트다운 등) 누적 충전값 — 실행 로직은 Task 5 범위 */
    gimmickCharge?: number;
};

export type BossPhase = {
    /** 이 페이즈로 전이되는 HP 비율 상한 — hp/maxHp ≤ hpPct 이면 해당 페이즈 이상 */
    hpPct: number;
    announce?: string;
    skills?: string[];
    aiPattern?: Enemy["aiPattern"];
    tint?: string;
    scaleMul?: number;
};

export type BossDef = {
    phases: BossPhase[]; // hpPct 내림차순 정렬 가정 (예: [0.7, 0.3])
    gimmick?: { type: "countdown"; every: number; skillId: string; warning: string };
};

export type CombatAction = {
    type: "attack" | "skill" | "item" | "escape";
    actorId: string;
    targetId?: string; // 단일 대상
    targetIds?: string[]; // 다수 대상(AoE)
    skillId?: string;
    itemId?: string;
};

export type Telegraph = {
    startAt: number;
    hitAt: number; // = hits[0] (하위 호환)
    endAt: number;
    /** 다단 히트 타격 시각들(절대시간). 없으면 [hitAt]으로 취급 */
    hits?: number[];
    /** false면 패리 불가(회피 전용) 공격 */
    parryable?: boolean;
    /** 수축 링/차징 글로우 색 */
    ringColor?: string;
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

export type SaveV1 = {
    version: 1;
    player: Player;
    world: { mapId: string; time: number };
    flags: Record<string, boolean>;
    bag: { id: string; qty: number }[];
    treasures: Treasure[];
    unlockedSkills: string[];
    unlockedEquipment: string[];
    /** 스토리 진행 (v1 후기 추가 — 없으면 초기값) */
    story?: {
        stage: string;
        objective: string;
        target?: null | { x: number; z: number };
        respawn: null | { x: number; y: number; z: number; label: string };
    };
    /** 처치 카운트/의뢰 기준점 (v1 후기 추가 — 없으면 빈 객체) */
    counters?: Record<string, number>;
};

export type SaveData = SaveV1;

export type PreferredAttack = "attack" | "shoot" | "punch";
