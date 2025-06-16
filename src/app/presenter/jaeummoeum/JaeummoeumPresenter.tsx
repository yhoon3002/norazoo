import { JaeummoeumPresenterProps } from "@/app/type/jaeummoeum/JaeummoeumType";
import { TbSend } from "react-icons/tb";

const statusColor: { [key: string]: string } = {
    correct: "border-green-500",
    exist: "border-yellow-400",
    none: "border-red-500",
};

const keyboardBg: { [key: string]: string } = {
    correct: "bg-green-400 text-white",
    exist: "bg-yellow-300 text-black",
    none: "bg-red-300 text-white",
};

export default function JaeummoeumPresenter(props: JaeummoeumPresenterProps) {
    return (
        <>
            {props.allCorrect ? (
                <div className="h-screen flex flex-col justify-center items-center">
                    <div
                        className="h-1/2
                                    text-3xl
                                    sm:text-4xl
                                    md:text-5xl
                                    lg:text-6xl
                                    xl:text-7xl
                                    2xl:text-8xl"
                    >
                        정답을 맞히셨습니다 !
                    </div>
                    <div className="w-full flex justify-center items-center gap-16">
                        <button
                            type="button"
                            className="text-gray-900 bg-gradient-to-r from-red-200 via-red-300 to-yellow-200 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 cursor-pointer"
                            onClick={props.playAgain}
                        >
                            다시하기
                        </button>
                        <button
                            type="button"
                            className="text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 cursor-pointer"
                            onClick={props.handleCloseModal}
                        >
                            나가기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col">
                    <div className="w-full h-1/2 flex flex-col pb-5 overflow-y-auto">
                        {props.guessList.length === 0 ? (
                            <div
                                className="w-full h-full flex justify-center items-center
                                            text-xl 
                                            sm:text-2xl
                                            md:text-3xl
                                            lg:text-4xl
                                            xl:text-5xl
                                            2xl:text-6xl
                                            text-gray-400"
                            >
                                정답을 맞춰주세요!
                            </div>
                        ) : (
                            props.guessList.map((guess, guessIdx) => (
                                <div
                                    key={guessIdx}
                                    className="flex justify-center gap-2 pb-2"
                                >
                                    {guess.map((char, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-10 h-14 text-sm
                                                        sm:w-12 sm:h-16 sm:text-base
                                                        md:w-14 md:h-18 md:text-lg
                                                        lg:w-16 lg:h-20 lg:text-xl
                                                        xl:w-18 xl:h-22 xl:text-2xl
                                                        2xl:w-20 2xl:h-24 2xl:text-3xl
                                                        flex justify-center items-center rounded-xl border-3
                                                        font-bold
                                                        ${
                                                            statusColor[
                                                                props.judgeList[
                                                                    guessIdx
                                                                ][idx]
                                                            ]
                                                        }`}
                                        >
                                            {char}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="h-1/2 divide-y-1 flex flex-col">
                        <div className="w-full h-1/4 flex justify-center items-center">
                            <div className="flex pr-4 gap-2">
                                {props.inputs.map((input, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        maxLength={1}
                                        value={input}
                                        onChange={(e) =>
                                            props.handleInput(e, i)
                                        }
                                        className="w-8 h-12 text-sm
                                                    sm:w-10 sm:h-14 sm:text-base
                                                    md:w-12 md:h-16 md:text-base
                                                    lg:w-14 lg:h-18 lg:text-lg
                                                    xl:w-16 xl:h-20 xl:text-xl
                                                    2xl:w-18 2xl:h-22 2xl:text-2xl
                                                    flex justify-center rounded-xl border text-center text-2xl"
                                        inputMode="text"
                                    />
                                ))}
                            </div>

                            <button
                                className="flex items-center cursor-pointer"
                                onClick={props.handleSend}
                            >
                                <TbSend size={32} />
                            </button>
                        </div>

                        <div className="h-3/4 flex flex-col justify-center items-center pb-8 gap-2">
                            {[
                                props.keyboardList1,
                                props.keyboardList2,
                                props.keyboardList3,
                            ].map((row, i) => (
                                <div className="flex gap-2" key={i}>
                                    {row.map((key) => (
                                        <div
                                            key={key}
                                            className={`w-6 h-8
                                                        sm:w-8 sm:h-10
                                                        md:w-10 md:h-12
                                                        lg:w-12 lg:h-14
                                                        xl:w-14 xl:h-16
                                                        2xl:w-16 2xl:h-18
                                                        rounded-xl border bg-white text-xl font-bold shadow flex items-center justify-center
                                        ${
                                            keyboardBg[
                                                props.keyboardStatus[key] ?? ""
                                            ]
                                        }
                                    `}
                                        >
                                            {key}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
