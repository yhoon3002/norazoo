import JaeummoeumContainer from "@/app/games/jaeummoeum/container/JaeummoeumContainer";
import SubakGameContainer from "@/app/games/subak/container/SubakGameContainer";
import { HomePresenterProps } from "../types/HomeType";
import Card from "@/app/common/Card";
import ModalTitle from "@/app/common/ModalTitle";

export default function HomePresenter(props: HomePresenterProps) {
    return (
        <>
            {!props.openModal && (
                <>
                    <h2 className="flex justify-center text-4xl">Title</h2>

                    <div className="flex justify-center px-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-10 lg:gap-14 overflow-hidden">
                            {props.gameKind.map((game) => (
                                <div key={game.name}>
                                    <Card
                                        game={game}
                                        handleOpenModal={props.handleOpenModal}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {props.openModal && (
                <>
                    <div className="w-screen min-h-mobile-safe flex flex-none justify-center items-center p-10 fixed z-50 inset-0 bg-black bg-opacity-40 overflow-auto">
                        <div className="w-full h-full min-w-[320px] flex flex-col p-8 bg-white rounded-2xl shadow-2xl divide-y-2 divide-solid">
                            <ModalTitle
                                currentGame={props.currentGame}
                                handleCloseModal={props.handleCloseModal}
                            ></ModalTitle>

                            <div className="h-full flex flex-col">
                                {props.currentGame?.name === "Jaeum Moeum" && (
                                    <JaeummoeumContainer
                                        isLoaded={
                                            props.minTimePassed &&
                                            props.gameLoaded
                                        }
                                        handleGameLoad={() =>
                                            props.setGameLoaded(true)
                                        }
                                        handleCloseModal={
                                            props.handleCloseModal
                                        }
                                    />
                                )}

                                {props.currentGame?.name === "Subak Game" && (
                                    <SubakGameContainer />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
