import { PinballPresenterProps } from "../types/PinballTypes";

export default function PinballPresenter(props: PinballPresenterProps) {
    return (
        <div className="w-full h-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-tight">당첨자 고르기</h1>
            <p className="text-sm opacity-80">진짜 공정해요 ..</p>

            <div className="flex flex-col lg:flex-row gap-6 w-full flex-1 min-h-0 items-stretch">
                {/* LEFT: 게임 카드 */}
                <div className="flex-1 min-h-0">
                    <div className="h-full rounded-2xl shadow-xl bg-slate-900/60 ring-1 ring-slate-700 p-3 overflow-hidden flex flex-col relative">
                        {/* 캔버스 영역 */}
                        <div
                            ref={props.wrapRef}
                            className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden"
                        >
                            <canvas
                                ref={props.canvasRef}
                                className="rounded-xl max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* HUD */}
                        <div className="absolute left-4 top-4 text-slate-200 text-sm bg-slate-900/50 rounded-md px-2 py-1">
                            라운드{" "}
                            <span className="font-semibold tabular-nums">
                                {props.round}
                            </span>
                        </div>
                        {props.result !== null && (
                            <div className="absolute right-4 top-4 text-slate-100 text-sm bg-emerald-600/80 rounded-md px-3 py-1">
                                벌칙자:{" "}
                                <span className="font-semibold">
                                    {props.players[props.result]}
                                </span>
                            </div>
                        )}

                        {/* 컨트롤 */}
                        <div className="mt-3 shrink-0 flex flex-wrap items-center gap-2">
                            <button
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm shadow"
                                onClick={props.startRun}
                            >
                                시작 (Space)
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm"
                                onClick={props.stopReset}
                            >
                                정지/리셋 (R)
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
                                onClick={props.newRound}
                            >
                                새 라운드 (N)
                            </button>

                            <label className="ml-2 text-sm text-slate-200 flex items-center gap-2">
                                속도
                                <input
                                    type="range"
                                    min={0.6}
                                    max={1.8}
                                    step={0.05}
                                    value={props.speed}
                                    onChange={(e) =>
                                        props.setSpeed(
                                            parseFloat(e.target.value)
                                        )
                                    }
                                />
                            </label>
                            {/* <label className="ml-2 text-sm text-slate-200 flex items-center gap-2">
                                사운드
                                <input
                                    type="checkbox"
                                    checked={props.sound}
                                    onChange={(e) =>
                                        props.setSound(e.target.checked)
                                    }
                                />
                            </label> */}
                        </div>
                    </div>
                </div>

                {/* RIGHT: 고정폭 패널 */}
                <div className="w-full lg:w-[340px] flex-none">
                    {/* 참가자 */}
                    <div className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-700 p-4">
                        <p className="text-sm font-medium text-slate-200">
                            참가자
                        </p>
                        <div className="flex gap-2 mt-2">
                            <input
                                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm"
                                placeholder="이름 입력"
                                value={props.name}
                                onChange={(e) => props.setName(e.target.value)}
                                onKeyDown={props.handleNameKeyDown}
                            />
                            <button
                                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                                onClick={props.addPlayer}
                            >
                                추가
                            </button>
                        </div>
                        <ul className="mt-3 space-y-2">
                            {props.players.map((p, i) => (
                                <li
                                    key={i}
                                    className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2"
                                >
                                    <span className="text-slate-100 text-sm">
                                        {p}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                                            onClick={() =>
                                                props.movePlayer(i, -1)
                                            }
                                        >
                                            ▲
                                        </button>
                                        <button
                                            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                                            onClick={() =>
                                                props.movePlayer(i, 1)
                                            }
                                        >
                                            ▼
                                        </button>
                                        <button
                                            className="px-2 py-1 text-xs rounded bg-rose-700 hover:bg-rose-600 text-white"
                                            onClick={() =>
                                                props.removePlayer(i)
                                            }
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 기록 */}
                    <div className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-700 p-4 mt-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-200">
                                기록 (최근 15)
                            </p>
                            <button
                                className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
                                onClick={props.clearHistory}
                            >
                                초기화
                            </button>
                        </div>
                        <ul className="mt-2 space-y-1 max-h-60 overflow-auto pr-1">
                            {props.history.length === 0 && (
                                <li className="text-slate-400 text-sm">
                                    아직 기록이 없습니다.
                                </li>
                            )}
                            {props.history.map((h, idx) => (
                                <li
                                    key={idx}
                                    className="text-slate-200 text-sm flex items-center justify-between bg-slate-800 rounded-lg px-2 py-1"
                                >
                                    <span>
                                        R{h.round} — <b>{h.name}</b>
                                    </span>
                                    <span className="opacity-60 text-xs">
                                        랜덤
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="text-slate-400 text-xs mt-2">
                Tip: 참가자 수가 많으면 보드가 자동으로 칸을 더 잘게 나눠요.
            </div>
        </div>
    );
}
