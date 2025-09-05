import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { PlayerState, BulletState, WorldState, ClientInput } from "./types";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ===== Game constants =====
const ARENA_SIZE = 40;
const HALF = ARENA_SIZE / 2;
const PLAYER_SPEED = 7;
const PLAYER_RADIUS = 0.6;
const BULLET_SPEED = 16;
const BULLET_RADIUS = 0.2;
const FIRE_COOLDOWN_MS = 300;
const BULLET_LIFETIME_MS = 2500;
const TICK_RATE = 30; // 30Hz
const HIT_DISTANCE = PLAYER_RADIUS + BULLET_RADIUS;
const START_HP = 1;

// ===== World state =====
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
