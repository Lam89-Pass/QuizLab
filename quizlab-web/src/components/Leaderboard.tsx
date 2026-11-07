export type Player = { name: string; score: number; isMe?: boolean; change?: number };

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
                    <span className="flex-1 truncate font-bold">
                        {p.name}
                        {p.isMe && " (kamu)"}
                    </span>
                    <Change n={p.change ?? 0} />
                    <span className="font-display text-xl font-extrabold">
                        {p.score.toLocaleString("id-ID")}
                    </span>
                </li>
            ))}
        </ol>
    );
}