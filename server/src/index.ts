// Socket.io 이용 시(Vercel로 배포 시 Socket.io 사용 불가)
/**

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { PlayerState, BulletState, WorldState, ClientInput } from "./types";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Game constants
const ARENA_SIZE = 40;
const HALF = ARENA_SIZE / 2;
const PLAYER_SPEED = 7;
const PLAYER_RADIUS = 0.6;
const BULLET_SPEED = 16;
const BULLET_RADIUS = 0.2;
const FIRE_COOLDOWN_MS = 300;
const BULLET_LIFETIME_MS = 2500;
const TICK_RATE = 30;
const HIT_DISTANCE = PLAYER_RADIUS + BULLET_RADIUS;
const START_HP = 1;

// World state
const players = new Map<string, PlayerState>();
const bullets = new Map<string, BulletState>();
const lastFireAt = new Map<string, number>();
const inputs = new Map<string, ClientInput>();
let tick = 0;

const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

function spawnPosition() {
    const margin = 4;
    const x = Math.random() * (ARENA_SIZE - margin * 2) - (HALF - margin);
    const z = Math.random() * (ARENA_SIZE - margin * 2) - (HALF - margin);
    return { x, y: 0, z };
}

io.on("connection", (socket) => {
    const id = socket.id;
    const spawn = spawnPosition();
    const player: PlayerState = {
        id,
        name: `P${id.slice(0, 4)}`,
        pos: { ...spawn },
        rotY: 0,
        hp: START_HP,
        score: 0,
    };
    players.set(id, player);
    inputs.set(id, {
        seq: 0,
        up: false,
        down: false,
        left: false,
        right: false,
        yaw: 0,
        fire: false,
    });

    socket.emit("init", { id, arenaSize: ARENA_SIZE });

    socket.on("input", (inp: ClientInput) => inputs.set(id, inp));

    socket.on("disconnect", () => {
        players.delete(id);
        inputs.delete(id);
        for (const [bid, b] of bullets) {
            if (b.ownerId === id) bullets.delete(bid);
        }
    });
});

let lastTime = Date.now();
setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // players
    for (const [id, p] of players) {
        const inp = inputs.get(id);
        if (!inp) continue;
        p.rotY = inp.yaw;

        const cos = Math.cos(p.rotY);
        const sin = Math.sin(p.rotY);
        let vx = 0,
            vz = 0;
        if (inp.up) {
            vx += -sin;
            vz += -cos;
        }
        if (inp.down) {
            vx += sin;
            vz += cos;
        }
        if (inp.left) {
            vx += -cos;
            vz += sin;
        }
        if (inp.right) {
            vx += cos;
            vz += -sin;
        }
        const len = Math.hypot(vx, vz);
        if (len > 0) {
            vx /= len;
            vz /= len;
            p.pos.x += vx * PLAYER_SPEED * dt;
            p.pos.z += vz * PLAYER_SPEED * dt;
        }
        p.pos.x = clamp(p.pos.x, -HALF + PLAYER_RADIUS, HALF - PLAYER_RADIUS);
        p.pos.z = clamp(p.pos.z, -HALF + PLAYER_RADIUS, HALF - PLAYER_RADIUS);

        // fire
        if (inp.fire) {
            const last = lastFireAt.get(id) ?? 0;
            if (now - last >= FIRE_COOLDOWN_MS) {
                lastFireAt.set(id, now);

                let dirx, diry, dirz;

                console.log("🔍 Server received:", {
                    hasFireDirection: !!inp.fireDirection,
                    fireDirection: inp.fireDirection,
                    pitch: inp.pitch,
                    yaw: inp.yaw,
                });

                if (inp.fireDirection) {
                    dirx = inp.fireDirection.x;
                    diry = inp.fireDirection.y;
                    dirz = inp.fireDirection.z;
                } else if (inp.pitch !== undefined) {
                    dirx = Math.sin(p.rotY) * Math.cos(inp.pitch);
                    diry = -Math.sin(inp.pitch);
                    dirz = Math.cos(p.rotY) * Math.cos(inp.pitch);
                } else {
                    dirx = Math.sin(p.rotY);
                    diry = 0;
                    dirz = Math.cos(p.rotY);
                }

                console.log("Server calculated direction:", {
                    dirx,
                    diry,
                    dirz,
                });

                const b: BulletState = {
                    id: uuidv4(),
                    pos: {
                        x: p.pos.x + dirx * (PLAYER_RADIUS + 0.2),
                        y: 1.2,
                        z: p.pos.z + dirz * (PLAYER_RADIUS + 0.2),
                    },
                    vel: {
                        x: dirx * BULLET_SPEED,
                        y: diry * BULLET_SPEED,
                        z: dirz * BULLET_SPEED,
                    },
                    ownerId: id,
                    bornAt: now,
                };
                bullets.set(b.id, b);
            }
        }
    }

    // bullets
    for (const [bid, b] of [...bullets]) {
        const age = now - b.bornAt;
        if (age > BULLET_LIFETIME_MS) {
            bullets.delete(bid);
            continue;
        }
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        b.pos.z += b.vel.z * dt;

        if (
            b.pos.y <= 0 ||
            Math.abs(b.pos.x) > HALF ||
            Math.abs(b.pos.z) > HALF ||
            b.pos.y > 10
        ) {
            bullets.delete(bid);
            continue;
        }

        for (const [pid, p] of players) {
            if (pid === b.ownerId) continue;
            const dx = p.pos.x - b.pos.x;
            const dy = p.pos.y + 0.8 - b.pos.y;
            const dz = p.pos.z - b.pos.z;

            const distance3D = Math.hypot(dx, dy, dz);
            const isInHeightRange =
                b.pos.y >= p.pos.y && b.pos.y <= p.pos.y + 1.8;

            if (distance3D <= HIT_DISTANCE && isInHeightRange) {
                bullets.delete(bid);
                p.hp -= 1;
                if (p.hp <= 0) {
                    const shooter = players.get(b.ownerId);
                    if (shooter) shooter.score += 1;
                    const sp = spawnPosition();
                    p.pos.x = sp.x;
                    p.pos.z = sp.z;
                    p.rotY = 0;
                    p.hp = START_HP;
                }
                break;
            }
        }
    }

    const state: WorldState = {
        players: Array.from(players.values()),
        bullets: Array.from(bullets.values()),
        arenaSize: ARENA_SIZE,
        tick: tick++,
    };
    io.emit("state", state);
}, 1000 / TICK_RATE);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

server.listen(PORT, () =>
    console.log(`Battle Arena server running on :${PORT}`)
);

 */

