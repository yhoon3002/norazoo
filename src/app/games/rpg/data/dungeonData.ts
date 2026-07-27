// rpg/data/dungeonData.ts — SP0 Task 6: 던전 프레임워크 (게이트 왕복·조명 프로파일)
//
// 좌표는 전부 헤드리스 프로브 실측값(scratchpad/sp0-t6-probe*.js, task-6-report.md 참조).
// 마을 광장 서북쪽(x −20..8, z −3..20) 아래에 y≈-55.32 평탄면의 지하 수로층이
// 존재함을 확인했다(위 표층 y≈-30~-33 아래 22~25m). __navFindWalkable 스냅
// 드리프트는 게이트 4지점 전부 ≤0.005m(사실상 0)로 확인됐다.
//
// 게이트 좌표는 의도적으로 지상↔지하가 XZ 기준 10m+ 떨어지도록 배치했다 —
// FieldPlayer의 텔레포트 재지면판정(needCheck)이 XZ 이동 거리 기준으로만
// "텔레포트"를 감지하기 때문에(같은 XZ·Y만 다른 순간이동은 posChangedFar가
// 트리거되지 않아 다음 프레임에 캐시된 y로 되돌아간다 — 헤드리스 검증 중 실측
// 확인됨). 지상 게이트에서 내려가면 지하 수로 반대쪽 지점으로, 그 지점에서
// 다시 다른 지상 출구로 나오는 "왕복 순환" 구조.

export type DungeonDef = {
    id: string;
    label: string;
    /** 지상↔지하 게이트 쌍 — E 상호작용으로 왕복 */
    gates: Array<{ overworld: { x: number; y: number; z: number }; underground: { x: number; y: number; z: number } }>;
    /** XZ 박스 + y 상한(이 아래면 던전 내부로 판정) */
    region: { minX: number; maxX: number; minZ: number; maxZ: number; yMax: number };
    light: { ambient: number; lamp: number; fogColor: string; fogNear: number; fogFar: number };
};

export const DUNGEONS: DungeonDef[] = [
    {
        id: "sp0_waterway",
        label: "지하 수로",
        gates: [
            // 게이트 1 — 지상(-1,1) → 지하(-15,11). XZ 이격 17.2m.
            { overworld: { x: -1, y: -30.16, z: 1 }, underground: { x: -15, y: -55.32, z: 11 } },
            // 게이트 2 — 지상(-15,19) → 지하(-1,5). XZ 이격 19.8m. 지하 지점 간 15.2m 이격.
            { overworld: { x: -15, y: -29.42, z: 19 }, underground: { x: -1, y: -55.32, z: 5 } },
        ],
        region: { minX: -20, maxX: 8, minZ: -3, maxZ: 20, yMax: -36 },
        light: { ambient: 0.14, lamp: 0.55, fogColor: "#0c211f", fogNear: 3, fogFar: 20 },
    },
];

/** 순수 함수 — XZ 박스 + y 상한 판정. 박스 밖이거나 yMax 이상이면 null. */
export function dungeonAt(x: number, y: number, z: number): DungeonDef | null {
    for (const d of DUNGEONS) {
        const r = d.region;
        if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
        if (y >= r.yMax) continue;
        return d;
    }
    return null;
}
