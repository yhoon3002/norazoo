export type GameKind = {
    name: string;
    desc: string;
};

export interface HomePresenterProps {
    gameKind: GameKind[];
    openModal: boolean;
    currentGame: GameKind | null;
    minTimePassed: boolean;
    gameLoaded: boolean;
    setGameLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    handleOpenModal: (game: GameKind) => void;
    handleCloseModal: () => void;
}
