import { RefObject } from "react";

export interface JaeummoeumContainerProps {
    handleGameLoad: () => void;
    handleCloseModal: () => void;
    isLoaded: boolean;
}

export interface JaeummoeumPresenterProps {
    randomWord: string[];
    inputs: string[];
    guessList: string[][];
    judgeList: string[][];
    keyboardStatus: { [key: string]: "correct" | "exist" | "none" | undefined };
    allCorrect: boolean;
    guessScrollRef: RefObject<HTMLDivElement | null>;
    handleInput: (e: React.ChangeEvent<HTMLInputElement>, idx: number) => void;
    handleSend: () => void;
    playAgain: () => void;
    handleCloseModal: () => void;
}
