"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { io, Socket } from "socket.io-client";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { WorldState } from "../types";

// Variables
const BASE_PATH = process.env.NEXT_PUBLIC_ASSET_CDN ?? "";
const CDN_BASE = (process.env.NEXT_PUBLIC_ASSET_CDN ?? "").replace(/\/$/, "");

// Config
const SERVER_URL =
    process.env.NEXT_PUBLIC_ARENA_SERVER_URL || "http://localhost:3001";
const PLAYER_COLOR_ME = 0x7ad7f0;
const PLAYER_COLOR_OTHERS = 0xf0a87a;
const BULLET_COLOR = 0xfff06a;
const FLOOR_COLOR = 0x90ee90;
const WALL_COLOR = 0xb0b0b0;

// Files
const FILES = {
    character: "character.glb",
    idle: "anim_idle.glb",
    run: "anim_run.glb",
    shoot: "anim_shoot.glb",
};

const ASSET_BASE_CANDIDATES = Array.from(
    new Set([
        ...(CDN_BASE ? [`${CDN_BASE}/battlearena`] : []),
        `${BASE_PATH}/battlearena`,
        `${BASE_PATH}/assets/battlearena`,
    ])
);
// 1인칭 관련
const eyeHeight = 1.6;
const MODEL_YAW_OFFSET = Math.PI;

type InputState = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    mouseDown: boolean;
    yaw: number;
    pitch: number;
};

type PlayerVisual = {
    root: THREE.Object3D;
    mixer: THREE.AnimationMixer | null;
    actions: Partial<Record<"idle" | "run" | "shoot", THREE.AnimationAction>>;
    playing: "idle" | "run" | "shoot";
    lastPos: THREE.Vector3;
    isCapsuleFallback: boolean;
};

