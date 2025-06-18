export default function GameLoading() {
    return (
        <>
            <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
                <span className="text-5xl">🎮</span>
                <div className="text-xl font-bold">게임을 준비 중입니다...</div>
                <div className="text-base text-gray-500">
                    잠시만 기다려주세요
                </div>
            </div>
        </>
    );
}
