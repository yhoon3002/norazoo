import { Cell } from "../types/MazeTypes";
import { shuffle } from "./random";

/**
 * DFS로 기본 미로를 만든 뒤, extraConnections 비율만큼
 * 인접 셀 사이 임의의 벽을 추가로 허무는 후처리로
 * 갈림길(분기)와 루프를 늘려 복잡하게 만듭니다.
 *
 * 또한 (0,0) 시작셀의 바깥 왼쪽 벽과
 * (rows-1, cols-1) 출구셀의 바깥 오른쪽 벽을 제거해서
 * 진짜 입/출구처럼 “뚫어” 놓습니다.
 */
export function generateMaze(
    cols: number,
    rows: number,
    extraConnections = 0.25
): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < cols; x++) {
            row.push({
                x,
                y,
                walls: { top: true, right: true, bottom: true, left: true },
            });
        }
        grid.push(row);
    }

    const visited: boolean[][] = Array.from({ length: rows }, () =>
        Array(cols).fill(false)
    );

    function carve(x: number, y: number) {
        visited[y][x] = true;
        const dirs = shuffle(["top", "right", "bottom", "left"]);
        for (const dir of dirs) {
            let nx = x,
                ny = y;
            if (dir === "top") ny--;
            if (dir === "bottom") ny++;
            if (dir === "left") nx--;
            if (dir === "right") nx++;

            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            if (visited[ny][nx]) continue;

            // remove shared wall
            if (dir === "top") {
                grid[y][x].walls.top = false;
                grid[ny][nx].walls.bottom = false;
            }
            if (dir === "bottom") {
                grid[y][x].walls.bottom = false;
                grid[ny][nx].walls.top = false;
            }
            if (dir === "left") {
                grid[y][x].walls.left = false;
                grid[ny][nx].walls.right = false;
            }
            if (dir === "right") {
                grid[y][x].walls.right = false;
                grid[ny][nx].walls.left = false;
            }
            carve(nx, ny);
        }
    }

    // 기본 미로 생성
    carve(0, 0);

    // 복잡도 증가: 임의의 인접 셀 사이 벽 제거 (루프/갈림길↑)
    const knockCount = Math.floor(cols * rows * extraConnections);
    for (let k = 0; k < knockCount; k++) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        const neighbors: Array<
            ["top" | "right" | "bottom" | "left", number, number]
        > = [];
        if (y > 0) neighbors.push(["top", x, y - 1]);
        if (x < cols - 1) neighbors.push(["right", x + 1, y]);
        if (y < rows - 1) neighbors.push(["bottom", x, y + 1]);
        if (x > 0) neighbors.push(["left", x - 1, y]);
        if (neighbors.length === 0) continue;
        const [dir, nx, ny] =
            neighbors[Math.floor(Math.random() * neighbors.length)];

        // 이미 뚫려있으면 패스, 아니면 양쪽 벽 제거
        const a = grid[y][x];
        const b = grid[ny][nx];
        if (
            (dir === "top" && !a.walls.top) ||
            (dir === "right" && !a.walls.right) ||
            (dir === "bottom" && !a.walls.bottom) ||
            (dir === "left" && !a.walls.left)
        ) {
            continue;
        }
        if (dir === "top") {
            a.walls.top = false;
            b.walls.bottom = false;
        }
        if (dir === "right") {
            a.walls.right = false;
            b.walls.left = false;
        }
        if (dir === "bottom") {
            a.walls.bottom = false;
            b.walls.top = false;
        }
        if (dir === "left") {
            a.walls.left = false;
            b.walls.right = false;
        }
    }

    // 진짜 입출구: 바깥 벽 뚫기
    grid[0][0].walls.left = false; // START 왼쪽 오픈
    grid[rows - 1][cols - 1].walls.right = false; // EXIT 오른쪽 오픈

    return grid;
}
