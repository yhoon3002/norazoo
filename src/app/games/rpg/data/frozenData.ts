// rpg/data/frozenData.ts — 굳은 주민 조사 이벤트 데이터 (SP1 §①)
// 시계탑이 멈춘 밤 그 자리에 굳어버린 주민들. FrozenVillager 컴포넌트가 렌더.
// 에필로그(시계탑 복구) 전: paused+FROZEN_TINT 정지 인형 → E로 frozen 대사·1회 보상.
// 에필로그 후: 틴트 해제·idle 재생 → E로 awake 감사 대사 1줄(플래그·보상 없음).
// T1: 테스트 1명(f_test)만 배치 — T2에서 카탈로그 20명으로 교체.

import type { DialogueLine } from "./storyData";

export type FrozenVillagerDef = {
    id: string;
    pos: { x: number; y: number; z: number };
    model: string; // "/character/*.fbx" 기존 15종 중
    rotationY?: number;
    /** 굳은 상태 조사 대사 (2~3줄) */
    frozen: DialogueLine[];
    /** 에필로그 후 각성 대사 (1줄) */
    awake: DialogueLine[];
    reward?: { gold?: number; items?: Array<{ id: string; qty: number }> };
};

/** 시간에 갇힌 청회색 — SP0 틴트 시스템(ModelAvatar tint) 재사용 */
export const FROZEN_TINT = "#8fa8b8";

export const FROZEN_VILLAGERS: FrozenVillagerDef[] = [
    // T1 프레임워크 검증용 — 광장 근처 walkable 실측(드리프트 0.00m, 기존 스팟 6.5m+ 이격)
    {
        id: "f_test",
        pos: { x: 22, y: -33.25, z: -23 },
        model: "/character/Chef_Hat.fbx",
        rotationY: Math.PI,
        frozen: [
            {
                speakerId: "lotti",
                text: "이 사람, 냄비를 젓다가 그대로 굳었나 봐… 국물 냄새가 아직 나는 것 같아.",
            },
            {
                speakerId: "theo",
                text: "체온이 남아 있어요. 죽은 게 아니라 시간이 멈췄을 뿐입니다 — 되돌릴 수 있어요.",
            },
        ],
        awake: [
            {
                speaker: "주민",
                text: "어라… 방금까지 국을 젓고 있었는데! 고마워요, 덕분에 살았어요!",
            },
        ],
        reward: { gold: 15 },
    },
];
