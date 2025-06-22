"use client";

import { useEffect, useRef, useState } from "react";
import JaeummoeumPresenter from "../presenter/JaeummoeumPresenter";
import { JaeummoeumContainerProps } from "../types/JaeummoeumTypes";
import GameLoading from "@/app/common/GameLoading";
import answerList from "../data/answerList";

export default function JaeummoeumContainer(props: JaeummoeumContainerProps) {
    const [randomWord, setRandomWord] = useState<string[]>(
        answerList[Math.floor(Math.random() * answerList.length)]
    );

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
    const guessScrollRef = useRef<HTMLDivElement>(null);

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
        setRandomWord(
            answerList[Math.floor(Math.random() * answerList.length)]
        );
    };

    useEffect(() => {
        props.handleGameLoad();
    }, []);

    useEffect(() => {
        if (guessScrollRef.current) {
            guessScrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [guessList.length]);

    return (
        <>
            {props.isLoaded ? (
                <JaeummoeumPresenter
                    randomWord={randomWord}
                    inputs={inputs}
                    guessList={guessList}
                    judgeList={judgeList}
                    keyboardStatus={keyboardStatus}
                    allCorrect={allCorrect}
                    guessScrollRef={guessScrollRef}
                    handleInput={handleInput}
                    handleSend={handleSend}
                    playAgain={playAgain}
                    handleCloseModal={props.handleCloseModal}
                />
            ) : (
                <GameLoading />
            )}
        </>
    );
}
