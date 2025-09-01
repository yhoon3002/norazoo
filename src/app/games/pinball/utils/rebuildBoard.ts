import { BoardState } from "../types/PinballTypes";
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    CANVAS_WALL,
    SLOT_H,
} from "../data/constants";
import { mulberry32 } from "../data/random";

/**
 * density: 1.0(기본)보다 크면 더 촘촘, 작으면 듬성듬성
 * fillToEdges: 좌우 가장자리까지 peg이 오도록 간격을 "정확히" 분할
 * zigzag: 지그재그(갈톤 보드 스타일) 배치 여부
 */
export default function rebuildBoard(
    board: BoardState,
    players: string[],
    seed: number,
    lockSeed: boolean,
    density = 1.35,
    fillToEdges = true,
    zigzag = true
) {
    // RNG
    board.rng = lockSeed ? mulberry32(seed) : Math.random;

    // ------- 그릴 영역 정의 -------
    const left = CANVAS_WALL;
    const right = CANVAS_WIDTH - CANVAS_WALL;
    const top = 120; // 제목/HUD 영역 여백
    const bottom = CANVAS_HEIGHT - (SLOT_H + CANVAS_WALL + 12); // 슬롯 윗선 위까지
    const innerW = right - left;
    const innerH = bottom - top;

    // ------- 촘촘도(간격) 계산 -------
    // 기본 목표 간격을 밀도에 따라 줄임 (density↑ => gap↓)
    const baseGap = 44; // 기존 GAP_X 과 비슷한 기준
    const baseGapY = 54; // 기존 GAP_Y 과 비슷한 기준
    const gapXTarget = baseGap / density;
    const gapYTarget = baseGapY / density;

    // 가로/세로 peg 개수 결정
    // - fillToEdges=true면, 간격을 "정확히" 재분배해서 첫 peg=left, 마지막 peg=right에 오도록 함
    // - 최소 3개 이상 보장
    const cols = Math.max(3, Math.floor(innerW / gapXTarget) + 1);
    const rows = Math.max(5, Math.floor(innerH / gapYTarget) + 1);

    // 실제 간격 (가장자리에 정확히 맞추도록 재계산)
    const gapX = fillToEdges ? innerW / (cols - 1) : gapXTarget;
    const gapY = fillToEdges ? innerH / (rows - 1) : gapYTarget;

    // ------- pegs 생성 -------
    const pegs = [];
    for (let r = 0; r < rows; r++) {
        const y = top + r * gapY;

        if (zigzag) {
            // 지그재그(삼각격자). 홀수 줄은 반칸 오프셋
            const offset = (r % 2) * (gapX * 0.5);
            // 반칸 이동으로 생기는 양끝 peg 손실을 막기 위해 범위 체크해서 추가
            let x = left + offset;
            while (x <= right + 0.0001) {
                if (x >= left - 0.0001 && x <= right + 0.0001)
                    pegs.push({ x, y });
                x += gapX;
            }
        } else {
            // 직교 격자 (좌우 완전 정렬)
            for (let c = 0; c < cols; c++) {
                const x = left + c * gapX;
                pegs.push({ x, y });
            }
        }
    }
    board.pegs = pegs;

    // ------- slots (플레이어 수에 맞춰 균등 분할) -------
    const slotTop = CANVAS_HEIGHT - SLOT_H - CANVAS_WALL;
    const slotsInnerW = CANVAS_WIDTH - CANVAS_WALL * 2;
    board.slots = players.map((_, i) => {
        const w = slotsInnerW / Math.max(1, players.length);
        return { x: CANVAS_WALL + i * w, y: slotTop, w, i };
    });
}
