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
    /** requireFlag 미충족 시 보여줄 1줄 안내 대사 — 미지정 시 DungeonController의 공용
     * 문구("소용돌이의 정체부터…", 항구 전용 표현)로 폴백(SP2a 최종 리뷰 F4). */
    lockedLine?: string;
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
        // [최종 리뷰 F4] 기존 DungeonController 공용 문구를 그대로 이관 — 동작 불변.
        lockedLine: "아직은 그냥 막힌 통로예요. 소용돌이의 정체부터 밝혀야 이 아래도 뭔가 보이겠죠.",
        gates: [
            { overworld: { x: 245, y: -37.25, z: -19 }, underground: { x: 196, y: -43.25, z: -42 } },
        ],
        region: { minX: 190, maxX: 203, minZ: -56, maxZ: -32, yMax: -40 },
        light: { ambient: 0.12, lamp: 0.5, fogColor: "#0a1c22", fogNear: 3, fogFar: 18 },
    },
    // ===== SP2a T6 — 「제단 지하」(언덕 2막) =====
    //
    // 제단(0,-210) 하부는 헤드리스로 개척한 결과 자연 벽으로 구획된 진짜 동굴(단순
    // 열린 침수 바닥이 아님 — T3 침수 창고보다 지형 굴곡이 큼)이 실재함을 확인했다.
    // 1m→0.5m 그리드(scratchpad/sp2a-t6-explore1~12.js) + Union-Find 연결성 분석
    // 결과, 제단 동쪽 x 39~69·z -202~-186 대역에 y≈-53~-56.3의 매끄러운 토굴
    // 바닥이 이어지며(항구·1막 수로와 같은 절대 고도대), 표층(y≈-14~-33, 실측 gap
    // 20~36m로 TERRAIN_STEP_MAX 2.1m를 크게 초과)과는 완전히 분리돼 있다. 단
    // x 57~65·z -184~-188 구간은 표층과 gap=0(개활 협곡/천창)으로 확인돼, 이
    // 태스크의 던전 콘텐츠(문·정예·보스)는 전부 그 이북(z ≤ -189, gap 26m+
    // 재확인)에만 배치해 표층에서 직접 낙하 진입할 위험을 원천 차단했다
    // (scratchpad/sp2a-t6-explore7.js 천창 정밀 스캔).
    //
    // Union-Find/BFS 연결성 그래프(0.5m 격자, y밴드 ±4)는 게이트 착지점과 보스
    // 진입점을 "연결 없음"으로 오판했으나(격자 해상도가 놓친 미세한 y굴곡
    // 아티팩트), 실제 WASD 왕복 재현(scratchpad/sp2a-t6-realwasd1~5.js,
    // window.__debugMove)으로 게이트 착지점 → 정예1 → 정예2 → 문1 인근 → 문2
    // 인근 → 보스 진입점까지 전 구간 순수 도보 도달을 실증했다 — 격자 그래프는
    // "연결 없음"이 나와도 참고치일 뿐, 최종 판정은 항상 실 WASD로 재확인해야
    // 한다는 교훈을 T3에 이어 재확인(T3의 "산책로 도달성" 판정과 반대 방향의
    // 반례 — 거기선 격자가 참이고 리뷰어 우회가 텔레포트 아티팩트였다면, 여기선
    // 격자가 거짓 음성이고 실제로는 연결돼 있었다. 격자만으로 최종 판정하지
    // 말라는 두 사례 공통 교훈).
    //
    // 게이트 XZ 이격: 지상(8,-204) ↔ 지하(39,-202) = 31.06m — 10m+ 규약 충분 만족.
    // requireFlag: "hill2_source_found" — T5의 hill2_source 트리거가 세우는 플래그
    // (브리프 지시). 지상 게이트는 제단(0,-210) 10.00m·hill2_witness(-3.5,-213.8)
    // 15.11m 이격 — 두 기존 근접점 모두 3.5m+ 통과(scratchpad/sp2a-t6-audit.ts).
    {
        id: "hill_undercroft",
        label: "제단 지하",
        requireFlag: "hill2_source_found",
        // [최종 리뷰 F4] 항구 전용 "소용돌이" 문구가 언덕 던전에도 그대로 노출되던 것을
        // 교체 — hill2_source 목표("반복의 근원을 찾아가자" → 목장 조사)와 정합.
        lockedLine: "반복의 진원부터 찾아야 한다. 목장 쪽을 조사하자.",
        gates: [
            { overworld: { x: 8, y: -24.25, z: -204 }, underground: { x: 39, y: -56.25, z: -202 } },
        ],
        region: { minX: 35, maxX: 72, minZ: -206, maxZ: -186, yMax: -45 },
        // 새벽/땅속 테마 — 항구(청록)·1막 수로(녹)와 구분되는 짙은 흙빛-호박 톤.
        light: { ambient: 0.13, lamp: 0.48, fogColor: "#241a10", fogNear: 3, fogFar: 19 },
    },
    // ===== SP2b T2 — 「뿌리 굴」(대삼림 2막) =====
    //
    // 대삼림 하부(테오 캠프 목조 데크 -176,-5.25,-46 인근)를 헤드리스로 실측
    // 개척(scratchpad/sp2b-t2-explore1~10.js·layout1~2.js·crosssec.js). 표층은
    // 거의 전부 __navGroundAt top===null(걸을 수 없는 험지/절벽)이고, 그 아래
    // y≈-44.3 평탄면(1m 그리드 다수 지점 정확히 동일값)이 고립된 진짜 동굴로
    // 존재한다 — 캠프 데크(y≈-5.25)와는 최소 38m 절벽으로 분리(표층↔동굴 전
    // 경계 실측, 0.1m 정밀 스캔으로 계단/램프 없음 확인 — 도보 우회 불가).
    //
    // ⚠ [1차 구현 후 리뷰 수정] 최초 배치는 이 동굴의 서쪽 더 넓은 "belly"
    // (x -190.5~-174)까지 썼으나, 문1 개방 후 실WASD 통과 배터리가 2회 연속
    // FAIL했다(scratchpad/sp2b-t2-run3/4.log). 근본원인 진단
    // (sp2b-t2-door1-diagnose.js — rAF 확정 샷 + 문 메시/environmentMeshes 제거
    // 확인 + 4방향 개별 트레이스)으로 "문은 정상 개방·제거됨(콜리전 리스트에서도
    // 빠짐)"을 먼저 확인했고, 그 다음 x -186.2~-185.6 사이 폭 0.6~1.0m의 자연
    // 틈(Walkable.glb 밴드 양쪽 다 null인 실제 지형 간극, sp2b-t2-boundary-
    // scan3.js)을 실측했다 — 이 틈 통과는 rAF가 계속 도는데도(rafCount 계속
    // 증가) 플레이어 이동만 간헐적으로 정지하는 재현성 낮은 현상이라, 문 콜리전
    // 문제가 아니라 이 좁은 자연 틈 자체의 통행 신뢰성 문제로 판정했다. 서쪽
    // "belly"(게이트·정예1 옛 위치)를 포기하고 이 틈 동쪽의 넓은 본실만 사용하도록
    // 전면 재배치했다 — 지상 게이트도 이 틈 위 데크 대신 동쪽 데크(-172,-40)로
    // 옮겨 XZ 10m+ 규약을 유지한다(§ task-2-report.md "문 레이스 판별" 절 전문).
    //
    // 재배치 후 형상: 본실(x -184.8~-181.5, z -46.5~-46.7, y=-44.25 평탄, 문1
    // 이서 서쪽)에서 문1을 지나면 북쪽 곁가지(정예2, x -178.5, z -41, y=-45.25)로
    // 이어지고, 동쪽 곁가지(x -176~-170.9, z -41~-45.5, y=-44.25)를 지나 문2 →
    // 보스 진입점. 전 구간 이 틈 지대(x -186.2~-185.6)를 지나지 않는다 — 실WASD로
    // 게이트→정예1→문1 왕복(sp2b-t2-door-block-test.js류 기법 재사용) 및 문2→
    // 보스 구간 재확인 완료(§ task-2-report.md).
    //
    // 좌표 전부 "실텔레포트(목표 y 직행) 착지 dy" 이중 확인(scratchpad/sp2b-t2-
    // verify-direct.js, 별도 세션 2회 반복 재현 다수) — 요청 y와 착지 y가 사실상
    // 0(≤0.1m)으로 일치. 지상 게이트만 T1 관례대로 자유낙하(고도100) 확인.
    //
    // 게이트 XZ 이격: 지상(-172,-40) ↔ 지하(-184.8,-46.7) = 14.45m — 10m+ 규약
    // 충분 만족. 지상 게이트는 forest_theo 트리거(-176,-46)와 7.21m(≥3.5m) 이격.
    // requireFlag: "forest_rift_found" — T1의 forest_rift 트리거가 세우는 플래그.
    {
        id: "forest_rootcave",
        label: "뿌리 굴",
        requireFlag: "forest_rift_found",
        lockedLine: "대삼림의 계절이 뒤엉킨 자리부터 찾아야 이 아래도 볼 수 있을 겁니다.",
        gates: [
            { overworld: { x: -172, y: -6.25, z: -40 }, underground: { x: -184.8, y: -44.25, z: -46.7 } },
        ],
        region: { minX: -186, maxX: -169, minZ: -48, maxZ: -40, yMax: -38 },
        // 심녹 조명 — phen_forest 현상 톤(포그 #9fb86a·파티클 #e8c06a)과 결이 이어지되
        // 던전 특유의 짙은 채도로 낮춘 심녹.
        light: { ambient: 0.13, lamp: 0.5, fogColor: "#102819", fogNear: 3, fogFar: 19 },
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
    //  - 서쪽 "상층 산책로"(y≈-38.3~-39.3, 기본 문 천장 y=-40.05보다 높음) 우회는
    //    두 문 모두에 실측된다 — x≈190~192.5에서 남쪽으로 걸으면 이 상층 표면 위를
    //    그대로 지나 문 박스와 Y가 안 겹쳐 충돌판정 자체가 발생하지 않는다.
    //    (수정 웨이브에서 door1엔 "자연 벽(z=-44.95)이 막는다"고 적었으나 이는
    //    저층 서쪽 경계 테스트(fix-t3-door1-newedge WEST) 결과의 오인용 — 재리뷰가
    //    fix-t3-door1-west-y.js 2회 재실행으로 z=-49.63/-51.65 진입을 실증했다.)
    //    → 두 문 다 높이 6으로 상향해 산책로 대역을 덮는다(size 파라미터 재사용,
    //    신규 프레임워크 없음).
    // 신규 폭은 두 문 다 서쪽 벽에 여유를 두고, door1은 동쪽 자연 벽 너머까지,
    // door2는 리뷰어 재현 지점(x=203.5)을 안전 마진과 함께 넘는 지점까지 덮는다.
    // 문 높이(6)는 상층 산책로 실측 범위(y≈-38.3~-39.3) 위로 1m 안팎 여유를 두되,
    // 천장(pos.y+size[1]=-37.25)이 게이트 지상측 y(-37.25, 이 던전 데이터 자체가
    // 이미 "지면" 기준으로 쓰는 값)를 넘지 않게 잡아 지상으로 튀어나오지 않게 했다.
    //
    // [T3 재리뷰 후속 판정 — 산책로 도달성, § task-3-report.md "산책로 도달성 판정"
    // 섹션 전문 참조] 높이 6 적용 후에도 재리뷰가 fix-t3-door1-west-y.js를 2회
    // 재실행해 여전히 통과(x≈189.7, door1 박스 서단 x=192 바깥)를 재현했다 —
    // 이건 높이가 아니라 산책로 자체가 박스 서쪽으로 계속 이어지는 문제(그리드
    // 스캔 sp2a-t3c-walkway-map.js: 산책로가 z=-36~-50 대부분 라인에서
    // x=182~206 연속, 22m+ — 문 폭으로 봉쇄 불가능한 규모, door2 동쪽 베이슨과
    // 같은 "개척 지형이 폐쇄 공간 아님" 뿌리). 그래서 봉쇄 자체는 포기하고, 대신
    // "정상 플레이로 이 산책로에 도달 가능한가"를 별도로 판정했다(모든 기존
    // 우회 재현이 산책로 위 좌표로 텔레포트 착지 후 WASD를 이어간 것이었다는
    // 점이 재리뷰에서 지적됨 — 도보 도달성 자체가 미검증 상태였음).
    //
    // 판정: **정상 도보로 도달 불가**. 근거 둘 다 신규 스크립트로 확인(전문은
    // task-3-report.md):
    //  (a) 게이트 지하 착지점(196,-43.25,-42)에서 8방향 실WASD(sp2a-t3c-
    //      real-wasd-confirm.js) — 어느 방향도 y=-40.2를 넘지 못함(최고 도달
    //      -41.25). FieldPlayer.tsx의 TERRAIN_STEP_MAX(2.1m, 스텝업/슬라이드
    //      한계)를 그대로 반영한 고도-연속성 BFS(sp2a-t3c-elevation-grid.js,
    //      0.5m 그리드)도 동일 결론(허브에서 도달 가능한 최고점 y=-42.34,
    //      산책로 밴드 미도달) — 벽 유무와 무관하게 단차만으로 이미 불가.
    //  (b) 더 근본적으로, 산책로 층(y -40.2~-37.5)과 그 아래 침수 바닥/문 상호작용
    //      층(스위치·정예팩·보스 진입점이 전부 위치한 y -43.3~-42.25) 사이
    //      수직 간격을 던전 region 전역(x 178~212, z -58~-30, 0.5m 그리드,
    //      다층 셀 1356개·간격 샘플 1058개)에서 전수 계산(sp2a-t3c-layer-gap-
    //      scan.js) — 최소 간격이 **2.85m**로 TERRAIN_STEP_MAX(2.1m)를 넘는
    //      지점이 하나도 없다(0/1058). 즉 산책로는 "항구 지상 쪽에서는 걸어서
    //      닿을 수 있어 보이는(별도 확인은 안 했으나 지형이 광범위하게 이어짐)
    //      평범한 지상층"일 가능성이 높지만, 이 던전의 실제 콘텐츠(스위치·정예팩·
    //      보스 진입점)는 전부 그 2.85m+ 아래 별도 층에 있어 산책로에서 도보로
    //      내려갈 수 없다 — 산책로에 서더라도 실제로 스킵할 수 있는 대상이
    //      없다(문 콜리전을 강제 개방해 순수 지형만으로 재확인, 던전 게이트/hub
    //      착지점 기준 방향 무관하게 동일).
    // 텔레포트류(세이브 로드·체크포인트 등, maxDrop 6m 허용)가 이 산책로 층에
    // 직접 착지시키지 않는 한 실질적 우회는 없다 — door2 동쪽 원거리 베이슨과
    // 함께 "환경 콜리전 벽 메시 추가"가 필요한 후속 티켓으로 남긴다(§5 참조).
    // 이번 재리뷰에서는 문 높이 6(방어적 상향, 위 높이 적용은 원인이 아니었어도
    // 무해하므로 유지)만 유지하고 추가 봉쇄 구조물은 넣지 않았다.
    {
        id: "port_warehouse_door1",
        flag: "door_port_warehouse_1",
        door: { pos: { x: 197, y: -43.25, z: -46 }, size: [10, 6, 0.8] },
        switch: { pos: { x: 200, y: -43.25, z: -44 }, label: "침수 창고 통로 1" },
    },
    {
        id: "port_warehouse_door2",
        flag: "door_port_warehouse_2",
        door: { pos: { x: 198, y: -43.25, z: -39 }, size: [13, 6, 0.8] },
        switch: { pos: { x: 200, y: -43.25, z: -38 }, label: "침수 창고 통로 2" },
    },
    // ===== SP2a T6 — 「제단 지하」 문 2개 =====
    // 좌표는 전부 scratchpad/sp2a-t6-explore11.js·sp2a-t6-final-precise.js
    // (__navFindWalkable 드리프트 + 실텔레포트 착지 이원 검증) 확정치.
    //
    // door1(z=-196): 챔버(정예 2팩이 있는 큰 방, x 49.5~62.5·13.5m 폭 — 0.5m
    // 그리드 실측 scratchpad/sp2a-t6-explore12.js)의 남쪽 경계. 폭 16(span
    // [48,64])으로 실측 벽 전체를 여유 있게 덮는다. 스위치1은 챔버 안쪽(문
    // 기준 진입 방향 앞쪽, T3/sp0 관례)에 배치.
    // door2(z=-190): 문1 이후 좁아지는 통로 구간의 병목(x 55.5~72 사이 3~4개
    // 평행 가닥으로 갈라짐 — sp2a-t6-explore12.js z슬라이스). 폭 12(span
    // [57.5,69.5])로 확인된 가닥 3개(55.5~56.5·63.5~67.5·68.5~72 인접)를
    // 한 번에 덮는다 — T3 door2가 "동쪽 원거리 베이슨" 잔여 리스크를 남겼던
    // 전례를 반영해 처음부터 폭을 넉넉히 잡았다(§ task-6-report.md 배치 감사
    // 참조, 완전 봉쇄 여부는 검증 스크립트 sp2a-t6-hillboss.js에서 실WASD로
    // 재확인).
    {
        id: "hill_undercroft_door1",
        flag: "door_hill_undercroft_1",
        door: { pos: { x: 56, y: -54.25, z: -196 }, size: [16, 5, 1.2] },
        switch: { pos: { x: 49.73, y: -55.25, z: -197 }, label: "제단 지하 통로 1" },
    },
    {
        id: "hill_undercroft_door2",
        flag: "door_hill_undercroft_2",
        door: { pos: { x: 63.5, y: -54.25, z: -190 }, size: [12, 5, 1.2] },
        switch: { pos: { x: 60.71, y: -54.25, z: -191.71 }, label: "제단 지하 통로 2" },
    },
    // ===== SP2b T2 — 「뿌리 굴」 문 2개 =====
    // [재배치 후 확정치 — 위 DUNGEONS 항목의 "1차 구현 후 리뷰 수정" 주석 참조]
    // 이 던전은 동서로 긴 굴이라 T3/T6와 달리 문이 "동서 통행"을 막는 방향 —
    // size[0](x, 두께)를 얇게, size[2](z, 폭)를 넓게 잡는다(장축이 반대인
    // sp0/T3/T6와 90도 회전된 배치). 실측 폭(0.1m 정밀 스캔)은 문1 인근 ~2.2m·
    // 문2 인근 ~3.1m — 양쪽 다 z폭 5.0m로 넉넉히 덮는다(T3 근접 우회 전례 반영).
    // 스위치는 각 문의 진입 방향 쪽(문1은 정예1/게이트 쪽, 문2는 정예2 쪽)에
    // 배치 — 기존 관례 그대로. 좌표 전부 실텔레포트 dy=0.09 이하 확인
    // (scratchpad/sp2b-t2-verify-direct.js, 재배치 후 좌표 재검증 포함).
    {
        id: "forest_rootcave_door1",
        flag: "door_forest_rootcave_1",
        door: { pos: { x: -181.5, y: -44.25, z: -46.5 }, size: [1.2, 6, 5.0] },
        switch: { pos: { x: -183, y: -44.25, z: -46.6 }, label: "뿌리 굴 통로 1" },
    },
    {
        id: "forest_rootcave_door2",
        flag: "door_forest_rootcave_2",
        door: { pos: { x: -173.5, y: -44.25, z: -44.5 }, size: [1.2, 6, 5.0] },
        // [2차 재배치] 원안(-176,-45.5)은 정예2와 4.03m로 너무 가까웠다 — gameData.ts
        // FIELD_ENEMIES "2차 재배치 확정치" 주석 참조. 문 바로 옆으로 당겨 정예2와의
        // 여유를 최대화(문2 서쪽면과 0.5m — sp0/T3 관례상 스위치는 문 인근이 정상).
        switch: { pos: { x: -174, y: -44.25, z: -44.5 }, label: "뿌리 굴 통로 2" },
    },
];