//
//
// Ably 이용 시
import * as dotenv from "dotenv";
import * as path from "path";

// 프로젝트 루트의 .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import * as Ably from "ably";
import { v4 as uuidv4 } from "uuid";
import { PlayerState, BulletState, WorldState, ClientInput } from "./types";

// 충돌 감지를 위한 타입 정의
interface Box3D {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
}

interface Ray {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
}

// Ably 연결
const realtime = new Ably.Realtime({
    key: process.env.ABLY_API_KEY!,
});

realtime.connection.on("connected", () => {
    console.log("Ably connected successfully");
});

realtime.connection.on("failed", (stateChange) => {
    console.error("Ably connection failed:", stateChange.reason);
});

const inputsCh = realtime.channels.get("arena:inputs");
const stateCh = realtime.channels.get("arena:state");

Promise.all([inputsCh.attach(), stateCh.attach()])
    .then(() => console.log("Channels attached"))
    .catch((err) => console.error("Channel attach failed:", err));

// 게임 상수/상태
const ARENA_SIZE = 40;
const HALF = ARENA_SIZE / 2;
const PLAYER_SPEED = 7;
const PLAYER_RADIUS = 0.6;
const BULLET_SPEED = 16;
const BULLET_RADIUS = 0.02; // 더 작은 총알
const FIRE_COOLDOWN_MS = 100; // 연사 속도에 맞춤
const BULLET_LIFETIME_MS = 2500;
const TICK_RATE = 30;
const HIT_DISTANCE = PLAYER_RADIUS + BULLET_RADIUS;
const START_HP = 1;

