import { MazePresenterProps } from "../types/MazeTypes";

export default function MazePresenter(props: MazePresenterProps) {
    return (
        <>
            <div className="shrink-0 grid gap-2 p-2 border border-slate-200 rounded-lg bg-white">
                <div className="flex gap-2">
                    <input
                        value={props.newName}
                        onChange={(e) => props.setNewName(e.target.value)}
                        placeholder="참가자 이름"
                        className="px-3 py-2 border rounded flex-1 min-w-[140px]"
                        onKeyDown={props.handleNameKeyDown}
                    />
                    <button
                        onClick={props.addPlayer}
                        className="px-3 py-2 border rounded"
                    >
                        추가
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {props.players.map((p) => (
                        <span
                            key={p}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border"
                        >
                            {p}
                            <button
                                onClick={() => props.removePlayer(p)}
                                className="text-red-500 font-bold"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>

                <label className="flex items-center gap-3">
                    <span className="text-slate-600">배속</span>
                    <input
                        type="range"
                        min={0.1}
                        max={3}
                        step={0.1}
                        value={props.speed}
                        onChange={(e) =>
                            props.setSpeed(parseFloat(e.target.value))
                        }
                        className="flex-1"
                    />
                    <strong className="w-12 text-right">
                        {props.speed.toFixed(1)}×
                    </strong>
                </label>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden mt-2">
                <div
                    ref={props.wrapRef}
                    className="h-full flex gap-3 overflow-hidden"
                >
                    {/* 왼쪽: 게임 영역 */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
                            <canvas
                                ref={props.canvasRef}
                                className="rounded-lg border-2 border-slate-400 bg-slate-50"
                            />
                        </div>
                        <div className="mt-2 flex gap-4 items-center justify-center">
                            <button
                                onClick={props.startGame}
                                disabled={props.running}
                                className="px-4 py-2 border rounded bg-blue-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                시작
                            </button>
                            <button
                                onClick={props.resetGame}
                                className="px-4 py-2 border rounded bg-red-500 text-white"
                            >
                                리셋
                            </button>
                            <span className="text-slate-500">
                                현재 배속: {props.speed.toFixed(1)}×
                            </span>
                        </div>
                    </div>

                    {/* 오른쪽: 사이드바 */}
                    <div className="w-[220px] flex-none border rounded-xl p-3 bg-white min-h-0 overflow-auto">
                        <h3 className="font-bold mb-2 text-sm">Players</h3>
                        <div className="grid gap-2 mb-3">
                            {props.pawns.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        className="inline-block w-3 h-3 rounded-full"
                                        style={{ background: p.color }}
                                    />
                                    <span className="text-xs">{p.name}</span>
                                    {p.finished && (
                                        <span className="ml-auto text-xs text-green-600">
                                            ✓ 도착
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <h3 className="font-bold mb-2 text-sm">가까운 순위</h3>
                        <ol className="grid gap-1 mb-3">
                            {props.proximity.map((p, i) => (
                                <li
                                    key={p.id}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        className="inline-block w-2 h-2 rounded-full"
                                        style={{ background: p.color }}
                                    />
                                    <strong className="text-xs w-4">
                                        {i + 1}
                                    </strong>
                                    <span className="text-xs flex-1">
                                        {p.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {p.finished
                                            ? "0.00"
                                            : p.dist.toFixed(2)}
                                    </span>
                                </li>
                            ))}
                        </ol>

                        <h3 className="font-bold mb-2 text-sm">
                            최종 순위(도착 순서)
                        </h3>
                        {props.finalRanking.finished.length === 0 ? (
                            <div className="text-xs text-slate-500">
                                아직 도착한 참가자가 없습니다.
                            </div>
                        ) : (
                            <ol className="grid gap-1">
                                {props.finalRanking.finished.map((p, i) => (
                                    <li
                                        key={p.id}
                                        className="flex items-center gap-2"
                                    >
                                        <span
                                            className="inline-block w-2 h-2 rounded-full"
                                            style={{ background: p.color }}
                                        />
                                        <strong className="text-xs w-4">
                                            {i + 1}
                                        </strong>
                                        <span className="text-xs flex-1">
                                            {p.name}
                                        </span>
                                        {i ===
                                            props.finalRanking.finished.length -
                                                1 &&
                                            !props.finalRanking.allDone && (
                                                <span className="text-xs text-amber-600">
                                                    ← 최근골인
                                                </span>
                                            )}
                                    </li>
                                ))}
                            </ol>
                        )}
                        {props.finalRanking.allDone && (
                            <div className="mt-2 text-xs">
                                <span className="font-semibold">당첨자</span>:{" "}
                                {props.finalRanking.loser} 님
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
