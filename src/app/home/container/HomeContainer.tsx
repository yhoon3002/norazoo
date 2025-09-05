"use client";

import { useEffect, useState } from "react";
import HomePresenter from "../presenter/HomePresenter";
import { GameKind } from "../types/HomeType";

export default function HomeContainer() {
    const [openModal, setOpenModal] = useState(false);
    const [currentGame, setCurrentGame] = useState<GameKind | null>(null);
    const [minTimePassed, setMinTimePassed] = useState(false);
    const [gameLoaded, setGameLoaded] = useState(false);

    const handleOpenModal = (game: GameKind) => {
        setCurrentGame(game);
        setOpenModal(true);
        setMinTimePassed(false);
        setGameLoaded(false);

        setTimeout(() => setMinTimePassed(true), 2000);
    };

    const handleCloseModal = () => {
        setCurrentGame(null);
        setOpenModal(false);
        setMinTimePassed(false);
        setGameLoaded(false);
    };

    const gameKind = [
        {
            name: "Jaeum Moeum",
            desc: "자음 모음 게임",
        },
        {
            name: "Subak Game",
            desc: "수박 게임",
        },
        {
            name: "Pinball",
            desc: "오늘의 당첨자는 ?",
        },
        {
            name: "Maze Escape",
            desc: "오늘의 당첨자는 ?",
        },
        {
            name: "Race",
            desc: "오늘의 당첨자는 ?",
        },
        {
            name: "Battle Arena",
            desc: "배틀 아레나",
        },
        {
            name: "추가 예정6",
            desc: "추가 예정6",
        },
        {
            name: "추가 예정7",
            desc: "추가 예정7",
        },
    ];

    return (
        <>
            <HomePresenter
                gameKind={gameKind}
                openModal={openModal}
                currentGame={currentGame}
                minTimePassed={minTimePassed}
                gameLoaded={gameLoaded}
                setGameLoaded={setGameLoaded}
                handleOpenModal={handleOpenModal}
                handleCloseModal={handleCloseModal}
            />
        </>
    );
}
