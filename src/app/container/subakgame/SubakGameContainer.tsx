import { useEffect, useRef } from "react";
import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import SubakGamePresenter from "@/app/presenter/subakgame/SubakGamePresenter";
import { FRUITS } from "@/app/common/Fruits";

export default function SubakGameContainer() {
    const matterRef = useRef<HTMLDivElement | null>(null);

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
        let currentFruit: { radius: any; name?: string } | null = null;
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

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas && render.canvas.parentNode) {
                render.canvas.parentNode.removeChild(render.canvas);
            }
        };
    }, []);

    return (
        <>
            <SubakGamePresenter matterRef={matterRef} />
        </>
    );
}
