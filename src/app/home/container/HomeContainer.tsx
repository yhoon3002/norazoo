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
            desc: "숨겨진 한글 단어를 맞혀보세요!\n자모(자음, 모음)를 입력하면 정답과 얼마나 맞았는지 알려줍니다.\n정답에 가까운 조합을 찾아가며 단어를 완성해보세요!",
        },
        {
            name: "Subak Game",
            desc: "수박 게임",
        },
        {
            name: "추가 예정2",
            desc: "추가 예정2",
        },
        {
            name: "추가 예정3",
            desc: "추가 예정3",
        },
        {
            name: "추가 예정4",
            desc: "추가 예정4",
        },
        {
            name: "추가 예정5",
            desc: "추가 예정5",
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

    useEffect(() => {
        console.log(minTimePassed);
        console.log(gameLoaded);
    }, [minTimePassed, gameLoaded]);

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
