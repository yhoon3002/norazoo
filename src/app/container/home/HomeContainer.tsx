import { useState } from "react";
import HomePresenter from "@/app/presenter/home/HomePresenter";
import { GameKind } from "@/app/type/home/HomeType";
import JaeummoeumContainer from "../jaeummoeum/JaeummoeumContainer";
import ModalTitle from "@/app/common/ModalTitle";

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
            desc: "숨겨진 한글 단어를 맞혀보세요 !\n자모(자음, 모음)를 입력하면 정답과 얼마나 맞았는지 알려줍니다.\n정답에 가까운 조합을 찾아가며 단어를 완성해보세요 !",
        },
    ];

    return (
        <>
            <HomePresenter
                gameKind={gameKind}
                handleOpenModal={handleOpenModal}
            />
            {openModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-[90vw] w-full h-full divide-y-2 divide-solid">
                        <ModalTitle
                            currentGame={currentGame}
                            handleCloseModal={handleCloseModal}
                        ></ModalTitle>
                        <div className="flex flex-col h-full">
                            {currentGame?.name === "Jaeum Moeum" && (
                                <JaeummoeumContainer
                                    handleGameLoad={() => setGameLoaded(true)}
                                    isLoaded={minTimePassed && gameLoaded}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
