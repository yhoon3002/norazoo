// rpg/data/dungeonData.ts — SP0 Task 6: 던전 프레임워크 (게이트 왕복·조명 프로파일)
//                            SP0 Task 7: 스위치-문 프리미티브 (DUNGEON_DOORS)
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

import type { Vec3 } from "../types/RpgTypes";

export type DungeonDef = {
    id: string;
    label: string;
    /** 지상↔지하 게이트 쌍 — E 상호작용으로 왕복 */
    gates: Array<{ overworld: { x: number; y: number; z: number }; underground: { x: number; y: number; z: number } }>;
    /** XZ 박스 + y 상한(이 아래면 던전 내부로 판정) */
    region: { minX: number; maxX: number; minZ: number; maxZ: number; yMax: number };
    light: { ambient: number; lamp: number; fogColor: string; fogNear: number; fogFar: number };
    /** 있으면 이 플래그(flags[requireFlag])가 true여야 게이트 진입(하강) 허용 — SP2a T3 */
    requireFlag?: string;
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
    // ===== SP2a T3 — 「침수 창고」(항구 2막) =====
    //
    // 항구층 지면은 y≈-37.25(부두 끝 소용돌이 지점 245,-19 인근 — sp2a-t2-probe.js
    // 실측 재확인). 그 하부를 헤드리스로 실측 개척(scratchpad/sp2a-t3-explore*.js,
    // sp2a-t3-probe-final.js) 한 결과, 항구 서쪽(x 190~203, z -56~-32) 아래에
    // y≈-42.3~-43.3의 평탄한 침수 바닥이 실재함을 확인했다(디스플레이 절전 시
    // rAF 정지로 __navGroundAt이 소실되는 환경 문제가 있어 caffeinate -di로
    // 재측정 후 확정 — rpg-headless-harness 메모 참조).
    //
    // 게이트는 XZ 54.1m 이격(지상 245,-19 ↔ 지하 196,-42) — 10m+ 규약 충분 만족.
    // requireFlag: "port2_vortex_found" — T2의 port2_vortex 트리거가 세우는 플래그
    // (부두 끝 소용돌이를 확인해야 해금). 게이트 좌표는 port2_vortex 트리거
    // near(245,-15)와 3.5m 이상 이격되도록 245,-19로 소폭 이동(4.00m — 배치 감사
    // sp2a-t3-audit.ts 확인).
    {
        id: "port_warehouse",
        label: "침수 창고",
        requireFlag: "port2_vortex_found",
        gates: [
            { overworld: { x: 245, y: -37.25, z: -19 }, underground: { x: 196, y: -43.25, z: -42 } },
        ],
        region: { minX: 190, maxX: 203, minZ: -56, maxZ: -32, yMax: -40 },
        light: { ambient: 0.12, lamp: 0.5, fogColor: "#0a1c22", fogNear: 3, fogFar: 18 },
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

// ── SP0 Task 7: 스위치-문 프리미티브 ──────────────────────────────────────
//
// 좌표는 scratchpad/sp0-t7-probe*.js 헤드리스 실측값(task-7-report.md 참조).
// sp0_waterway 게이트1 지하지점(-15,11, room A)과 게이트2 지하지점(-1,5, room B)
// 사이를 1m 그리드 워크어블 스캔(__navGroundAt)한 결과, 두 방을 잇는 남북
// 통로가 x=-6.5..-4.5(폭 정확히 2.0m, 0.25m 정밀 스캔으로 z=6..15 구간 전부
// 동일 폭 확인)에 room A/B와 겹치지 않고 고립되어 존재함을 확인했다.
// 문은 이 통로 한가운데(z=9.5, room A 남쪽 경계 z≈10 바로 아래 — 통로만
// 단독으로 지나는 지점)에 폭 2.6m(통로 실폭 2.0m + 좌우 0.3m씩 여유, 통로
// 벽 안쪽으로 겹쳐 틈 없이 막음) box로 배치해 통행을 완전히 차단한다.
// 스위치는 room A 쪽(문에서 z 기준 +3.0m, 문 너머가 아닌 진입 방향 앞쪽)
// z=12.5에 배치 — 게이트1(−15,11)·게이트2(−1,5) 두 지점 모두와 6m+ 이격.
// 문·스위치 좌표 전부 __navFindWalkable 드리프트 0(직접 요청 좌표가 walkable).
export type DungeonDoorDef = {
    id: string;
    /** 이 플래그가 true면 개방(메시 제거) */
    flag: string;
    door: { pos: Vec3; size: [number, number, number] };
    switch: { pos: Vec3; label: string };
};

export const DUNGEON_DOORS: DungeonDoorDef[] = [
    {
        id: "sp0_waterway_door1",
        flag: "door_sp0_waterway_1",
        door: { pos: { x: -5.5, y: -55.323, z: 9.5 }, size: [2.6, 3.2, 0.8] },
        switch: { pos: { x: -5.5, y: -55.323, z: 12.5 }, label: "지하 수로 통로" },
    },
    // ===== SP2a T3 — 「침수 창고」 문 2개 =====
    // [수정 웨이브 — T3 리뷰 반영] 최초 배치(door1 pos.x=194, door2 pos.x=198,
    // 둘 다 size=9)는 "실측 확인된 바닥 폭 전체를 막는다"고 주석에 적었으나 실제로는
    // 방 중심에서 서쪽으로 치우쳐 있어 동쪽 가장자리에 갭이 남았고, 리뷰어가 WASD
    // 이동으로 door1을 3회 독립 재현·우회했다(스위치 없이 정예팩1 구역 진입 가능).
    // 재실측(scratchpad/fix-t3-*.js, caffeinate -di 보호 하 실행) 결과:
    //  - door1 라인(z=-46): 허브(스위치1)에서 실제 WASD로 걸어 도달 가능한 서쪽
    //    벽은 x≈192.6~193.8(그 서쪽은 다른 고도의 고립 구역 — 걸어서 도달 불가,
    //    raycast만 겹쳐 보임), 동쪽 자연 벽은 raycast 기준 x≈200.5~201(그 너머
    //    __navGroundAt이 null — 실제 벽/단차).
    //  - door2 라인(z=-39): 서쪽 벽은 door1과 동일 구조물(x≈192.6~193.9)이나,
    //    동쪽은 자연 벽 없이 항구 하부의 더 넓은 침수 베이슨으로 열려 있어
    //    x=203.5~220까지 문 없이도 남북 통과가 재현된다(door2를 열어 박스를
    //    제거한 뒤 순수 지형만으로 재확인 — walk-east가 x=219까지 막힘 없이 진행).
    //    이 "베이슨 연결"은 door 폭 조정으로 완전히 막을 수 있는 성격이 아니라
    //    별도 구조적 후속 조치가 필요한 잔여 리스크로 남긴다(§ task-3-report.md
    //    수정 웨이브 섹션 참조) — 이번 수정은 리뷰어가 재현한 근접 가장자리
    //    우회(문에서 1~5m 이내)를 닫는 데 집중한다.
    //  - door2 서쪽에는 추가로 door1엔 없는 "상층 산책로"(y≈-38.3~-39.3, 문 박스
    //    천장 y=-40.05보다 높음) 우회가 실측된다 — x=192.5에서 남쪽으로 걸으면
    //    이 상층 표면 위를 그대로 지나 z=-44까지 진입(문 박스와 아예 Y가 안 겹쳐
    //    충돌판정 자체가 발생하지 않음). door1의 같은 상층부는 z=-46 도달 전에
    //    별도 자연 벽으로 막혀 있어(fix-t3-door1-west-y.js, z=-44.95에서 정지)
    //    이 상층 우회가 없다 — door2만의 문제라 door2 높이만 확장했다(폭 재배치와
    //    같은 size 파라미터 재사용, 신규 프레임워크 없음).
    // 신규 폭은 두 문 다 서쪽 벽에 여유를 두고, door1은 동쪽 자연 벽 너머까지,
    // door2는 리뷰어 재현 지점(x=203.5)을 안전 마진과 함께 넘는 지점까지 덮는다.
    // door2 높이는 상층 산책로 실측 범위(y≈-38.3~-39.3) 위로 1m 안팎 여유를 두되,
    // 천장(pos.y+size[1]=-37.25)이 게이트 지상측 y(-37.25, 이 던전 데이터 자체가
    // 이미 "지면" 기준으로 쓰는 값)를 넘지 않게 잡아 지상으로 튀어나오지 않게 했다.
    {
        id: "port_warehouse_door1",
        flag: "door_port_warehouse_1",
        door: { pos: { x: 197, y: -43.25, z: -46 }, size: [10, 3.2, 0.8] },
        switch: { pos: { x: 200, y: -43.25, z: -44 }, label: "침수 창고 통로 1" },
    },
    {
        id: "port_warehouse_door2",
        flag: "door_port_warehouse_2",
        door: { pos: { x: 198, y: -43.25, z: -39 }, size: [13, 6, 0.8] },
        switch: { pos: { x: 200, y: -43.25, z: -38 }, label: "침수 창고 통로 2" },
    },
];

/** SP2a T3 — 던전 내부 보스 진입 지점(T4 트리거 인터페이스). 정예팩2(201,-42.25,-34)
 * 바로 북쪽, __navFindWalkable drift 0.00·실텔레포트 착지 확인(dy=0.16,
 * scratchpad/sp2a-t3-boss-verify.js). */
export const PORT_WAREHOUSE_BOSS_ENTRY: Vec3 = { x: 198, y: -42.25, z: -35 };