const players = new Map<string, PlayerState>();
const bullets = new Map<string, BulletState>();
const lastFireAt = new Map<string, number>();
const inputs = new Map<string, ClientInput>();
let tick = 0;

// 엄폐물 정의 (클라이언트와 동일한 위치에 배치)
const coverObjects: Box3D[] = [];

// 엄폐물 초기화 함수
function initializeCoverObjects() {
    coverObjects.length = 0; // 배열 초기화

    // 나무 상자들 (클라이언트와 동일한 로직)
    for (let i = 0; i < 8; i++) {
        const width = 1 + Math.random() * 0.5;
        const height = 0.8 + Math.random() * 0.4;
        const depth = 1 + Math.random() * 0.5;

        const angle = (i / 8) * Math.PI * 2;
        const radius = 8 + Math.random() * 10;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        coverObjects.push({
            min: {
                x: x - width / 2,
                y: 0,
                z: z - depth / 2,
            },
            max: {
                x: x + width / 2,
                y: height,
                z: z + depth / 2,
            },
        });
    }

    // 벽 엄폐물
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const radius = 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const wallWidth = 3;
        const wallHeight = 1.5;
        const wallThickness = 0.2;

        // 벽의 회전을 고려한 바운딩 박스
        const halfWidth = wallWidth / 2;
        const halfThickness = wallThickness / 2;

        coverObjects.push({
            min: {
                x: x - halfWidth,
                y: 0,
                z: z - halfThickness,
            },
            max: {
                x: x + halfWidth,
                y: wallHeight,
                z: z + halfThickness,
            },
        });
    }

    // 원형 엄폐물들
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 5 + Math.random() * 8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const cylinderRadius = 0.5;
        const cylinderHeight = 1.2;

        coverObjects.push({
            min: {
                x: x - cylinderRadius,
                y: 0,
                z: z - cylinderRadius,
            },
            max: {
                x: x + cylinderRadius,
                y: cylinderHeight,
                z: z + cylinderRadius,
            },
        });
    }

    // 경계 벽들
    const wallHeight = 3;
    const wallThickness = 0.5;

    coverObjects.push(
        // 북쪽 벽
        {
            min: { x: -HALF, y: 0, z: -HALF - wallThickness / 2 },
            max: { x: HALF, y: wallHeight, z: -HALF + wallThickness / 2 },
        },
        // 남쪽 벽
        {
            min: { x: -HALF, y: 0, z: HALF - wallThickness / 2 },
            max: { x: HALF, y: wallHeight, z: HALF + wallThickness / 2 },
        },
        // 서쪽 벽
        {
            min: { x: -HALF - wallThickness / 2, y: 0, z: -HALF },
            max: { x: -HALF + wallThickness / 2, y: wallHeight, z: HALF },
        },
        // 동쪽 벽
        {
            min: { x: HALF - wallThickness / 2, y: 0, z: -HALF },
            max: { x: HALF + wallThickness / 2, y: wallHeight, z: HALF },
        }
    );

    console.log(`Initialized ${coverObjects.length} cover objects`);
}

// 레이-박스 교차 검사
function rayBoxIntersection(ray: Ray, box: Box3D): number | null {
    const tMin = (box.min.x - ray.origin.x) / ray.direction.x;
    const tMax = (box.max.x - ray.origin.x) / ray.direction.x;

    let tNear = Math.min(tMin, tMax);
    let tFar = Math.max(tMin, tMax);

    const tMinY = (box.min.y - ray.origin.y) / ray.direction.y;
    const tMaxY = (box.max.y - ray.origin.y) / ray.direction.y;

    tNear = Math.max(tNear, Math.min(tMinY, tMaxY));
    tFar = Math.min(tFar, Math.max(tMinY, tMaxY));

    const tMinZ = (box.min.z - ray.origin.z) / ray.direction.z;
    const tMaxZ = (box.max.z - ray.origin.z) / ray.direction.z;

    tNear = Math.max(tNear, Math.min(tMinZ, tMaxZ));
    tFar = Math.min(tFar, Math.max(tMinZ, tMaxZ));

    if (tNear <= tFar && tFar >= 0) {
        return tNear >= 0 ? tNear : tFar;
    }

    return null;
}

