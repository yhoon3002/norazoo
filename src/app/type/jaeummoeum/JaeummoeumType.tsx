export interface JaeummoeumContainerProps {
    handleGameLoad: () => void;
    handleCloseModal: () => void;
    isLoaded: boolean;
}

export interface JaeummoeumPresenterProps {
    randomWord: string[];
    keyboardList1: string[];
    keyboardList2: string[];
    keyboardList3: string[];
    inputs: string[];
    guessList: string[][];
    judgeList: string[][];
    keyboardStatus: { [key: string]: "correct" | "exist" | "none" | undefined };
    allCorrect: boolean;
    handleInput: (e: React.ChangeEvent<HTMLInputElement>, idx: number) => void;
    handleSend: () => void;
    playAgain: () => void;
    handleCloseModal: () => void;
}
