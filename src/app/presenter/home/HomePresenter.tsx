import JaeummoeumContainer from "@/app/container/jaeummoeum/JaeummoeumContainer";
import SubakGameContainer from "@/app/container/subakgame/SubakGameContainer";
import Card from "@/app/common/Card";
import ModalTitle from "@/app/common/ModalTitle";
import { HomePresenterProps } from "@/app/type/home/HomeType";

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
                    <div className="w-screen h-screen flex flex-none justify-center items-center p-10 fixed z-50 inset-0 bg-black bg-opacity-40">
                        <div className="w-full h-full max-h-[100dvh] min-w-[320px] flex flex-col bg-white rounded-2xl shadow-2xl p-8 divide-y-2 divide-solid">
                            <ModalTitle
                                currentGame={props.currentGame}
                                handleCloseModal={props.handleCloseModal}
                            ></ModalTitle>

                            <div className="h-full flex flex-col">
                                {props.currentGame?.name === "Jaeum Moeum" && (
                                    <JaeummoeumContainer
                                        handleGameLoad={() =>
                                            props.setGameLoaded(true)
                                        }
                                        handleCloseModal={
                                            props.handleCloseModal
                                        }
                                        isLoaded={
                                            props.minTimePassed &&
                                            props.gameLoaded
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
