import { RefObject } from "react";

export interface SubakGameContainerProps {
    isLoaded: boolean;
    handleGameLoad: () => void;
}

export interface SubakGamePresenterProps {
    matterRef: RefObject<HTMLDivElement | null>;
    joystickRef: RefObject<HTMLDivElement | null>;
}
