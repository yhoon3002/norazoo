"use client";

import { useEffect, useState } from "react";
import JaeummoeumPresenter from "@/app/presenter/jaeummoeum/JaeummoeumPresenter";
import { JaeummoeumContainerProps } from "@/app/type/jaeummoeum/JaeummoeumType";

export default function JaeummoeumContainer(props: JaeummoeumContainerProps) {
    const wordList = [
        ["ㄱ", "ㅗ", "ㄱ", "ㅁ", "ㅜ", "ㄹ"],
        ["ㄴ", "ㅗ", "ㅇ", "ㅇ", "ㅓ", "ㅂ"],
        ["ㅂ", "ㅏ", "ㄴ", "ㅏ", "ㄴ", "ㅏ"],
        ["ㅂ", "ㅏ", "ㅇ", "ㅂ", "ㅓ", "ㅂ"],
        ["ㅅ", "ㅣ", "ㄴ", "ㅁ", "ㅜ", "ㄴ"],
        ["ㅇ", "ㅜ", "ㄴ", "ㄷ", "ㅗ", "ㅇ"],
        ["ㅈ", "ㅓ", "ㄴ", "ㅎ", "ㅗ", "ㅏ"],
        ["ㅋ", "ㅔ", "ㅇ", "ㅣ", "ㅋ", "ㅡ"],
        ["ㅎ", "ㅐ", "ㅇ", "ㅂ", "ㅗ", "ㄱ"],
    ];
    const [randomWord, setRandomWord] = useState<string[]>(
        wordList[Math.floor(Math.random() * wordList.length)]
    );

    const keyboardList1 = [
        "ㅂ",
        "ㅈ",
        "ㄷ",
        "ㄱ",
        "ㅅ",
        "ㅛ",
        "ㅕ",
        "ㅑ",
        "ㅐ",
        "ㅔ",
    ];
    const keyboardList2 = [
        "ㅁ",
        "ㄴ",
        "ㅇ",
        "ㄹ",
        "ㅎ",
        "ㅗ",
        "ㅓ",
        "ㅏ",
        "ㅣ",
    ];
    const keyboardList3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"];

    const jaMoReg = /^[ㄱ-ㅎㅏ-ㅣ]$/;
    const [inputs, setInputs] = useState<string[]>(Array(6).fill(""));
    const [guessList, setGuessList] = useState<string[][]>([]);
    const [judgeList, setJudgeList] = useState<
        ("correct" | "exist" | "none")[][]
    >([]);
    const [keyboardStatus, setKeyboardStatus] = useState<{
        [key: string]: "correct" | "exist" | "none" | undefined;
    }>({});
    const [allCorrect, setAllCorrect] = useState(false);

    // 사용자 입력 로그
    const handleInput = (
        e: React.ChangeEvent<HTMLInputElement>,
        idx: number
    ) => {
        let val = e.target.value;
        if (val.length > 1) val = val.slice(-1);
        if (!jaMoReg.test(val) && val !== "") return;
        const newInputs = [...inputs];
        newInputs[idx] = val;
        setInputs(newInputs);
    };

    // 정답과 입력 비교하기
    function judge(tryArr: string[], answerArr: string[]) {
        const result: ("correct" | "exist" | "none")[] = new Array(
            tryArr.length
        ).fill("none");
        const answerRemain = [...answerArr];

        for (let i = 0; i < tryArr.length; i++) {
            if (tryArr[i] === answerArr[i]) {
                result[i] = "correct";
                answerRemain[i] = "";
            }
        }
        for (let i = 0; i < tryArr.length; i++) {
            if (result[i] !== "correct" && answerRemain.includes(tryArr[i])) {
                result[i] = "exist";
                answerRemain[answerRemain.indexOf(tryArr[i])] = "";
            }
        }
        return result;
    }

    // 하단 키보드 상태 바꾸기
    const updateKeyboardStatus = (
        prev: typeof keyboardStatus,
        tryArr: string[],
        judgeResult: ("correct" | "exist" | "none")[]
    ) => {
        const next = { ...prev };
        tryArr.forEach((char, idx) => {
            if (judgeResult[idx] === "correct") {
                next[char] = "correct";
            } else if (
                judgeResult[idx] === "exist" &&
                next[char] !== "correct"
            ) {
                next[char] = "exist";
            } else if (judgeResult[idx] === "none" && !next[char]) {
                next[char] = "none";
            }
        });
        return next;
    };

    // 정답 보내기
    const handleSend = () => {
        if (inputs.some((i) => i === "")) {
            alert("빈 칸을 모두 채워주세요!");
            return;
        }
        const result = judge(inputs, randomWord);

        if (result.filter((el) => el === "correct").length === 6) {
            setAllCorrect(true);
        }

        setGuessList((prev) => [...prev, inputs]);
        setJudgeList((prev) => [...prev, result]);
        setKeyboardStatus((prev) => updateKeyboardStatus(prev, inputs, result));
        setInputs(Array(6).fill(""));
    };

    // 다시하기
    const playAgain = () => {
        setGuessList([]);
        setJudgeList([]);
        setKeyboardStatus({});
        setAllCorrect(false);
        setInputs(Array(6).fill(""));
        setRandomWord(wordList[Math.floor(Math.random() * wordList.length)]);
    };

    useEffect(() => {
        props.handleGameLoad();
    }, []);

    return (
        <>
            {props.isLoaded ? (
                <JaeummoeumPresenter
                    randomWord={randomWord}
                    keyboardList1={keyboardList1}
                    keyboardList2={keyboardList2}
                    keyboardList3={keyboardList3}
                    inputs={inputs}
                    guessList={guessList}
                    judgeList={judgeList}
                    keyboardStatus={keyboardStatus}
                    allCorrect={allCorrect}
                    handleInput={handleInput}
                    handleSend={handleSend}
                    playAgain={playAgain}
                    handleCloseModal={props.handleCloseModal}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
                    <span className="text-5xl">🎮</span>
                    <div className="text-xl font-bold">
                        게임을 준비 중입니다...
                    </div>
                    <div className="text-base text-gray-500">
                        잠시만 기다려주세요
                    </div>
                </div>
            )}
        </>
    );
}
