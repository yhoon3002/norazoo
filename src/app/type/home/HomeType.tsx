export type GameKind = {
    name: string;
    desc: string;
};

export interface HomePresenterProps {
    gameKind: GameKind[];
    handleOpenModal: (game: GameKind) => void;
}
