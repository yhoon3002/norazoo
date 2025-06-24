import { useRef, useEffect } from "react";
import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import { FRUITS } from "../data/Fruits";

export function useMatter(
    matterRef: React.RefObject<HTMLDivElement>,
    onGameOver: () => void
) {
    const engineRef = useRef<Engine | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentBodyRef = useRef<Body | null>(null);
    const currentFruitRef = useRef<{ radius: number; name?: string } | null>(
        null
    );

    useEffect(() => {
        if (!matterRef.current) return;

        const width = matterRef.current.clientWidth;
        const height = matterRef.current.clientHeight;
        const engine = Engine.create();
        const render = Render.create({
            engine,
            element: matterRef.current,
            options: {
                wireframes: false,
                background: "#F7F4C8",
                width,
                height,
            },
        });

        const world = engine.world;

        // 월드 벽
        const startPoint = 15,
            endPoint = 60,
            wallThickness = 30;

        const leftWall = Bodies.rectangle(
            startPoint,
            height / 2,
            wallThickness,
            height - endPoint,
            { isStatic: true, render: { fillStyle: "#E6B143" } }
        );

        const rightWall = Bodies.rectangle(
            width - startPoint,
            height / 2,
            wallThickness,
            height - endPoint,
            { isStatic: true, render: { fillStyle: "#E6B143" } }
        );

        const bottomWall = Bodies.rectangle(
            width / 2,
            height - startPoint,
            width,
            endPoint,
            { isStatic: true, render: { fillStyle: "#E6B143" } }
        );

        const topWall = Bodies.rectangle(width / 2, endPoint * 2, width, 10, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: "#E6B143" },
        });

        topWall.plugin = topWall.plugin || {};
        topWall.plugin.name = "topWall";

        World.add(engine.world, [leftWall, rightWall, bottomWall, topWall]);

        const runner = Runner.create();
        Render.run(render);
        Runner.run(runner, engine);

        function addFruit() {
            const index = Math.floor(Math.random() * 5);
            const fruit = FRUITS[index];
            const body = Bodies.circle(width / 2, endPoint, fruit.radius, {
                isSleeping: true,
                render: {
                    sprite: {
                        texture: `/fruits/${fruit.name}.png`,
                        xScale: 1,
                        yScale: 1,
                    },
                },
                restitution: 0.2,
            });
            (body as any).plugin = { index };
            currentBodyRef.current = body;
            currentFruitRef.current = fruit;
            World.add(engine.world, body);
        }

        // 키이벤트
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!currentBodyRef.current || !currentFruitRef.current) return;
            switch (event.code) {
                case "KeyA":
                    if (intervalRef.current) return;
                    intervalRef.current = setInterval(() => {
                        const body = currentBodyRef.current;
                        const fruit = currentFruitRef.current;
                        if (
                            body &&
                            fruit &&
                            body.position.x - fruit.radius > wallThickness
                        ) {
                            Body.setPosition(body, {
                                x: body.position.x - 1,
                                y: body.position.y,
                            });
                        }
                    }, 5);
                    break;
                case "KeyD":
                    if (intervalRef.current) return;
                    intervalRef.current = setInterval(() => {
                        const body = currentBodyRef.current;
                        const fruit = currentFruitRef.current;
                        if (
                            body &&
                            fruit &&
                            body.position.x + fruit.radius <
                                width - wallThickness
                        ) {
                            Body.setPosition(body, {
                                x: body.position.x + 1,
                                y: body.position.y,
                            });
                        }
                    }, 5);
                    break;
                case "KeyS":
                    currentBodyRef.current.isSleeping = false;
                    setTimeout(() => addFruit(), 1000);
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (["KeyA", "KeyD"].includes(event.code) && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        Events.on(engine, "collisionStart", (event) => {
            event.pairs.forEach((collision) => {
                if (
                    (collision.bodyA as any).plugin?.index ===
                    (collision.bodyB as any).plugin?.index
                ) {
                    const index = (collision.bodyA as any).plugin.index;
                    if (index === FRUITS.length - 1) return;
                    World.remove(engine.world, [
                        collision.bodyA,
                        collision.bodyB,
                    ]);
                    const newFruit = FRUITS[index + 1];
                    const newBody = Bodies.circle(
                        collision.collision.supports[0].x,
                        collision.collision.supports[0].y,
                        newFruit.radius,
                        {
                            render: {
                                sprite: {
                                    texture: `/fruits/${newFruit.name}.png`,
                                    xScale: 1,
                                    yScale: 1,
                                },
                            },
                        }
                    );
                    (newBody as any).plugin = { index: index + 1 };
                    World.add(engine.world, newBody);
                }
                if (
                    (collision.bodyA as any).plugin?.name === "topWall" ||
                    (collision.bodyB as any).plugin?.name === "topWall"
                ) {
                    onGameOver();
                }
            });
        });

        addFruit();

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas && render.canvas.parentNode) {
                render.canvas.parentNode.removeChild(render.canvas);
            }
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [matterRef, onGameOver]);
}
