import { Bodies, Engine, Render, Runner, World } from "matter-js";
import SubakGamePresenter from "@/app/presenter/subakgame/SubakGamePresenter";
import { useEffect, useRef } from "react";

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

        const wallThickness = Math.max(width * 0.03, 15);
        const bottomGap = height * 0.1;

        const leftWall = Bodies.rectangle(
            wallThickness / 2,
            height / 2,
            wallThickness,
            height - bottomGap,
            {
                isStatic: true,
                render: {
                    fillStyle: "#E6B143",
                },
            }
        );

        const rightWall = Bodies.rectangle(
            wallThickness / 2,
            height / 2,
            wallThickness,
            height - bottomGap,
            {
                isStatic: true,
                render: {
                    fillStyle: "#E6B143",
                },
            }
        );

        const bottomWall = Bodies.rectangle(
            wallThickness / 2,
            width / 2,
            wallThickness,
            width,
            {
                isStatic: true,
                render: {
                    fillStyle: "#E6B143",
                },
            }
        );

        const topWall = Bodies.rectangle(
            wallThickness / 2,
            width / 2,
            wallThickness,
            width,
            {
                isStatic: true,
                render: {
                    fillStyle: "#E6B143",
                },
            }
        );

        World.add(world, [leftWall, topWall, rightWall, bottomWall]);

        const runner = Runner.create();
        Render.run(render);
        Runner.run(runner, engine);

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
