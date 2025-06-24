import { useRef, useEffect } from "react";
import type { JoystickManager } from "nipplejs";
import useTouchDevice from "@/app/hooks/useTouchDevice";

const useJoystick = (
    joystickRef: React.RefObject<HTMLDivElement>,
    onDirection: (dir: "left" | "right" | "down" | null) => void
) => {
    const joystickManagerRef = useRef<JoystickManager | null>(null);

    useEffect(() => {
        if (!useTouchDevice || !joystickRef.current) return;

        let lastDirection: string | null = null;
        let joystickInterval: ReturnType<typeof setInterval> | undefined =
            undefined;

        import("nipplejs").then((nipplejs) => {
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

            manager.on(
                "move",
                (
                    _: unknown,
                    data: {
                        direction?: { angle: "left" | "right" | "up" | "down" };
                    }
                ) => {
                    if (!data || !data.direction) return;
                    const dir = data.direction.angle;
                    if (dir === lastDirection) return;
                    lastDirection = dir;
                    onDirection(
                        dir === "left" || dir === "right" || dir === "down"
                            ? dir
                            : null
                    );
                }
            );
            manager.on("end", () => {
                onDirection(null);
                lastDirection = null;
            });
        });

        return () => {
            if (joystickManagerRef.current) {
                joystickManagerRef.current.destroy();
                joystickManagerRef.current = null;
            }
            if (joystickInterval) clearInterval(joystickInterval);
        };
    }, [joystickRef, onDirection]);
};
