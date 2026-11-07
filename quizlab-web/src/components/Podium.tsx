import { Player } from "./Leaderboard";

export function Podium({ title, players }: { title: string; players: Player[] }) {
    const [first, second, third] = players;
    const cols = [
        { p: second, rank: 2, h: "h-28", bg: "bg-sky", medal: "🥈" },
        { p: first, rank: 1, h: "h-40", bg: "bg-sun", medal: "👑" },
        { p: third, rank: 3, h: "h-20", bg: "bg-pink", medal: "🥉" },
    ];
    return (
        <div className="pop-card bg-cream p-6 text-center">
            <div className="font-display text-2xl font-extrabold">
                🧪 Quiz<span className="text-grape">Lab</span>
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold">{title}</h2>
            <p className="text-sm font-bold text-ink/60">
                {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
            </p>

            <div className="mt-6 flex items-end justify-center gap-3">
                {cols.map(({ p, rank, h, bg, medal }) =>
                    p ? (
                        <div key={rank} className="flex w-28 flex-col items-center sm:w-32">
                            <div className={`text-4xl ${rank === 1 ? "animate-wiggle" : ""}`}>{medal}</div>
                            <div className="max-w-full truncate font-extrabold">{p.name}</div>
                            <div className="mb-1 text-sm font-bold">{p.score.toLocaleString("id-ID")}</div>
                            <div
                                className={`${h} ${bg} grid w-full place-items-center rounded-t-xl border-[3px] border-ink font-display text-4xl font-extrabold`}
                            >
                                {rank}
                            </div>
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );
}