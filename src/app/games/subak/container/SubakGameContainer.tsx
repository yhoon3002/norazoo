"use client";

import { useEffect, useRef } from "react";
import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import type { JoystickManager } from "nipplejs";
import SubakGamePresenter from "../presenter/SubakGamePresenter";
import { SubakGameContainerProps } from "../types/SubakGameTypes";
import { FRUITS } from "../data/Fruits";
import GameLoading from "@/app/common/GameLoading";

export default function SubakGameContainer(props: SubakGameContainerProps) {
    const matterRef = useRef<HTMLDivElement | null>(null);
    const joystickRef = useRef<HTMLDivElement | null>(null);
    const joystickManagerRef = useRef<JoystickManager | null>(null);

    const isTouchDevice = () => {
        return (
            typeof window !== "undefined" &&
            ("ontouchstart" in window || navigator.maxTouchPoints > 0)
        );
    };

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

        const startPoint = 15;
        const endPoint = 60;
        const wallThickness = 30;

        const leftWall = Bodies.rectangle(
            startPoint,
            height / 2,
            wallThickness,
            height - endPoint,
            {
                isStatic: true,
                render: { fillStyle: "#E6B143" },
            }
        );

        const rightWall = Bodies.rectangle(
            width - startPoint,
            height / 2,
            wallThickness,
            height - endPoint,
            {
                isStatic: true,
                render: { fillStyle: "#E6B143" },
            }
        );

        const bottomWall = Bodies.rectangle(
            width / 2,
            height - startPoint,
            width,
            endPoint,
            {
                isStatic: true,
                render: { fillStyle: "#E6B143" },
            }
        );

        const topWall = Bodies.rectangle(width / 2, endPoint * 2, width, 10, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: "#E6B143" },
        });

        topWall.plugin = topWall.plugin || {};
        topWall.plugin.name = "topWall";

        World.add(world, [leftWall, rightWall, bottomWall, topWall]);

        const runner = Runner.create();
        Render.run(render);
        Runner.run(runner, engine);

        let currentBody: Body | null = null;
        let currentFruit: { radius: number; name?: string } | null = null;
        let disableAction = false;
        let interval: ReturnType<typeof setInterval> | undefined = undefined;

        const addFruit = () => {
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

            body.plugin = body.plugin || {};
            body.plugin.index = index;

            currentBody = body;
            currentFruit = fruit;

            World.add(world, body);
        };

        window.onkeydown = (event) => {
            if (disableAction === true) {
                return;
            }

            if (currentBody !== null && currentFruit !== null) {
                switch (event.code) {
                    case "KeyA":
                        if (interval) {
                            return;
                        }
                        interval = setInterval(() => {
                            if (currentBody !== null && currentFruit !== null) {
                                if (
                                    currentBody.position.x -
                                        currentFruit.radius >
                                    wallThickness
                                ) {
                                    Body.setPosition(currentBody, {
                                        x: currentBody.position.x - 1,
                                        y: currentBody.position.y,
                                    });
                                }
                            }
                        }, 5);
                        break;
                    case "KeyD":
                        if (interval) {
                            return;
                        }
                        interval = setInterval(() => {
                            if (currentBody !== null && currentFruit !== null) {
                                if (
                                    currentBody.position.x +
                                        currentFruit.radius <
                                    width - wallThickness
                                ) {
                                    Body.setPosition(currentBody, {
                                        x: currentBody.position.x + 1,
                                        y: currentBody.position.y,
                                    });
                                }
                            }
                        });
                        break;
                    case "KeyS":
                        currentBody.isSleeping = false;
                        disableAction = true;

                        setTimeout(() => {
                            addFruit();
                            disableAction = false;
                        }, 1000);
                        break;
                }
            }
        };

        window.onkeyup = (event) => {
            switch (event.code) {
                case "KeyA":
                case "KeyD":
                    clearInterval(interval);
                    interval = undefined;
            }
        };

        Events.on(engine, "collisionStart", (event) => {
            event.pairs.forEach((collision) => {
                if (
                    collision.bodyA.plugin.index ===
                    collision.bodyB.plugin.index
                ) {
                    const index = collision.bodyA.plugin.index;

                    if (index === FRUITS.length - 1) {
                        return;
                    }

                    World.remove(world, [collision.bodyA, collision.bodyB]);

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

                    newBody.plugin = newBody.plugin || {};
                    newBody.plugin.index = index + 1;

                    World.add(world, newBody);
                }

                if (
                    !disableAction &&
                    (collision.bodyA.plugin.name === "topWall" ||
                        collision.bodyB.plugin.name === "topWall")
                ) {
                    alert("Game Over");
                }
            });
        });

        addFruit();

        if (
            typeof window !== "undefined" &&
            isTouchDevice() &&
            joystickRef.current
        ) {
            import("nipplejs").then((nipplejs) => {
                let lastDirection: string | null = null;
                let joystickInterval:
                    | ReturnType<typeof setInterval>
                    | undefined = undefined;

                if (joystickRef.current) {
                    if (joystickManagerRef.current) {
                        joystickManagerRef.current.destroy();
                        joystickManagerRef.current = null;
                    }

                    joystickManagerRef.current = nipplejs.create({
                        zone: joystickRef.current,
                        mode: "dynamic",
                        color: "green",
                        size: 80,
                        multitouch: false,
                    });

                    const manager = joystickManagerRef.current;
                    if (!manager) return;

                    const handleDirection = (
                        dir: "left" | "right" | "down" | null
                    ) => {
                        if (joystickInterval) {
                            clearInterval(joystickInterval);
                            joystickInterval = undefined;
                        }
                        if (dir === "left" || dir === "right") {
                            window.dispatchEvent(
                                new KeyboardEvent("keyup", {
                                    code: dir === "left" ? "KeyD" : "KeyA",
                                })
                            );
                            window.dispatchEvent(
                                new KeyboardEvent("keydown", {
                                    code: dir === "left" ? "KeyA" : "KeyD",
                                })
                            );
                            joystickInterval = setInterval(() => {
                                window.dispatchEvent(
                                    new KeyboardEvent("keydown", {
                                        code: dir === "left" ? "KeyA" : "KeyD",
                                    })
                                );
                            }, 100);
                        }
                        if (dir === "down") {
                            window.dispatchEvent(
                                new KeyboardEvent("keydown", { code: "KeyS" })
                            );
                        }
                    };

                    manager.on(
                        "move",
                        (
                            _: unknown,
                            data: {
                                direction?: {
                                    angle: "left" | "right" | "up" | "down";
                                };
                            }
                        ) => {
                            if (!data || !data.direction) return;
                            const dir = data.direction.angle;
                            if (dir === lastDirection) return;
                            lastDirection = dir;
                            if (dir === "left") handleDirection("left");
                            else if (dir === "right") handleDirection("right");
                            else if (dir === "down") handleDirection("down");
                            else handleDirection(null);
                        }
                    );

                    manager.on("end", () => {
                        clearInterval(joystickInterval);
                        joystickInterval = undefined;
                        window.dispatchEvent(
                            new KeyboardEvent("keyup", { code: "KeyA" })
                        );
                        window.dispatchEvent(
                            new KeyboardEvent("keyup", { code: "KeyD" })
                        );
                        lastDirection = null;
                    });
                }
            });
        }

        return () => {
            Render.stop(render);
            Runner.stop(runner);

            if (render.canvas && render.canvas.parentNode) {
                render.canvas.parentNode.removeChild(render.canvas);
            }

            if (joystickManagerRef.current) {
                joystickManagerRef.current.destroy();
                joystickManagerRef.current = null;
            }
        };
    }, []);

    return (
        <>
            {/* {props.isLoaded ? ( */}
            <SubakGamePresenter
                matterRef={matterRef}
                joystickRef={joystickRef}
            />
            {/* ) : (
                <GameLoading />
            )} */}
        </>
    );
}
