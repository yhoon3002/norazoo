// rpg/data/zonePhenomena.ts — SP0 Task 8: 존 현상 툴킷 (선언적 환경 오버라이드)
// 존별로 "현상"(fog·디렉셔널 라이트·앰비언트 틴트·정적 파티클) 세트를 데이터로
// 선언해두면, ZonePhenomenon 컴포넌트가 플레이어 위치 → 존 판정(보로노이,
// ZONE_DEFS 최근접 중심) → 해당 존의 활성(flag=true) 현상을 적용/원복한다.
// SP2에서 스토리 이벤트가 flags[phenomenon.flag]를 true/false로 토글하는 것만으로
// 새 현상을 연출할 수 있도록 하는 것이 목적 — 항구 "멈춘 파도"가 첫 프로토타입.

import { ZONE_DEFS, type ZoneId } from "./placementData";

export type PhenomenonDef = {
    zone: ZoneId; // ZONE_DEFS id
    flag: string; // 이 플래그가 true인 동안 활성 (SP2에서 스토리로 제어)
    fog?: { color: string; near: number; far: number };
    dirIntensity?: number; // 디렉셔널 라이트 강도 오버라이드
    ambientColor?: string; // 앰비언트 틴트
    particles?: { count: number; color: string; size: number; yBand: [number, number] };
};

// 배열 순서 = 우선순위 — 같은 존에서 여러 현상이 동시에 활성(flag=true)이면
// 배열상 앞에 놓인 항목이 이긴다(phenomenonAt은 Array.find로 첫 매치를 반환 —
// SP2a에서 phen_port2가 phen_port "재발"판으로 항구에 겹쳐 점등될 때, phen_port2를
// 이 배열의 phen_port 항목 앞에 배치하면 별도 로직 변경 없이 우선순위가 해결된다).
export const ZONE_PHENOMENA: PhenomenonDef[] = [
    // SP2a T2 — 「멈춘 파도」 재발(강화판). phen_port(1막)보다 앞에 두어 두 플래그가
    // 공존해도(구세이브 잔존 등) 이 항목이 우선한다 — 포그 짙고 파티클 증량.
    {
        zone: "port",
        flag: "phen_port2",
        fog: { color: "#46626f", near: 10, far: 55 },
        dirIntensity: 2.2,
        particles: { count: 550, color: "#dceaf2", size: 0.07, yBand: [-38, -30] },
    },
    {
        zone: "port",
        flag: "phen_port",
        fog: { color: "#5b7a8c", near: 12, far: 70 },
        dirIntensity: 2.6, // 기본 5.2의 절반 — 멈춘 새벽빛
        ambientColor: "#a8c4d4",
        particles: { count: 400, color: "#cfe8f5", size: 0.06, yBand: [-38, -30] },
    },
    // SP2a T5 — 바람 언덕 「반복되는 하루」. hill 존에 기존 현상 항목이 없어 우선순위 경합이
    // 없다(port2/port처럼 같은 존에서 겹치는 항목이 있을 때만 배열 순서가 의미를 가진다).
    // 호박색 여명이 미동 없이 고정된 인상 — 짙은 호박빛 포그·낮은 디렉셔널·앰비언트 틴트·
    // 뜬 채 멈춘 꽃가루 파티클. yBand는 hill 존 도보 구간 표고(대략 -33~-7) 중 트리거
    // 3곳 실측 표고(-20.56~-31.32)를 감싸는 대역으로 선정.
    {
        zone: "hill",
        flag: "phen_hill",
        fog: { color: "#c9a86a", near: 14, far: 80 },
        dirIntensity: 3.2,
        ambientColor: "#e8c890",
        particles: { count: 300, color: "#f5e6c8", size: 0.05, yBand: [-30, -12] },
    },
    // SP2b T1 — 서부 대삼림 「계절이 뒤엉킨 숲」. west_forest 존 첫 현상(우선순위 충돌 없음).
    // 사계 혼재 인상 — 연둣빛 포그·낮춘 디렉셔널·이중 톤(신록+단풍) 파티클. yBand는 조사
    // 아크 4지점 실측 표고(-20.25~-9.25, scratchpad/sp2b-t1-probe2.js)를 감싸는 대역으로 선정.
    {
        zone: "west_forest",
        flag: "phen_forest",
        fog: { color: "#9fb86a", near: 12, far: 70 },
        dirIntensity: 2.6,
        particles: { count: 450, color: "#e8c06a", size: 0.06, yBand: [-25, -5] },
    },
];

/**
 * 순수 함수 — (x, z)에서 최근접 ZONE_DEFS 중심(보로노이)의 존을 판정한 뒤,
 * 그 존에 속한 현상 중 flags[flag]가 true인 항목을 반환한다. 없으면 null.
 * 던전 내부 판정(__dungeonActive)은 scene 접근이 필요하므로 호출자(ZonePhenomenon
 * 컴포넌트) 책임 — 이 함수는 좌표·플래그만으로 결정되는 순수 판정만 담당한다.
 */
export function phenomenonAt(
    x: number,
    z: number,
    flags: Record<string, boolean>
): PhenomenonDef | null {
    let nearestZone: ZoneId | null = null;
    let bestDistSq = Infinity;
    for (const zone of ZONE_DEFS) {
        const dx = x - zone.cx;
        const dz = z - zone.cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < bestDistSq) {
            bestDistSq = distSq;
            nearestZone = zone.id;
        }
    }
    if (!nearestZone) return null;

    return ZONE_PHENOMENA.find((p) => p.zone === nearestZone && !!flags[p.flag]) ?? null;
}
