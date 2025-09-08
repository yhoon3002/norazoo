"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as Ably from "ably";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { WorldState } from "../types";

// Variables
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CDN_BASE = (process.env.NEXT_PUBLIC_ASSET_CDN ?? "").replace(/\/$/, "");

// Config
const PLAYER_COLOR_ME = 0x7ad7f0;
const PLAYER_COLOR_OTHERS = 0xf0a87a;
const BULLET_COLOR = 0xffd700;
const FLOOR_COLOR = 0x90ee90;
const WALL_COLOR = 0xb0b0b0;
const COVER_COLOR = 0x8b4513;

const FILES = {
    character: "character.glb",
    idle: "anim_idle.glb",
    run: "anim_run.glb",
    shoot: "anim_shoot.glb",
};

const ASSET_BASE_CANDIDATES = Array.from(
    new Set([
        ...(CDN_BASE ? [`${CDN_BASE}/battlearena`] : []),
        `${BASE_PATH}/assets/battlearena`,
        `${BASE_PATH}/battlearena`,
    ])
);

// FPS 게임 관련 상수
const eyeHeight = 1.6;
const MODEL_YAW_OFFSET = Math.PI;
const MAGAZINE_SIZE = 30;
const RELOAD_TIME = 2000; // 2초
const AUTO_FIRE_RATE = 100; // 100ms 간격 (600 RPM)
const ZOOM_FOV = 30; // 줌 시 시야각
const NORMAL_FOV = 75; // 일반 시야각

type InputState = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    mouseDown: boolean;
    rightMouseDown: boolean;
    yaw: number;
    pitch: number;
};

type PlayerVisual = {
    root: THREE.Object3D;
    mixer: THREE.AnimationMixer | null;
    actions: Partial<
        Record<"idle" | "run" | "shoot" | "reload", THREE.AnimationAction>
    >;
    playing: "idle" | "run" | "shoot" | "reload";
    lastPos: THREE.Vector3;
    isCapsuleFallback: boolean;
    weapon?: THREE.Object3D; // 무기 오브젝트
};

type WeaponState = {
    ammo: number;
    isReloading: boolean;
    lastShotTime: number;
};

