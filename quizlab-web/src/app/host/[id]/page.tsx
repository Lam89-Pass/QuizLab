"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { Mascot } from "@/components/ui";
import { Leaderboard, Player } from "@/components/Leaderboard";
import { Podium } from "@/components/Podium";
import { SharePanel } from "@/components/SharePanel";
import { Quiz, api, useUser } from "@/lib/store";

const BOTS = ["Budi Santuy", "Sari Kilat", "Dimas Gabut", "Nisa Ninja", "Rafi Kopi", "Tika Bebek", "Joko Mie", "Mala Galau"];
const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const CHIP = ["bg-pink", "bg-sky", "bg-mint", "bg-sun", "bg-grape text-white"];
const LETTERS = ["A", "B", "C", "D"];

type Phase = "lobby" | "question" | "reveal" | "board" | "final";

export default function HostLive() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, ready: userReady } = useUser();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loaded, setLoaded] = useState(false);
    const started = useRef(false);

    const [code, setCode] = useState("");
    const [phase, setPhase] = useState<Phase>("lobby");
    const [i, setI] = useState(0);
    const [left, setLeft] = useState(10);
    const [players, setPlayers] = useState<Player[]>([]);
    const [answered, setAnswered] = useState(0);
    const [counts, setCounts] = useState<number[]>([]);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userReady && !user) router.replace("/login");
    }, [userReady, user, router]);

    // ambil kuis + buat sesi game di backend (sekali saja, walau strict mode)
    useEffect(() => {
        if (!userReady || !user || started.current) return;
        started.current = true;
        api<Quiz>(`/api/quizzes/${id}`)
            .then(setQuiz)
            .catch(() => setQuiz(null))
            .finally(() => setLoaded(true));
        api<{ code: string }>(`/api/quizzes/${id}/sessions`, { method: "POST" })
            .then((s) => setCode(s.code))
            .catch(() => { });
    }, [userReady, user, id]);

    // lobby: ambil daftar peserta asli tiap 2 detik
    useEffect(() => {
        if (phase !== "lobby" || !code) return;
        const t = setInterval(async () => {
            try {
                const s = await api<{ participants: string[] }>(`/api/sessions/${code}`);
                setPlayers(s.participants.map((name) => ({ name, score: 0 })));
            } catch { }
        }, 2000);
        return () => clearInterval(t);
    }, [phase, code]);

    // simulasi jumlah peserta yang sudah menjawab
    useEffect(() => {
        if (phase !== "question") return;
        const t = setInterval(() => {
            setAnswered((a) => Math.min(players.length, a + 1 + Math.floor(Math.random() * 2)));
        }, 900);
        return () => clearInterval(t);
    }, [phase, players.length]);

    // timer (di aplikasi asli: waktu dari server)
    useEffect(() => {
        if (phase !== "question") return;
        if (left <= 0) { reveal(); return; }
        const t = setTimeout(() => setLeft((l) => l - 1), 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, left]);

    useEffect(() => {
        if (phase === "final") confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
    }, [phase]);

    if (!loaded || !userReady || !user) return null;

    if (!quiz || quiz.questions.length === 0) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
                <Mascot mood="sad" size={130} />
                <h1 className="font-display text-3xl font-extrabold">Kuis nggak ketemu atau masih kosong</h1>
                <Link href="/dashboard" className="pop-btn bg-sun">← Ke dashboard</Link>
            </main>
        );
    }

    const q = quiz.questions[i];
    const sorted = [...players].sort((a, b) => b.score - a.score);

    function startQuestion(index: number) {
        setI(index);
        setLeft(quiz!.questions[index].duration);
        setAnswered(0);
        setPhase("question");
    }

    function reveal() {
        const picks = players.map(() =>
            Math.random() < 0.55 ? q.correct : Math.floor(Math.random() * q.options.length)
        );
        const c = q.options.map(() => 0);
        picks.forEach((p) => c[p]++);
        setCounts(c);

        const before = [...players].sort((a, b) => b.score - a.score).map((p) => p.name);
        const updated = players.map((p, k) => ({ ...p, score: p.score + (picks[k] === q.correct ? 1000 : 0) }));
        const after = [...updated].sort((a, b) => b.score - a.score);
        setPlayers(after.map((p, idx) => ({ ...p, change: before.indexOf(p.name) - idx })));
        setPhase("reveal");
    }

    function next() {
        if (i + 1 >= quiz!.questions.length) return setPhase("final");
        startQuestion(i + 1);
    }

    async function saveImage() {
        if (!cardRef.current) return;
        const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
        const a = document.createElement("a");
        a.download = "quizlab-winners.png";
        a.href = url;
        a.click();
    }

    /* ============ LOBBY ============ */
    if (phase === "lobby") {
        return (
            <main className="mx-auto max-w-4xl space-y-6 px-5 py-6">
                <div className="pop-card bg-grape p-6 text-white">
                    <p className="font-bold">Kamu jadi host untuk</p>
                    <h1 className="font-display text-4xl font-extrabold">{quiz.title}</h1>
                    <p className="mt-1 font-medium">{quiz.questions.length} soal • Host: {user.name}</p>
                </div>

                <SharePanel code={code} />

                <div className="pop-card p-6">
                    <h2 className="font-display text-2xl font-extrabold">
                        {players.length} peserta sudah masuk {players.length > 0 ? "🎉" : "👀"}
                    </h2>
                    <div className="mt-4 flex min-h-12 flex-wrap gap-3">
                        {players.map((p, n) => (
                            <span
                                key={p.name}
                                className={`animate-pop rounded-full border-[3px] border-ink px-4 py-2 font-extrabold shadow-[3px_3px_0_#1b1530] ${CHIP[n % CHIP.length]}`}
                            >
                                {p.name}
                            </span>
                        ))}
                    </div>
                    {players.length === 0 && (
                        <p className="animate-pulse font-bold text-ink/60">Menunggu peserta... 🥱</p>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        onClick={() => startQuestion(0)}
                        disabled={players.length === 0}
                        className="pop-btn bg-mint disabled:opacity-40"
                    >
                        🚀 Mulai permainan
                    </button>
                    <Link href="/dashboard" className="pop-btn bg-white">← Batal</Link>
                </div>
            </main>
        );
    }

    /* ============ FINAL ============ */
    if (phase === "final") {
        return (
            <main className="mx-auto max-w-xl space-y-6 px-5 py-8">
                <h1 className="text-center font-display text-5xl font-extrabold">Final Results 🏆</h1>
                <div ref={cardRef}>
                    <Podium title={quiz.title} players={sorted} />
                </div>
                <Leaderboard players={sorted.slice(3)} />
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={saveImage} className="pop-btn bg-sun">📸 Save Winner Image</button>
                    <Link href="/dashboard" className="pop-btn bg-white">🏠 Kembali ke Dashboard</Link>
                </div>
            </main>
        );
    }

    /* ============ LEADERBOARD ============ */
    if (phase === "board") {
        return (
            <main className="mx-auto max-w-xl space-y-6 px-5 py-8">
                <h1 className="text-center font-display text-4xl font-extrabold">Leaderboard 📊</h1>
                <Leaderboard players={sorted} />
                <div className="text-center">
                    <button onClick={next} className="pop-btn bg-grape text-white">
                        {i + 1 >= quiz.questions.length ? "Lihat hasil akhir 🏁" : "Pertanyaan berikutnya ➡️"}
                    </button>
                </div>
            </main>
        );
    }

    /* ============ QUESTION + REVEAL ============ */
    const urgent = left <= 3 && phase === "question";
    const total = players.length || 1;
    return (
        <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            <div className="flex items-center justify-between">
                <span className="rounded-full border-[3px] border-ink bg-white px-4 py-1 font-extrabold">
                    Soal {i + 1}/{quiz.questions.length}
                </span>
                <span className="rounded-full border-[3px] border-ink bg-sky px-4 py-1 font-extrabold">
                    ✍️ {phase === "question" ? answered : players.length}/{players.length} sudah menjawab
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div className="h-6 flex-1 overflow-hidden rounded-full border-[3px] border-ink bg-white">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear ${urgent ? "bg-tomato" : "bg-mint"}`}
                        style={{ width: `${(Math.max(left, 0) / q.duration) * 100}%` }}
                    />
                </div>
                <span className={`grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink bg-sun font-display text-2xl font-extrabold ${urgent ? "animate-wiggle" : ""}`}>
                    {Math.max(left, 0)}
                </span>
            </div>

            <div className="pop-card p-6 text-center">
                <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{q.text}</h1>
            </div>

            <div className="space-y-3">
                {q.options.map((opt, idx) => {
                    const isRight = idx === q.correct;
                    const cls =
                        phase === "reveal"
                            ? isRight ? "bg-mint" : `${COLORS[idx % 4]} opacity-40`
                            : COLORS[idx % 4];
                    const pct = phase === "reveal" ? Math.round(((counts[idx] ?? 0) / total) * 100) : 0;
                    return (
                        <div key={idx} className={`pop-card relative overflow-hidden ${cls}`}>
                            {phase === "reveal" && (
                                <div className="absolute inset-y-0 left-0 bg-ink/15" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative flex items-center gap-4 px-4 py-4 text-xl font-extrabold">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[3px] border-ink bg-white font-display">
                                    {phase === "reveal" && isRight ? "✓" : LETTERS[idx]}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {phase === "reveal" && <span className="font-display">{counts[idx] ?? 0} orang</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center gap-3">
                {phase === "question" ? (
                    <button onClick={reveal} className="pop-btn bg-white">⏭ Akhiri soal sekarang</button>
                ) : (
                    <button onClick={() => setPhase("board")} className="pop-btn bg-grape text-white">
                        Lihat leaderboard 📊
                    </button>
                )}
            </div>
        </main>
    );
}