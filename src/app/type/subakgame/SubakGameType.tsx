import { RefObject } from "react";

export interface SubakGamePresenterProps {
    matterRef: RefObject<HTMLDivElement | null>;
    joystickRef: RefObject<HTMLDivElement | null>;
}
