export type Player = {
    name: string;
    score: number;
    isMe?: boolean;
    change?: number;
    streak?: number;
    maxStreak?: number;
    totalCorrect?: number;
    totalIncorrect?: number;
    accuracy?: number;
};

function Change({ n }: { n: number }) {
    if (n > 0) return <span className="font-extrabold text-emerald-600">▲{n}</span>;
    if (n < 0) return <span className="font-extrabold text-tomato">▼{Math.abs(n)}</span>;
    return <span className="font-extrabold text-ink/30">–</span>;
}

export function Leaderboard({ players }: { players: Player[] }) {
    return (
        <ol className="space-y-3">
            {players.map((p, i) => (
                <li
                    key={p.name}
                    className={`pop-card flex animate-pop items-center gap-3 px-4 py-3 ${p.isMe ? "bg-sun" : "bg-white"}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                >
                    <span className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-ink bg-cream font-display text-lg font-extrabold">
                        {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate font-bold">
                                {p.name}
                                {p.isMe && " (kamu)"}
                            </span>
                            {p.streak !== undefined && p.streak > 1 && (
                                <span className="rounded-full bg-tomato/20 border border-tomato text-tomato px-2 py-0.5 text-xs font-black shrink-0 animate-bounce">
                                    🔥 {p.streak}x
                                </span>
                            )}
                        </div>
                    </div>
                    <Change n={p.change ?? 0} />
                    <span className="font-display text-xl font-extrabold">
                        {p.score.toLocaleString("id-ID")}
                    </span>
                </li>
            ))}
        </ol>
    );
}