// 총알 경로에 장애물이 있는지 확인
function checkBulletCollision(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
): boolean {
    const direction = {
        x: end.x - start.x,
        y: end.y - start.y,
        z: end.z - start.z,
    };

    const distance = Math.sqrt(
        direction.x * direction.x +
            direction.y * direction.y +
            direction.z * direction.z
    );

    if (distance === 0) return false;

    // 방향 정규화
    direction.x /= distance;
    direction.y /= distance;
    direction.z /= distance;

    const ray: Ray = {
        origin: start,
        direction: direction,
    };

    for (const box of coverObjects) {
        const t = rayBoxIntersection(ray, box);
        if (t !== null && t >= 0 && t <= distance) {
            return true; // 충돌 발생
        }
    }

    return false; // 충돌 없음
}

const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

function spawnPosition() {
    const margin = 4;
    const x = Math.random() * (ARENA_SIZE - margin * 2) - (HALF - margin);
    const z = Math.random() * (ARENA_SIZE - margin * 2) - (HALF - margin);
    return { x, y: 0, z };
}

// 엄폐물 초기화
initializeCoverObjects();

// Presence로 접속/퇴장 관리
stateCh.presence.subscribe("enter", (msg) => {
    const id = msg.clientId || uuidv4();
    console.log(`Player ${id} entered`);

    if (players.has(id)) {
        return;
    }

    const spawn = spawnPosition();
    players.set(id, {
        id,
        name: `P${id.slice(0, 4)}`,
        pos: { ...spawn },
        rotY: 0,
        hp: START_HP,
        score: 0,
    });

    inputs.set(id, {
        seq: 0,
        up: false,
        down: false,
        left: false,
        right: false,
        yaw: 0,
        fire: false,
    });
});

stateCh.presence.subscribe("leave", (msg) => {
    const id = msg.clientId || "";
    console.log(`Player ${id} left`);

    players.delete(id);
    inputs.delete(id);
    lastFireAt.delete(id);

    for (const [bid, b] of bullets) {
        if (b.ownerId === id) bullets.delete(bid);
    }
});

// 클라이언트 입력 구독
inputsCh.subscribe("input", (message) => {
    const inp = message.data as ClientInput;
    const id = message.clientId;

    if (!id) {
        console.warn("Input without clientId received");
        return;
    }

    inputs.set(id, inp);

    if (!players.has(id)) {
        const spawn = spawnPosition();
        players.set(id, {
            id,
            name: `P${String(id).slice(0, 4)}`,
            pos: { ...spawn },
            rotY: 0,
            hp: START_HP,
            score: 0,
        });
    }
});

// 메인 게임 루프
let lastTime = Date.now();

