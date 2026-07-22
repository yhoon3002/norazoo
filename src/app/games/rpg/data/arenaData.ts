// rpg/data/arenaData.ts — 투기장 웨이브 구성/보상 (반복 전투 콘텐츠)
// 10웨이브까지 난이도 상승, 이후는 최종 구성 반복(보상 골드는 계속 점증) — 무한 반복 전투.
export const ARENA_WAVES: string[][] = [
    ["slime", "slime"], ["wild_dog", "wild_dog", "slime"], ["orc", "slime"],
    ["ghoul", "zombie"], ["orc", "orc"], ["witch", "mad_bull"],
    ["ninja", "ninja"], ["frost_witch", "ghoul", "ghoul"], ["clockwork_soldier", "clockwork_soldier"],
    ["shade_beast", "clockwork_soldier", "clockwork_soldier"],
];
export const arenaWaveOf = (n: number) => ARENA_WAVES[Math.min(n, ARENA_WAVES.length - 1)];
export const arenaReward = (n: number) => ({ gold: 100 + 50 * n, item: n % 3 === 2 ? ["monster_core", "silver_ore", "dark_crystal"][(Math.floor(n / 3)) % 3] : null });
