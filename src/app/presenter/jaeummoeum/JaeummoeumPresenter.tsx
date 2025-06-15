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
                    <div className="h-1/2 text-5xl">정답을 맞히셨습니다 !</div>
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
                        >
                            나가기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-screen flex flex-col">
                    <div className="flex flex-col items-center justify-center mb-5 h-1/2 overflow-y-auto">
                        {props.guessList.length === 0 ? (
                            <div className="text-gray-400">
                                아직 제출 내역 없음
                            </div>
                        ) : (
                            props.guessList.map((guess, guessIdx) => (
                                <div key={guessIdx} className="flex gap-2 mb-2">
                                    {guess.map((char, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                                                statusColor[
                                                    props.judgeList[guessIdx][
                                                        idx
                                                    ]
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
                        <div className="h-1/4 flex justify-center items-center gap-2">
                            {props.inputs.map((input, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    maxLength={1}
                                    value={input}
                                    onChange={(e) => props.handleInput(e, i)}
                                    className="w-12 h-14 text-center text-2xl flex justify-center rounded-xl border"
                                    inputMode="text"
                                />
                            ))}
                            <button
                                className="flex items-center ml-10 cursor-pointer"
                                onClick={props.handleSend}
                            >
                                <TbSend size={32} />
                            </button>
                        </div>

                        <div className="h-3/4 flex flex-col items-center justify-end pb-8 gap-2">
                            {[
                                props.keyboardList1,
                                props.keyboardList2,
                                props.keyboardList3,
                            ].map((row, i) => (
                                <div className="flex gap-2" key={i}>
                                    {row.map((key) => (
                                        <div
                                            key={key}
                                            className={`w-12 h-14 rounded-xl border bg-white text-xl font-bold shadow flex items-center justify-center
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