const gameLoop = async () => {
    const now = Date.now();
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // 플레이어 업데이트
    for (const [id, p] of players) {
        const inp = inputs.get(id);
        if (!inp) continue;

        p.rotY = inp.yaw;

        const cos = Math.cos(p.rotY);
        const sin = Math.sin(p.rotY);
        let vx = 0;
        let vz = 0;

        if (inp.up) {
            vx += -sin;
            vz += -cos;
        }
        if (inp.down) {
            vx += sin;
            vz += cos;
        }
        if (inp.left) {
            vx += -cos;
            vz += sin;
        }
        if (inp.right) {
            vx += cos;
            vz += -sin;
        }

        const len = Math.hypot(vx, vz);
        if (len > 0) {
            vx /= len;
            vz /= len;
            p.pos.x += vx * PLAYER_SPEED * dt;
            p.pos.z += vz * PLAYER_SPEED * dt;
        }

        p.pos.x = clamp(p.pos.x, -HALF + PLAYER_RADIUS, HALF - PLAYER_RADIUS);
        p.pos.z = clamp(p.pos.z, -HALF + PLAYER_RADIUS, HALF - PLAYER_RADIUS);

        // 발사 처리
        if (inp.fire) {
            const last = lastFireAt.get(id) ?? 0;
            if (now - last >= FIRE_COOLDOWN_MS) {
                lastFireAt.set(id, now);

                let dirx: number;
                let diry: number;
                let dirz: number;

                if (inp.fireDirection) {
                    dirx = inp.fireDirection.x;
                    diry = inp.fireDirection.y;
                    dirz = inp.fireDirection.z;
                } else if (inp.pitch !== undefined) {
                    dirx = Math.sin(p.rotY) * Math.cos(inp.pitch);
                    diry = -Math.sin(inp.pitch);
                    dirz = Math.cos(p.rotY) * Math.cos(inp.pitch);
                } else {
                    dirx = Math.sin(p.rotY);
                    diry = 0;
                    dirz = Math.cos(p.rotY);
                }

                const b: BulletState = {
                    id: uuidv4(),
                    pos: {
                        x: p.pos.x + dirx * (PLAYER_RADIUS + 0.2),
                        y: 1.2,
                        z: p.pos.z + dirz * (PLAYER_RADIUS + 0.2),
                    },
                    vel: {
                        x: dirx * BULLET_SPEED,
                        y: diry * BULLET_SPEED,
                        z: dirz * BULLET_SPEED,
                    },
                    ownerId: id,
                    bornAt: now,
                };
                bullets.set(b.id, b);
            }
        }
    }

    // 총알 업데이트 (충돌 감지 포함)
    for (const [bid, b] of [...bullets]) {
        const age = now - b.bornAt;
        if (age > BULLET_LIFETIME_MS) {
            bullets.delete(bid);
            continue;
        }

        const oldPos = { ...b.pos };

        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        b.pos.z += b.vel.z * dt;

        // 경계 체크
        if (
            b.pos.y <= 0 ||
            Math.abs(b.pos.x) > HALF ||
            Math.abs(b.pos.z) > HALF ||
            b.pos.y > 10
        ) {
            bullets.delete(bid);
            continue;
        }

        // 엄폐물 충돌 체크
        if (checkBulletCollision(oldPos, b.pos)) {
            bullets.delete(bid);
            continue;
        }

        // 플레이어 충돌 검사
        for (const [pid, p] of players) {
            if (pid === b.ownerId) continue;

            const dx = p.pos.x - b.pos.x;
            const dy = p.pos.y + 0.8 - b.pos.y;
            const dz = p.pos.z - b.pos.z;

            const distance3D = Math.hypot(dx, dy, dz);
            const inHeight = b.pos.y >= p.pos.y && b.pos.y <= p.pos.y + 1.8;

            if (distance3D <= HIT_DISTANCE && inHeight) {
                // 총알과 플레이어 사이에 엄폐물이 있는지 추가 확인
                const bulletStart = {
                    x: b.pos.x - b.vel.x * dt,
                    y: b.pos.y - b.vel.y * dt,
                    z: b.pos.z - b.vel.z * dt,
                };
                const playerPos = {
                    x: p.pos.x,
                    y: p.pos.y + 0.8,
                    z: p.pos.z,
                };

                if (!checkBulletCollision(bulletStart, playerPos)) {
                    bullets.delete(bid);
                    p.hp -= 1;

                    if (p.hp <= 0) {
                        const shooter = players.get(b.ownerId);
                        if (shooter) {
                            shooter.score += 1;
                        }

                        // 리스폰
                        const sp = spawnPosition();
                        p.pos.x = sp.x;
                        p.pos.z = sp.z;
                        p.rotY = 0;
                        p.hp = START_HP;
                    }
                    break;
                }
            }
        }
    }

    // 상태 브로드캐스트
    const state: WorldState = {
        players: Array.from(players.values()),
        bullets: Array.from(bullets.values()),
        arenaSize: ARENA_SIZE,
        tick: tick++,
    };

    try {
        await stateCh.publish("state", state);
    } catch (error) {
        console.error("Failed to publish state:", error);
    }
};

setInterval(gameLoop, 1000 / TICK_RATE);

console.log(
    "Authoritative game server with collision detection running with Ably Realtime"
);

process.on("SIGINT", () => {
    console.log("Shutting down server...");
    realtime.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Shutting down server...");
    realtime.close();
    process.exit(0);
});