/** SP2a T3 — 던전 내부 보스 진입 지점(T4 트리거 인터페이스). 정예팩2(201,-42.25,-34)
 * 바로 북쪽, __navFindWalkable drift 0.00·실텔레포트 착지 확인(dy=0.16,
 * scratchpad/sp2a-t3-boss-verify.js). */
export const PORT_WAREHOUSE_BOSS_ENTRY: Vec3 = { x: 198, y: -42.25, z: -35 };

/** SP2a T6 — 던전 내부 보스 진입 지점. 문2(63.5,-190) 너머 안전 대역(표층 gap
 * 30.30m — 천창 구간 z>-188과 4m+ 이격). __navFindWalkable drift 0.00·
 * 실텔레포트 착지 확인(dy=0.25, scratchpad/sp2a-t6-final-precise.js). */
export const HILL_UNDERCROFT_BOSS_ENTRY: Vec3 = { x: 69, y: -54.25, z: -189 };

/** SP2b T2 — 던전 내부 보스 진입 지점(T3 트리거 인터페이스). 문2(-173.5,-44.5) 너머
 * 동쪽 곁가지 — 정예2(-177.5,-44.25,-46.5)와 6.82m 이격(2차 재배치 후 — gameData.ts
 * FIELD_ENEMIES 주석의 배치 한계 참조, 8m 미달이나 방 실측 한계 내 최댓값). 실텔레포트
 * 착지 확인 dy=0.00(별도 세션 2회 재현, scratchpad/sp2b-t2-verify-direct.js). */
export const FOREST_ROOTCAVE_BOSS_ENTRY: Vec3 = { x: -170.9, y: -44.25, z: -44.8 };