export default function BattleArenaSocket() {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [connected, setConnected] = useState(false);
    const [myId, setMyId] = useState<string | null>(null);
    const myIdRef = useRef<string | null>(null);
    const [arenaSize, setArenaSize] = useState(40);
    const [assetStatus, setAssetStatus] = useState({
        base: false,
        idle: false,
        run: false,
        shoot: false,
    });
    const [scoreboard, setScoreboard] = useState<
        { id: string; name?: string; score: number }[]
    >([]);

    const socketRef = useRef<Socket | null>(null);
    const input = useRef<InputState>({
        up: false,
        down: false,
        left: false,
        right: false,
        mouseDown: false,
        yaw: 0,
        pitch: 0,
    });
    const fireFlag = useRef(false);

    // three core
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const floorRef = useRef<THREE.Mesh | null>(null);

    // 내 위치(서버 state 기반)를 저장하여 카메라가 붙도록 사용
    const myPosRef = useRef(new THREE.Vector3(0, eyeHeight, 0));

    // 3D 모델 및 애니메이션
    const baseModelRef = useRef<THREE.Object3D | null>(null);
    const clipsRef = useRef<
        Partial<Record<"idle" | "run" | "shoot", THREE.AnimationClip>>
    >({});
    const visualsRef = useRef<Map<string, PlayerVisual>>(new Map());

    const prevTimeRef = useRef<number>(performance.now());
    const requestRef = useRef<number | null>(null);

    // 총알 지오메트리 및 재질 재사용
    const bulletGeometryRef = useRef<THREE.CapsuleGeometry | null>(null);
    const bulletMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

    // 컴포넌트 마운트 시 한 번만 생성
    useEffect(() => {
        bulletGeometryRef.current = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8);
        bulletMaterialRef.current = new THREE.MeshStandardMaterial({
            color: BULLET_COLOR,
            emissive: new THREE.Color(0x333300),
            metalness: 0.7,
            roughness: 0.3,
        });

        return () => {
            bulletGeometryRef.current?.dispose();
            bulletMaterialRef.current?.dispose();
        };
    }, []);

    const createBulletGeometry = () => bulletGeometryRef.current;
    const createBulletMaterial = () => bulletMaterialRef.current;

    // mount three
    useEffect(() => {
        const mount = mountRef.current!;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        const camera = new THREE.PerspectiveCamera(
            75,
            mount.clientWidth / mount.clientHeight,
            0.01,
            1000
        );
        camera.position.set(0, eyeHeight, 0);
        camera.rotation.order = "YXZ";

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mount.appendChild(renderer.domElement);

        // 조명
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        hemi.position.set(0, 50, 0);
        scene.add(hemi);

        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 20, 10);
        dir.castShadow = true;
        dir.shadow.mapSize.width = 2048;
        dir.shadow.mapSize.height = 2048;
        scene.add(dir);

        // 바닥
        const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
        const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        floorRef.current = floor;

        // 벽
        const wallHeight = 2,
            wallThick = 0.5;
        const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR });
        const wallGeo1 = new THREE.BoxGeometry(
            arenaSize,
            wallHeight,
            wallThick
        );
        const wallGeo2 = new THREE.BoxGeometry(
            wallThick,
            wallHeight,
            arenaSize
        );

        const walls = [
            { geo: wallGeo1, pos: [0, wallHeight / 2, -arenaSize / 2] },
            { geo: wallGeo1, pos: [0, wallHeight / 2, arenaSize / 2] },
            { geo: wallGeo2, pos: [-arenaSize / 2, wallHeight / 2, 0] },
            { geo: wallGeo2, pos: [arenaSize / 2, wallHeight / 2, 0] },
        ];
        walls.forEach(({ geo, pos }) => {
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(pos[0], pos[1], pos[2]);
            scene.add(wall);
        });

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;

        const onResize = () => {
            if (!mountRef.current || !cameraRef.current || !rendererRef.current)
                return;
            const w = mountRef.current.clientWidth,
                h = mountRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };

        const ro = new ResizeObserver(onResize);
        ro.observe(mount);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            ro.disconnect();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, [arenaSize]);

    // GLB 로더
    const loadGLB = async (loader: GLTFLoader, filename: string) => {
        let lastErr: unknown = null;
        for (const base of ASSET_BASE_CANDIDATES) {
            const url = `${base}/${filename}`;
            try {
                return await loader.loadAsync(url);
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr ?? new Error("GLB not found: " + filename);
    };

    // 에셋 로드
    useEffect(() => {
        let cancelled = false;
        const loader = new GLTFLoader();
        (async () => {
            try {
                const [charGLB, idleGLB, runGLB, shootGLB] = await Promise.all([
                    loadGLB(loader, FILES.character),
                    loadGLB(loader, FILES.idle),
                    loadGLB(loader, FILES.run),
                    loadGLB(loader, FILES.shoot),
                ]);
                if (cancelled) return;

                const base = clone(charGLB.scene) as THREE.Object3D;
                base.traverse((o: THREE.Object3D) => {
                    if (o instanceof THREE.Mesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }
                });
                baseModelRef.current = base;
                setAssetStatus((s) => ({ ...s, base: true }));
                clipsRef.current.idle = idleGLB.animations[0];
                setAssetStatus((s) => ({ ...s, idle: true }));
                clipsRef.current.run = runGLB.animations[0];
                setAssetStatus((s) => ({ ...s, run: true }));
                clipsRef.current.shoot = shootGLB.animations[0];
                setAssetStatus((s) => ({ ...s, shoot: true }));

                // 폴백 제거
                const scene = sceneRef.current;
                if (scene) {
                    for (const [playerId, visual] of visualsRef.current) {
                        if (visual.isCapsuleFallback) {
                            scene.remove(visual.root);
                            visualsRef.current.delete(playerId);
                        }
                    }
                }
            } catch (e) {
                console.error("[DEBUG] GLB 로드 실패:", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 소켓 & 입력
    useEffect(() => {
        const socket = io(SERVER_URL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));

        socket.on("init", (data: { id: string; arenaSize: number }) => {
            setMyId(data.id);
            myIdRef.current = data.id;
            setArenaSize(data.arenaSize);
            if (floorRef.current) {
                floorRef.current.geometry.dispose();
                floorRef.current.geometry = new THREE.PlaneGeometry(
                    data.arenaSize,
                    data.arenaSize
                );
            }
        });

        socket.on("state", (state: WorldState) => {
            applyWorld(state);
            setScoreboard(
                state.players
                    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
                    .sort((a, b) => b.score - a.score)
            );
        });

        let seq = 0;
        const sendInterval = setInterval(() => {
            if (!socket.connected) return;

            // YAW/PITCH 분리
            const movementYaw = input.current.yaw;
            const movementPitch = input.current.pitch;
            const bulletYaw = input.current.yaw + Math.PI; // 180도 회전
            const bulletPitch = input.current.pitch; // pitch 부호 수정됨

            // 카메라 실제 방향 계산 (반전 없이 그대로)
            const cam = cameraRef.current;
            const fireDirection = new THREE.Vector3();

            if (cam && fireFlag.current) {
                cam.getWorldDirection(fireDirection);

                // Y값이 작으면 pitch에서 직접 계산
                if (Math.abs(fireDirection.y) < 0.1) {
                    const pitchAmount = Math.sin(input.current.pitch);
                    fireDirection.y = pitchAmount;
                }

                fireDirection.normalize();
            } else {
                fireDirection.set(0, 0, -1);
            }

            const origin = {
                x: myPosRef.current.x,
                y: eyeHeight,
                z: myPosRef.current.z,
            };

            const payload = {
                seq: seq++,
                up: input.current.up,
                down: input.current.down,
                left: input.current.left,
                right: input.current.right,
                yaw: fireFlag.current ? bulletYaw : movementYaw,
                pitch: fireFlag.current ? bulletPitch : movementPitch,
                fire: false as boolean,
                fireOrigin: origin,
                fireDirection: {
                    x: fireDirection.x,
                    y: fireDirection.y,
                    z: fireDirection.z,
                },
            };

            if (fireFlag.current) {
                payload.fire = true;
                fireFlag.current = false;
            }

            socket.emit("input", payload);
        }, 1000 / 30);

        // 키보드
        const down = (e: KeyboardEvent) => {
            if (e.code === "KeyW") input.current.up = true;
            if (e.code === "KeyS") input.current.down = true;
            if (e.code === "KeyA") input.current.left = true;
            if (e.code === "KeyD") input.current.right = true;
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === "KeyW") input.current.up = false;
            if (e.code === "KeyS") input.current.down = false;
            if (e.code === "KeyA") input.current.left = false;
            if (e.code === "KeyD") input.current.right = false;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);

        // 마우스
        const mount = mountRef.current!;
        const requestPointer = () => mount.requestPointerLock();

        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === mount) {
                const sensX = 0.003;
                const sensY = 0.003;

                input.current.yaw -= e.movementX * sensX;
                input.current.pitch -= e.movementY * sensY;

                const maxPitch = Math.PI / 2 - 0.1;
                input.current.pitch = Math.max(
                    -maxPitch,
                    Math.min(maxPitch, input.current.pitch)
                );

                const cam = cameraRef.current;
                if (cam) {
                    cam.rotation.set(
                        input.current.pitch,
                        input.current.yaw,
                        0,
                        "YXZ"
                    );
                }
            }
        };

        const handleMouseDown = () => {
            input.current.mouseDown = true;
            fireFlag.current = true;
        };
        const handleMouseUp = () => {
            input.current.mouseDown = false;
        };

        mount.addEventListener("click", requestPointer);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            clearInterval(sendInterval);
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            mount.removeEventListener("click", requestPointer);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            socket.disconnect();
        };
    }, []);

    // 플레이어 비주얼
    function ensurePlayerVisual(
        id: string,
        isMe: boolean,
        scene: THREE.Scene
    ): PlayerVisual {
        let vis = visualsRef.current.get(id);
        if (vis) return vis;

        let root: THREE.Object3D;
        let mixer: THREE.AnimationMixer | null = null;
        let actions: PlayerVisual["actions"] = {};
        let isCapsuleFallback = false;

        if (baseModelRef.current) {
            root = clone(baseModelRef.current) as THREE.Object3D;
            try {
                mixer = new THREE.AnimationMixer(root);
                if (clipsRef.current.idle)
                    actions.idle = mixer.clipAction(clipsRef.current.idle);
                if (clipsRef.current.run)
                    actions.run = mixer.clipAction(clipsRef.current.run);
                if (clipsRef.current.shoot) {
                    const shootAct: THREE.AnimationAction = mixer.clipAction(
                        clipsRef.current.shoot
                    );
                    shootAct.setLoop(THREE.LoopOnce, 1);
                    shootAct.clampWhenFinished = true;
                    actions.shoot = shootAct;
                }
                actions.idle?.play();
            } catch {
                mixer = null;
                actions = {};
            }
        } else {
            const geo = new THREE.CapsuleGeometry(0.6, 0.4, 4, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: isMe ? PLAYER_COLOR_ME : PLAYER_COLOR_OTHERS,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            root = mesh;
            isCapsuleFallback = true;
        }

        if (isMe || myIdRef.current === id) root.visible = false;

        scene.add(root);
        vis = {
            root,
            mixer,
            actions,
            playing: "idle",
            lastPos: new THREE.Vector3(),
            isCapsuleFallback,
        };
        visualsRef.current.set(id, vis);
        return vis;
    }

    // 애니메이션 크로스페이드
    function crossFade(
        vis: PlayerVisual,
        next: PlayerVisual["playing"],
        fade = 0.12
    ) {
        if (vis.playing === next) return;
        try {
            const curr = vis.actions[vis.playing];
            const nxt = vis.actions[next];
            if (nxt) {
                nxt.reset().fadeIn(fade).play();
                curr?.fadeOut(fade);
                vis.playing = next;
            }
        } catch {}
    }

    // 월드 상태 적용
    function applyWorld(state: WorldState) {
        const scene = sceneRef.current!;
        const present = new Set<string>();

        // 플레이어
        for (const p of state.players) {
            present.add(p.id);
            const isMe = myIdRef.current === p.id;
            const vis = ensurePlayerVisual(p.id, isMe, scene);

            vis.root.position.set(
                p.pos.x,
                vis.isCapsuleFallback ? 1 : 0,
                p.pos.z
            );

            vis.root.rotation.y =
                p.rotY + (vis.isCapsuleFallback ? 0 : MODEL_YAW_OFFSET);

            const moved = Math.hypot(
                p.pos.x - vis.lastPos.x,
                p.pos.z - vis.lastPos.z
            );
            if (vis.mixer) crossFade(vis, moved > 0.01 ? "run" : "idle");
            vis.lastPos.set(p.pos.x, 0, p.pos.z);
        }

        // 떠난 플레이어 정리
        for (const [id, vis] of [...visualsRef.current]) {
            if (!present.has(id)) {
                scene.remove(vis.root);
                vis.root.traverse((o: THREE.Object3D) => {
                    if (o instanceof THREE.Mesh) {
                        o.geometry?.dispose?.();
                        if (Array.isArray(o.material))
                            o.material.forEach((m: THREE.Material) =>
                                m.dispose()
                            );
                        else o.material?.dispose?.();
                    }
                });
                visualsRef.current.delete(id);
            }
        }

        // 총알 풀
        if (!scene.getObjectByName("bulletPool")) {
            const group = new THREE.Group();
            group.name = "bulletPool";
            scene.add(group);
        }
        const pool = scene.getObjectByName("bulletPool") as THREE.Group;

        // 1) Map을 Mesh로 좁히기
        const byId = new Map<string, THREE.Mesh>();
        pool.children.forEach((c) => {
            if (c instanceof THREE.Mesh && c.userData?.id) {
                byId.set(c.userData.id, c);
            }
        });

        const presentB = new Set<string>();

        for (const b of state.bullets) {
            presentB.add(b.id);
            let obj = byId.get(b.id); // THREE.Mesh | undefined

            // 2) 없으면 생성 시도
            if (!obj) {
                const geo = createBulletGeometry();
                const mat = createBulletMaterial();
                if (geo && mat) {
                    obj = new THREE.Mesh(geo, mat.clone());
                    obj.userData.id = b.id;
                    obj.frustumCulled = false;
                    pool.add(obj);

                    const ownerVis = visualsRef.current.get(b.ownerId);
                    if (ownerVis?.actions.shoot) {
                        ownerVis.actions.shoot.reset().fadeIn(0.05).play();
                        setTimeout(
                            () => ownerVis.actions.shoot?.fadeOut(0.1),
                            250
                        );
                    }
                }
            }

            // 3) 여전히 없으면(geo/mat 미준비 등) 안전하게 스킵
            if (!obj) continue;

            // 서버에서 온 3D 속도로 방향
            const dir3 = new THREE.Vector3(
                b.vel?.x ?? 0,
                b.vel?.y ?? 0,
                b.vel?.z ?? 0
            );
            if (dir3.lengthSq() > 0) dir3.normalize();

            const isMine = b.ownerId === myIdRef.current;
            const selfOffset = isMine ? 0.45 : 0.0;

            obj.position.set(
                (b.pos?.x ?? 0) + dir3.x * selfOffset,
                b.pos?.y ?? 0, // 서버 y 그대로
                (b.pos?.z ?? 0) + dir3.z * selfOffset
            );

            if (dir3.lengthSq() > 0) {
                obj.lookAt(obj.position.clone().add(dir3));
                obj.rotateZ(Math.PI / 2);
            }
        }

        // 사라진 총알 정리
        pool.children
            .filter(
                (c) =>
                    !(c instanceof THREE.Mesh) || !presentB.has(c.userData.id)
            )
            .forEach((c) => {
                pool.remove(c);
                if (c instanceof THREE.Mesh) {
                    c.geometry.dispose();
                    const mats = Array.isArray(c.material)
                        ? c.material
                        : [c.material];
                    mats.forEach((m) => m.dispose());
                }
            });

        const myIdNow = myIdRef.current;
        if (myIdNow) {
            const me = state.players.find((p) => p.id === myIdNow);
            if (me) myPosRef.current.set(me.pos.x, eyeHeight, me.pos.z);
        }
    }

    // 렌더 루프
    useEffect(() => {
        const loop = () => {
            const now = performance.now();
            const dt = (now - prevTimeRef.current) / 1000;
            prevTimeRef.current = now;

            visualsRef.current.forEach((vis) => vis.mixer?.update(dt));

            const cam = cameraRef.current;
            if (cam) {
                cam.position.copy(myPosRef.current);
            }

            if (sceneRef.current && cameraRef.current && rendererRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // UI
    return (
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {/* 크로스헤어 */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "20px",
                    height: "20px",
                    border: "2px solid rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 1000,
                }}
            />

            {!connected && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        color: "#c0c0c0",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ textAlign: "center" }}>
                        <div>연결 중...</div>
                        <div style={{ fontSize: "14px", marginTop: "8px" }}>
                            서버에 연결하는 중입니다.
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    color: "#e8e8e8",
                    fontFamily:
                        "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    background: "rgba(0,0,0,0.4)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    backdropFilter: "blur(8px)",
                    minWidth: 280,
                    fontSize: "14px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                    }}
                >
                    <b style={{ color: "#7ad7f0" }}>1인칭 배틀 아레나</b>
                    <span
                        style={{
                            backgroundColor: connected ? "#22c55e" : "#ef4444",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            display: "inline-block",
                        }}
                    />
                </div>

                <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 8 }}>
                    <div>
                        <strong>1인칭 시점:</strong> 내 눈으로 직접 보기
                    </div>
                    <div>WASD: 이동 · 마우스: 시선 · 클릭: 발사</div>
                    <div>화면 클릭으로 마우스 잠금/해제</div>
                </div>

                <div style={{ marginBottom: 8, fontSize: 12 }}>
                    <div style={{ marginBottom: 4 }}>
                        <span style={{ color: "#94a3b8" }}>에셋 상태:</span>
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 4,
                        }}
                    >
                        <span>캐릭터: {assetStatus.base ? "✅" : "❌"}</span>
                        <span>대기: {assetStatus.idle ? "✅" : "❌"}</span>
                        <span>달리기: {assetStatus.run ? "✅" : "❌"}</span>
                        <span>발사: {assetStatus.shoot ? "✅" : "❌"}</span>
                    </div>
                </div>

                <div style={{ marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: "#94a3b8" }}>플레이어 ID:</span>{" "}
                    <span style={{ color: "#7ad7f0" }}>
                        {myId ? myId.slice(0, 8) : "대기중..."}
                    </span>
                </div>

                {scoreboard.length > 0 && (
                    <div>
                        <div
                            style={{
                                color: "#94a3b8",
                                fontSize: 12,
                                marginBottom: 4,
                            }}
                        >
                            스코어보드:
                        </div>
                        {scoreboard.slice(0, 5).map((p, i) => (
                            <div
                                key={p.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 12,
                                    marginBottom: 2,
                                    color:
                                        myId === p.id ? "#7ad7f0" : "#e8e8e8",
                                }}
                            >
                                <span>
                                    #{i + 1} {p.name ?? p.id.slice(0, 6)}
                                    {myId === p.id && (
                                        <span style={{ color: "#fbbf24" }}>
                                            {" "}
                                            (나)
                                        </span>
                                    )}
                                </span>
                                <span style={{ fontWeight: "bold" }}>
                                    {p.score}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 게임 상태 표시 (우하단) */}
            <div
                style={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    color: "#e8e8e8",
                    fontFamily:
                        "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    background: "rgba(0,0,0,0.4)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    backdropFilter: "blur(8px)",
                    fontSize: 12,
                }}
            >
                <div>마우스 감도: 보통</div>
                <div>
                    시야각: {input.current.pitch.toFixed(2)}° /{" "}
                    {input.current.yaw.toFixed(2)}°
                </div>
            </div>
        </div>
    );
}
