import { useEffect, useState } from "react";

type Game = {
    name: string;
    desc: string;
};

type CardProps = {
    game: Game;
    handleOpenModal: (game: Game) => void;
};

export default function Card(props: CardProps) {
    const [flipped, setFlipped] = useState(false);
    const [os, setOS] = useState<
        "Android" | "iOS" | "Windows" | "Mac" | "Other"
    >("Other");

    // 모바일은 호버가 안되기때문에 터치시 카드 뒤집히게 만들기 위함
    const handleFlip = () => setFlipped((prev) => !prev);

    const getOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();

        if (/android/.test(userAgent)) return "Android";
        if (/iphone|ipad|ipod/.test(userAgent)) return "iOS";
        if (/windows/.test(userAgent)) return "Windows";
        if (/macintosh|mac os x/.test(userAgent)) return "Mac";
        return "Other";
    };

    useEffect(() => {
        setOS(getOS());
    }, []);

    return (
        <>
            <div
                className="w-42 h-68
                            sm:w-46 sm:h-72
                            md:w-54 md:h-80
                            lg:w-54 lg:h-80
                            xl:w-64 xl:h-88
                            2xl:w-72 2xl:h-96 
                            group relative [perspective:1000px]"
                onClick={handleFlip}
            >
                <div
                    className={`absolute duration-1000 w-full h-full [transform-style:preserve-3d] ${
                        flipped ? "[transform:rotateX(180deg)]" : ""
                    }
                    group-hover:[transform:rotateX(180deg)]`}
                >
                    <div className="absolute w-full h-full rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 p-6 text-white [backface-visibility:hidden]">
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-start">
                                <div
                                    className="text-lg 
                                                sm:text-xl
                                                md:text-xl
                                                lg:text-2xl
                                                xl:text-3xl
                                                2xl:text-4xl
                                                font-bold"
                                >
                                    {props.game.name}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p
                                    className="text-xs 
                                                sm:text-xs
                                                md:text-sm
                                                lg:text-base
                                                xl:text-lg
                                                2xl:text-xl
                                                whitespace-pre-line"
                                >
                                    {props.game.desc}
                                </p>
                            </div>
                            <div className="mt-auto">
                                <p
                                    className="text-xs
                                                sm:text-xs
                                                md:text-xs
                                                lg:text-sm
                                                xl:text-base
                                                2xl:text-base
                                                opacity-75"
                                >
                                    {os === "Android" || os === "iOS"
                                        ? "실행하려면 터치하세요 !"
                                        : "실행하려면 마우스를 카드 위에 올리세요 !"}
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
