export type Game = {
    name: string;
    desc: string;
};

type CardProps = {
    game: Game;
    handleOpenModal: (game: Game) => void;
};

export default function Card(props: CardProps) {
    return (
        <>
            <div className="group relative h-96 w-72 [perspective:1000px]">
                <div className="absolute duration-1000 w-full h-full [transform-style:preserve-3d] group-hover:[transform:rotateX(180deg)]">
                    <div className="absolute w-full h-full rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 p-6 text-white [backface-visibility:hidden]">
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-start">
                                <div className="text-3xl font-bold">
                                    {props.game.name}
                                </div>
                                {/* <div className="text-5xl">🌟</div> */}
                            </div>
                            <div className="mt-4">
                                <p className="text-lg whitespace-pre-line">
                                    {props.game.desc}
                                </p>
                            </div>
                            <div className="mt-auto">
                                <p className="text-sm opacity-75">
                                    실행하려면 마우스를 카드 위에 올리세요 !
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute w-full h-full rounded-xl bg-gradient-to-br from-pink-400 to-purple-600 p-6 text-white [transform:rotateX(180deg)] [backface-visibility:hidden]">
                        <div className="flex flex-col h-full">
                            <div className="text-2xl font-bold mb-4">
                                사진 영역
                            </div>
                            <div className="flex-grow">
                                <p className="text-lg">사진 영역</p>
                            </div>
                            <div className="flex justify-between items-center mt-auto">
                                <button
                                    onClick={() => {
                                        props.handleOpenModal(props.game);
                                    }}
                                    className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-opacity-90 transition-colors cursor-pointer"
                                >
                                    실행하기
                                </button>
                                <span className="text-3xl">✨</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
