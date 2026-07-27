// rpg/data/cutsceneData.ts — 컷신 시퀀스 선언 (연출 타임라인, 데이터 주도)
import type { Vec3 } from "../types/RpgTypes";
import type { DialogueLine } from "./storyData";
import type { StoryState } from "../presenter/slices/storySlice";

export type CutsceneStep =
    | { type: "say"; line: DialogueLine }
    /** 카메라 이동 — pos 생략 시 현 위치 고정, lookAt만 전환. ms 동안 보간 후 hold ms 유지 */
    | { type: "cam"; pos?: Vec3; lookAt: Vec3; ms: number; hold?: number }
    /** 3인칭 카메라로 복귀 보간 */
    | { type: "camReset"; ms: number }
    | { type: "wait"; ms: number }
    | { type: "fx"; popup: { text: string; color: string } }
    /** 상태 변경 — startCutscene에서 선적용됨(재생 순서와 무관) */
    | {
          type: "set";
          flags?: Record<string, boolean>;
          story?: Partial<StoryState>;
          giveGold?: number;
          giveItems?: Array<{ id: string; qty: number }>;
      }
    /** 이벤트 전투 — 진입 즉시 다음 인덱스로 저장되어 전투 복귀 후 이어서 재생 */
    | { type: "battle"; id: string; templates: string[] };

export const CUTSCENES: Record<string, CutsceneStep[]> = {
    // SP0 검증용 — SP1에서 실제 컷신으로 교체·확장
    sp0_test: [
        { type: "set", flags: { sp0_cutscene_seen: true }, giveGold: 1 },
        { type: "cam", pos: { x: 16, y: -28, z: -18 }, lookAt: { x: 12.8, y: -32, z: -14 }, ms: 1200, hold: 400 },
        { type: "say", line: { speakerId: "arin", text: "(SP0 테스트) 광장이 보인다." } },
        { type: "fx", popup: { text: "✨ 연출 테스트", color: "#7dd3fc" } },
        { type: "wait", ms: 300 },
        { type: "camReset", ms: 800 },
    ],
    sp0_test_battle: [
        { type: "say", line: { speakerId: "theo", text: "(SP0 테스트) 기척입니다 — 전투!" } },
        { type: "battle", id: "sp0_evt", templates: ["slime"] },
        { type: "say", line: { speakerId: "lotti", text: "(SP0 테스트) 전투 후에도 이어진다!" } },
        { type: "set", flags: { sp0_battle_cutscene_done: true } },
    ],
};
