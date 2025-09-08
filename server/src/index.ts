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
import * as Ably from "ably";
import { v4 as uuidv4 } from "uuid";
import { PlayerState, BulletState, WorldState, ClientInput } from "./types";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Environment check:");
console.log("ABLY_API_KEY exists:", !!process.env.ABLY_API_KEY);
console.log("ABLY_API_KEY length:", process.env.ABLY_API_KEY?.length || 0);

// Ably 연결
const realtime = new Ably.Realtime({
    key: process.env.ABLY_API_KEY!,
});

// 연결 상태 확인
realtime.connection.on("connected", () => {
    console.log("Ably connected successfully");
});

realtime.connection.on("failed", (stateChange) => {
    console.error("Ably connection failed:", stateChange.reason);
});

// 채널 구성
const inputsCh = realtime.channels.get("arena:inputs");
const stateCh = realtime.channels.get("arena:state");

// 채널 연결
Promise.all([inputsCh.attach(), stateCh.attach()])
    .then(() => console.log("Channels attached"))
    .catch((err) => console.error("Channel attach failed:", err));

// 게임 상수/상태
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

const players = new Map<string, PlayerState>();
const bullets = new Map<string, BulletState>();
const lastFireAt = new Map<string, number>();
// 수정: 타입 오류 수정 - Maps -> Map
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

    // 해당 플레이어의 총알 제거
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

    // 최신 입력 저장
    inputs.set(id, inp);

    // 플레이어가 아직 없다면 생성
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
                        // 수정: dirz 뒤에 * 연산자 누락 수정
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

    // 총알 업데이트
    for (const [bid, b] of [...bullets]) {
        const age = now - b.bornAt;
        if (age > BULLET_LIFETIME_MS) {
            bullets.delete(bid);
            continue;
        }

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

        // 충돌 검사
        for (const [pid, p] of players) {
            if (pid === b.ownerId) continue;

            const dx = p.pos.x - b.pos.x;
            const dy = p.pos.y + 0.8 - b.pos.y;
            const dz = p.pos.z - b.pos.z;

            const distance3D = Math.hypot(dx, dy, dz);
            const inHeight = b.pos.y >= p.pos.y && b.pos.y <= p.pos.y + 1.8;

            if (distance3D <= HIT_DISTANCE && inHeight) {
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

// 게임 루프 시작
setInterval(gameLoop, 1000 / TICK_RATE);

console.log("Authoritative game server is running with Ably Realtime");

// 프로세스 종료 시 정리
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