export default function BattleArenaAbly() {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const myIdRef = useRef<string | null>(null);
    const input = useRef<InputState>({
        up: false,
        down: false,
        left: false,
        right: false,
        mouseDown: false,
        rightMouseDown: false,
        yaw: 0,
        pitch: 0,
    });

    // 무기 상태 관리
    const weaponState = useRef<WeaponState>({
        ammo: MAGAZINE_SIZE,
        isReloading: false,
        lastShotTime: 0,
    });

    const fireFlag = useRef(false);
    const autoFireTimer = useRef<NodeJS.Timeout | null>(null);
    const [connected, setConnected] = useState(false);
    const [myId, setMyId] = useState<string | null>(null);
    const [arenaSize] = useState(40);
    const [isZoomed, setIsZoomed] = useState(false);
    const [ammoCount, setAmmoCount] = useState(MAGAZINE_SIZE);
    const [isReloading, setIsReloading] = useState(false);

    const [assetStatus, setAssetStatus] = useState({
        base: false,
        idle: false,
        run: false,
        shoot: false,
    });
    const [scoreboard, setScoreboard] = useState<
        { id: string; name?: string; score: number }[]
    >([]);

    // three core
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const floorRef = useRef<THREE.Mesh | null>(null);

    // 내 위치를 저장하여 카메라가 붙도록 사용
    const myPosRef = useRef(new THREE.Vector3(0, eyeHeight, 0));

    // 3D 모델 및 애니메이션
    const baseModelRef = useRef<THREE.Object3D | null>(null);
    // const weaponModelRef = useRef<THREE.Object3D | null>(null);
    const clipsRef = useRef<
        Partial<
            Record<"idle" | "run" | "shoot" | "reload", THREE.AnimationClip>
        >
    >({});
    const visualsRef = useRef<Map<string, PlayerVisual>>(new Map());
    const prevTimeRef = useRef<number>(performance.now());
    const requestRef = useRef<number | null>(null);

    // 총알 geometry 및 material 재사용 (더 작고 현실적으로)
    const bulletGeometryRef = useRef<THREE.CapsuleGeometry | null>(null);
    const bulletMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

    // 컴포넌트 마운트 시 한 번만 생성
    useEffect(() => {
        // 더 작고 현실적인 총알
        bulletGeometryRef.current = new THREE.CapsuleGeometry(0.02, 0.15, 4, 8);
        bulletMaterialRef.current = new THREE.MeshStandardMaterial({
            color: BULLET_COLOR,
            emissive: new THREE.Color(0x444400),
            metalness: 0.8,
            roughness: 0.2,
        });

        return () => {
            bulletGeometryRef.current?.dispose();
            bulletMaterialRef.current?.dispose();
        };
    }, []);

    const createBulletGeometry = () => bulletGeometryRef.current;
    const createBulletMaterial = () => bulletMaterialRef.current;

    // 무기 생성 함수
    const createWeapon = () => {
        const weaponGroup = new THREE.Group();

        // 총신
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2,
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.2, 0, 0);

        // 총몸
        const bodyGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.6,
            roughness: 0.4,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, 0);

        // 손잡이
        const gripGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.03);
        const gripMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.3,
            roughness: 0.7,
        });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(-0.1, -0.1, 0);

        weaponGroup.add(barrel, body, grip);
        weaponGroup.position.set(0.3, -0.2, 0.1);
        weaponGroup.rotation.y = Math.PI / 2;

        return weaponGroup;
    };

    // 엄폐물 생성 함수 (서버와 동일한 위치로 하드코딩)
    const createCoverObjects = (scene: THREE.Scene) => {
        const coverMaterial = new THREE.MeshStandardMaterial({
            color: COVER_COLOR,
            roughness: 0.8,
            metalness: 0.1,
        });

        // 하드코딩된 나무 상자들 (서버와 정확히 동일)
        const boxes = [
            { x: 10, z: 5, width: 1.2, height: 1.0, depth: 1.3 },
            { x: -8, z: 12, width: 1.5, height: 0.9, depth: 1.1 },
            { x: 15, z: -10, width: 1.1, height: 1.1, depth: 1.4 },
            { x: -12, z: -6, width: 1.3, height: 0.8, depth: 1.2 },
            { x: 6, z: -15, width: 1.4, height: 1.0, depth: 1.0 },
            { x: -5, z: 8, width: 1.0, height: 1.2, depth: 1.5 },
            { x: 18, z: 3, width: 1.2, height: 0.9, depth: 1.1 },
            { x: -15, z: -12, width: 1.3, height: 1.1, depth: 1.2 },
        ];

        boxes.forEach((boxData) => {
            const boxGeometry = new THREE.BoxGeometry(
                boxData.width,
                boxData.height,
                boxData.depth
            );
            const box = new THREE.Mesh(boxGeometry, coverMaterial);
            box.position.set(boxData.x, boxData.height / 2, boxData.z);
            box.castShadow = true;
            box.receiveShadow = true;
            scene.add(box);
        });

        // 하드코딩된 벽 엄폐물 (서버와 정확히 동일)
        const walls = [
            { x: 12, z: 12, width: 3, height: 1.5, thickness: 0.2 },
            { x: -10, z: -10, width: 3, height: 1.5, thickness: 0.2 },
            { x: -12, z: 15, width: 3, height: 1.5, thickness: 0.2 },
            { x: 15, z: -15, width: 3, height: 1.5, thickness: 0.2 },
        ];

        walls.forEach((wallData) => {
            const wallGeometry = new THREE.BoxGeometry(
                wallData.width,
                wallData.height,
                wallData.thickness
            );
            const wall = new THREE.Mesh(wallGeometry, coverMaterial);
            wall.position.set(wallData.x, wallData.height / 2, wallData.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            scene.add(wall);
        });

        // 하드코딩된 원형 엄폐물 (서버와 정확히 동일)
        const cylinders = [
            { x: 5, z: 8, radius: 0.5, height: 1.2 },
            { x: -6, z: 4, radius: 0.5, height: 1.2 },
            { x: 8, z: -8, radius: 0.5, height: 1.2 },
            { x: -10, z: 2, radius: 0.5, height: 1.2 },
            { x: 3, z: -12, radius: 0.5, height: 1.2 },
            { x: -4, z: -5, radius: 0.5, height: 1.2 },
        ];

        cylinders.forEach((cylData) => {
            const cylinderGeometry = new THREE.CylinderGeometry(
                cylData.radius,
                cylData.radius,
                cylData.height,
                8
            );
            const cylinder = new THREE.Mesh(cylinderGeometry, coverMaterial);
            cylinder.position.set(cylData.x, cylData.height / 2, cylData.z);
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            scene.add(cylinder);
        });
    };

    // 발사 함수
    const handleFire = () => {
        const now = Date.now();
        if (
            weaponState.current.isReloading ||
            weaponState.current.ammo <= 0 ||
            now - weaponState.current.lastShotTime < AUTO_FIRE_RATE
        ) {
            return false;
        }

        weaponState.current.ammo--;
        weaponState.current.lastShotTime = now;
        setAmmoCount(weaponState.current.ammo);
        fireFlag.current = true;

        // 탄창이 비었으면 자동 재장전
        if (weaponState.current.ammo <= 0) {
            startReload();
        }

        return true;
    };

    // 재장전 함수
    const startReload = () => {
        if (
            weaponState.current.isReloading ||
            weaponState.current.ammo >= MAGAZINE_SIZE
        ) {
            return;
        }

        weaponState.current.isReloading = true;
        setIsReloading(true);

        setTimeout(() => {
            weaponState.current.ammo = MAGAZINE_SIZE;
            weaponState.current.isReloading = false;
            setAmmoCount(MAGAZINE_SIZE);
            setIsReloading(false);
        }, RELOAD_TIME);
    };

    // Three.js mounting
    useEffect(() => {
        const mount = mountRef.current!;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        const camera = new THREE.PerspectiveCamera(
            NORMAL_FOV,
            mount.clientWidth / mount.clientHeight,
            0.01,
            1000
        );
        camera.position.set(0, eyeHeight, 0);
        camera.rotation.order = "YXZ";

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mount.appendChild(renderer.domElement);

        // 조명 개선
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemi.position.set(0, 50, 0);
        scene.add(hemi);

        const dir = new THREE.DirectionalLight(0xffffff, 1.0);
        dir.position.set(20, 30, 20);
        dir.castShadow = true;
        dir.shadow.mapSize.width = 4096;
        dir.shadow.mapSize.height = 4096;
        dir.shadow.camera.near = 0.1;
        dir.shadow.camera.far = 100;
        dir.shadow.camera.left = -50;
        dir.shadow.camera.right = 50;
        dir.shadow.camera.top = 50;
        dir.shadow.camera.bottom = -50;
        scene.add(dir);

        // 바닥
        const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
        const floorMat = new THREE.MeshStandardMaterial({
            color: FLOOR_COLOR,
            roughness: 0.8,
            metalness: 0.1,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        floorRef.current = floor;

        // 벽
        const wallHeight = 3;
        const wallThick = 0.5;
        const wallMat = new THREE.MeshStandardMaterial({
            color: WALL_COLOR,
            roughness: 0.6,
            metalness: 0.2,
        });
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
            wall.castShadow = true;
            wall.receiveShadow = true;
            scene.add(wall);
        });

        // 엄폐물 추가
        createCoverObjects(scene);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;

        const onResize = () => {
            if (
                !mountRef.current ||
                !cameraRef.current ||
                !rendererRef.current
            ) {
                return;
            }

            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };

        const ro = new ResizeObserver(onResize);
        ro.observe(mount);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                ro.disconnect();
                mount.removeChild(renderer.domElement);
                renderer.dispose();
            }
        };
    }, [arenaSize]);

    // GLB loader
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

    // asset load
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

                if (cancelled) {
                    return;
                }

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
                console.error("[DEBUG] GLB 로드 실패: ", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // Ably 연결 (clientId 불일치 문제 해결)
    useEffect(() => {
        let disposed = false;
        let sendTimer: NodeJS.Timeout | null = null;
        let stateCh: Ably.RealtimeChannel | null = null;
        let realtime: Ably.Realtime | null = null;

        const clientId = `player_${Math.random().toString(36).substr(2, 9)}`;

        const initAbly = async () => {
            realtime = new Ably.Realtime({
                authUrl: `/api/ably-token?clientId=${encodeURIComponent(
                    clientId
                )}`,
                clientId: clientId,
            });

            await realtime.connection.whenState("connected");
            if (disposed) return;

            const myClientId = realtime.auth.clientId!;
            setMyId(myClientId);
            myIdRef.current = myClientId;

            stateCh = realtime.channels.get("arena:state");
            const inputsCh = realtime.channels.get("arena:inputs");
            await Promise.all([stateCh.attach(), inputsCh.attach()]);

            await stateCh.presence.enter({});

            stateCh.subscribe("state", (msg) => {
                const world = msg.data as WorldState;
                applyWorld(world);
                setScoreboard(
                    world.players
                        .map((p) => ({
                            id: p.id,
                            name: p.name,
                            score: p.score,
                        }))
                        .sort((a, b) => b.score - a.score)
                );
                setConnected(true);
            });

            let seq = 0;
            sendTimer = setInterval(async () => {
                const q = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        input.current.pitch,
                        input.current.yaw,
                        0,
                        "YXZ"
                    )
                );
                const forward = new THREE.Vector3(0, 0, -1)
                    .applyQuaternion(q)
                    .normalize();

                const payload = {
                    seq: seq++,
                    up: input.current.up,
                    down: input.current.down,
                    left: input.current.left,
                    right: input.current.right,
                    yaw: input.current.yaw,
                    pitch: input.current.pitch,
                    fire: false as boolean,
                    fireDirection: { x: forward.x, y: forward.y, z: forward.z },
                };

                if (fireFlag.current) {
                    payload.fire = true;
                    fireFlag.current = false;
                }

                await inputsCh.publish("input", payload);
            }, 1000 / 30);
        };

        initAbly().catch(console.error);

        return () => {
            disposed = true;
            if (sendTimer) clearInterval(sendTimer);
            if (stateCh) {
                stateCh.presence.leave().catch(() => {});
            }
            if (realtime) {
                realtime.close();
            }
        };
    }, []);

    // 플레이어 비주얼 (무기 추가)
    function ensurePlayerVisual(
        id: string,
        isMe: boolean,
        scene: THREE.Scene
    ): PlayerVisual {
        let vis = visualsRef.current.get(id);

        if (vis) {
            return vis;
        }

        let root: THREE.Object3D;
        let mixer: THREE.AnimationMixer | null = null;
        let actions: PlayerVisual["actions"] = {};
        let isCapsuleFallback = false;
        let weapon: THREE.Object3D | undefined;

        if (baseModelRef.current) {
            root = clone(baseModelRef.current) as THREE.Object3D;

            try {
                mixer = new THREE.AnimationMixer(root);

                if (clipsRef.current.idle) {
                    actions.idle = mixer.clipAction(clipsRef.current.idle);
                }
                if (clipsRef.current.run) {
                    actions.run = mixer.clipAction(clipsRef.current.run);
                }
                if (clipsRef.current.shoot) {
                    const shootAct: THREE.AnimationAction = mixer.clipAction(
                        clipsRef.current.shoot
                    );
                    shootAct.setLoop(THREE.LoopOnce, 1);
                    shootAct.clampWhenFinished = true;
                    actions.shoot = shootAct;
                }

                actions.idle?.play();

                // 무기 추가
                weapon = createWeapon();

                // 캐릭터의 오른손에 무기 부착 (대략적인 위치)
                const rightHand =
                    root.getObjectByName("RightHand") ||
                    root.getObjectByName("mixamorigRightHand") ||
                    root;

                if (rightHand && rightHand !== root) {
                    rightHand.add(weapon);
                } else {
                    // 오른손을 찾지 못했을 경우 루트에 추가
                    weapon.position.set(0.5, 1.2, 0.3);
                    root.add(weapon);
                }
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

            // 폴백용 무기
            weapon = createWeapon();
            weapon.position.set(0.8, 1.0, 0);
            root.add(weapon);
        }

        if (isMe || myIdRef.current === id) {
            root.visible = false;
        }

        scene.add(root);

        vis = {
            root,
            mixer,
            actions,
            playing: "idle",
            lastPos: new THREE.Vector3(),
            isCapsuleFallback,
            weapon,
        };
        visualsRef.current.set(id, vis);
        return vis;
    }

    const crossFade = (
        vis: PlayerVisual,
        next: PlayerVisual["playing"],
        fade = 0.12
    ) => {
        if (vis.playing === next) {
            return;
        }

        try {
            const curr = vis.actions[vis.playing];
            const nxt = vis.actions[next];

            if (nxt) {
                nxt.reset().fadeIn(fade).play();
                curr?.fadeOut(fade);
                vis.playing = next;
            }
        } catch {}
    };

    // 월드 상태 적용
    const applyWorld = (state: WorldState) => {
        const scene = sceneRef.current!;
        const present = new Set<string>();

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

            if (vis.mixer) {
                crossFade(vis, moved > 0.01 ? "run" : "idle");
                vis.lastPos.set(p.pos.x, 0, p.pos.z);
            }
        }

        for (const [id, vis] of [...visualsRef.current]) {
            if (!present.has(id)) {
                scene.remove(vis.root);
                vis.root.traverse((o: THREE.Object3D) => {
                    if (o instanceof THREE.Mesh) {
                        o.geometry?.dispose?.();
                        if (Array.isArray(o.material)) {
                            o.material.forEach((m: THREE.Material) =>
                                m.dispose()
                            );
                        } else {
                            o.material?.dispose?.();
                        }
                    }
                });
                visualsRef.current.delete(id);
            }
        }

        // 총알 처리 (더 작고 현실적으로)
        if (!scene.getObjectByName("bulletPool")) {
            const group = new THREE.Group();
            group.name = "bulletPool";
            scene.add(group);
        }

        const pool = scene.getObjectByName("bulletPool") as THREE.Group;
        const byId = new Map<string, THREE.Mesh>();
        pool.children.forEach((c) => {
            if (c instanceof THREE.Mesh && c.userData?.id) {
                byId.set(c.userData.id, c);
            }
        });

        const presentB = new Set<string>();

        for (const b of state.bullets) {
            presentB.add(b.id);
            let obj = byId.get(b.id);

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
                            200
                        );
                    }
                }
            }

            if (!obj) continue;

            const dir3 = new THREE.Vector3(
                b.vel?.x ?? 0,
                b.vel?.y ?? 0,
                b.vel?.z ?? 0
            );

            if (dir3.lengthSq() > 0) {
                dir3.normalize();
            }

            const isMine = b.ownerId === myIdRef.current;
            const selfOffset = isMine ? 0.3 : 0.0;

            obj.position.set(
                (b.pos?.x ?? 0) + dir3.x * selfOffset,
                b.pos?.y ?? 0,
                (b.pos?.z ?? 0) + dir3.z * selfOffset
            );

            if (dir3.lengthSq() > 0) {
                obj.lookAt(obj.position.clone().add(dir3));
                obj.rotateZ(Math.PI / 2);
            }
        }

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
            if (me) {
                myPosRef.current.set(me.pos.x, eyeHeight, me.pos.z);
            }
        }
    };

    // 렌더 루프 (줌 기능 포함)
    useEffect(() => {
        const loop = () => {
            const now = performance.now();
            const dt = (now - prevTimeRef.current) / 1000;
            prevTimeRef.current = now;

            visualsRef.current.forEach((vis) => vis.mixer?.update(dt));

            const cam = cameraRef.current;
            if (cam) {
                cam.position.copy(myPosRef.current);

                // 줌 기능
                const targetFov = isZoomed ? ZOOM_FOV : NORMAL_FOV;
                if (Math.abs(cam.fov - targetFov) > 0.1) {
                    cam.fov += (targetFov - cam.fov) * 0.1;
                    cam.updateProjectionMatrix();
                }
            }

            if (sceneRef.current && cameraRef.current && rendererRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isZoomed]);

    // 개선된 마우스 및 키보드 입력 처리
    useEffect(() => {
        const mount = mountRef.current!;
        const requestPointer = () => mount.requestPointerLock();

        // 키보드 입력
        const down = (e: KeyboardEvent) => {
            if (e.code === "KeyW") input.current.up = true;
            if (e.code === "KeyS") input.current.down = true;
            if (e.code === "KeyA") input.current.left = true;
            if (e.code === "KeyD") input.current.right = true;
            if (e.code === "KeyR") startReload(); // R키로 재장전
        };

        const up = (e: KeyboardEvent) => {
            if (e.code === "KeyW") input.current.up = false;
            if (e.code === "KeyS") input.current.down = false;
            if (e.code === "KeyA") input.current.left = false;
            if (e.code === "KeyD") input.current.right = false;
        };

        // 마우스 이동
        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === mount) {
                const sensX = isZoomed ? 0.001 : 0.003; // 줌 시 감도 낮춤
                const sensY = isZoomed ? 0.001 : 0.003;

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

        // 마우스 버튼 처리
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) {
                // 좌클릭
                input.current.mouseDown = true;
                if (handleFire()) {
                    // 연사 모드 시작
                    autoFireTimer.current = setInterval(() => {
                        if (input.current.mouseDown) {
                            handleFire();
                        } else {
                            if (autoFireTimer.current) {
                                clearInterval(autoFireTimer.current);
                                autoFireTimer.current = null;
                            }
                        }
                    }, AUTO_FIRE_RATE);
                }
            } else if (e.button === 2) {
                // 우클릭
                input.current.rightMouseDown = true;
                setIsZoomed(true);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) {
                // 좌클릭
                input.current.mouseDown = false;
                if (autoFireTimer.current) {
                    clearInterval(autoFireTimer.current);
                    autoFireTimer.current = null;
                }
            } else if (e.button === 2) {
                // 우클릭
                input.current.rightMouseDown = false;
                setIsZoomed(false);
            }
        };

        // 우클릭 컨텍스트 메뉴 비활성화
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        mount.addEventListener("click", requestPointer);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("contextmenu", handleContextMenu);

        return () => {
            mount.removeEventListener("click", requestPointer);
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("contextmenu", handleContextMenu);

            if (autoFireTimer.current) {
                clearInterval(autoFireTimer.current);
            }
        };
    }, [isZoomed]);

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {/* 크로스헤어 (줌 시 더 정확하게) */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: isZoomed ? "10px" : "20px",
                    height: isZoomed ? "10px" : "20px",
                    border: "2px solid rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 1000,
                    transition: "all 0.2s ease",
                }}
            />

            {/* 줌 인디케이터 */}
            {isZoomed && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "200px",
                        height: "200px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                        zIndex: 999,
                    }}
                />
            )}

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

            {/* 개선된 HUD */}
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
                    <b style={{ color: "#7ad7f0" }}>FPS 배틀 아레나</b>
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
                        <strong>조작법:</strong>
                    </div>
                    <div>WASD: 이동 · 마우스: 시선</div>
                    <div>좌클릭: 발사 (연사) · 우클릭: 줌</div>
                    <div>R: 재장전 · 화면클릭: 마우스잠금</div>
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

            {/* 탄약 및 상태 HUD */}
            <div
                style={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    color: "#e8e8e8",
                    fontFamily:
                        "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    background: "rgba(0,0,0,0.6)",
                    padding: "12px 16px",
                    borderRadius: 8,
                    backdropFilter: "blur(8px)",
                    fontSize: 14,
                    minWidth: 150,
                }}
            >
                <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "#94a3b8" }}>탄약:</span>{" "}
                    <span
                        style={{
                            color: ammoCount <= 5 ? "#ef4444" : "#22c55e",
                            fontWeight: "bold",
                            fontSize: "16px",
                        }}
                    >
                        {ammoCount}/{MAGAZINE_SIZE}
                    </span>
                </div>

                {isReloading && (
                    <div style={{ color: "#fbbf24", fontSize: 12 }}>
                        재장전 중...
                    </div>
                )}

                {isZoomed && (
                    <div style={{ color: "#7ad7f0", fontSize: 12 }}>ZOOM</div>
                )}

                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                    시야각: {input.current.pitch.toFixed(2)}° /{" "}
                    {input.current.yaw.toFixed(2)}°
                </div>
            </div>

            {/* 탄약 부족 경고 */}
            {ammoCount <= 5 && !isReloading && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -150%)",
                        color: "#ef4444",
                        fontSize: "18px",
                        fontWeight: "bold",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                        animation: "pulse 1s infinite",
                        pointerEvents: "none",
                        zIndex: 1000,
                    }}
                >
                    {ammoCount === 0 ? "탄약 소진!" : "탄약 부족!"}
                </div>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            `}</style>
        </div>
    );
}
