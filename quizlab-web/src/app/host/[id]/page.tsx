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

const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const CHIP = ["bg-pink", "bg-sky", "bg-mint", "bg-sun", "bg-grape text-white"];
const LETTERS = ["A", "B", "C", "D"];

type Phase = "lobby" | "question" | "reveal" | "final";

type GameReport = {
    avgScore: number;
    totalCorrect: number;
    totalIncorrect: number;
    correctPercentage: number;
    incorrectPercentage: number;
};

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
    const [isPaused, setIsPaused] = useState(false);
    const [muted, setMuted] = useState(false);
    const [countdownToNext, setCountdownToNext] = useState(5);
    const [report, setReport] = useState<GameReport | null>(null);
    const [currentExplanation, setCurrentExplanation] = useState("");
    const cardRef = useRef<HTMLDivElement>(null);
    const bgAudioRef = useRef<HTMLAudioElement | null>(null);

    // Inisialisasi audio element sekali saat mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        const a = new Audio("/sounds/start.mp3");
        a.loop = true;
        bgAudioRef.current = a;
        return () => {
            a.pause();
            a.currentTime = 0;
        };
    }, []);

    // Sinkronisasi status play / pause background music saat kuis berjalan
    useEffect(() => {
        const bg = bgAudioRef.current;
        if (!bg) return;
        bg.muted = muted;

        const isPlaying = phase === "question" || phase === "reveal";
        if (isPlaying && !isPaused && !muted) {
            bg.play().catch(() => { });
        } else {
            bg.pause();
            if (phase === "final" || phase === "lobby") {
                bg.currentTime = 0;
            }
        }
    }, [phase, isPaused, muted]);

    // Auto-advance ke soal berikutnya setelah 5 detik di fase reveal
    useEffect(() => {
        if (phase !== "reveal") {
            setCountdownToNext(5);
            return;
        }

        setCountdownToNext(5);
        const timer = setInterval(() => {
            setCountdownToNext((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    next();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, i]);

    // Fungsi toggle suara yang merespons klik langsung
    function toggleSound() {
        const nextMuted = !muted;
        setMuted(nextMuted);
        const bg = bgAudioRef.current;
        if (bg) {
            bg.muted = nextMuted;
            if (nextMuted) {
                bg.pause();
            } else if (phase === "question" || phase === "reveal") {
                bg.play().catch(() => { });
            }
        }
    }

    useEffect(() => {
        if (userReady && !user) router.replace("/login");
    }, [userReady, user, router]);

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

    // question & reveal: sinkronisasi peserta, jawaban & skor secara realtime
    useEffect(() => {
        if (!code || (phase !== "question" && phase !== "reveal")) return;
        const t = setInterval(async () => {
            try {
                const s = await api<{
                    players: { name: string; score: number; streak?: number }[];
                    answeredCount: number;
                    counts: number[];
                    isPaused: boolean;
                    report: GameReport;
                }>(`/api/sessions/${code}/state`);
                if (s.players) setPlayers(s.players);
                if (typeof s.answeredCount === "number") setAnswered(s.answeredCount);
                if (s.counts && s.counts.length > 0) setCounts(s.counts);
                if (typeof s.isPaused === "boolean") setIsPaused(s.isPaused);
                if (s.report) setReport(s.report);
            } catch { }
        }, 1000);
        return () => clearInterval(t);
    }, [phase, code]);

    // countdown timer – langsung panggil reveal begitu waktu habis tanpa delay
    useEffect(() => {
        if (phase !== "question" || isPaused) return;
        if (left <= 0) {
            reveal();
            return;
        }
        const timer = setTimeout(() => {
            if (left <= 1) {
                setLeft(0);
                reveal();
            } else {
                setLeft((l) => l - 1);
            }
        }, 1000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, left, isPaused]);

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

    async function startQuestion(index: number) {
        setI(index);
        setLeft(quiz!.questions[index].duration);
        setAnswered(0);
        setCurrentExplanation("");
        setCounts([]);
        setPhase("question");
        setIsPaused(false);
        try {
            await api(`/api/sessions/${code}/state`, {
                method: "PATCH",
                body: JSON.stringify({ phase: "question", questionIndex: index }),
            });
        } catch { }
    }

    async function startGame() {
        if (bgAudioRef.current) {
            bgAudioRef.current.loop = true;
            bgAudioRef.current.currentTime = 0;
            bgAudioRef.current.play().catch(() => { });
        }
        startQuestion(0);
    }

    async function reveal() {
        setPhase("reveal");
        // Set explanation from quiz data locally (no waiting for server)
        const expl = quiz?.questions[i]?.explanation ?? "";
        setCurrentExplanation(expl);
        try {
            await api(`/api/sessions/${code}/state`, {
                method: "PATCH",
                body: JSON.stringify({ phase: "reveal", questionIndex: i }),
            });
            const s = await api<{
                players: { name: string; score: number }[];
                counts: number[];
                report: GameReport;
            }>(`/api/sessions/${code}/state`);
            if (s.players) setPlayers(s.players);
            if (s.counts && s.counts.length > 0) setCounts(s.counts);
            if (s.report) setReport(s.report);
        } catch { }
    }

    async function next() {
        if (i + 1 >= quiz!.questions.length) {
            try {
                const s = await api<{ players: { name: string; score: number }[]; report: GameReport }>(`/api/sessions/${code}/state`);
                if (s.players) setPlayers(s.players);
                if (s.report) setReport(s.report);
                await api(`/api/sessions/${code}/state`, {
                    method: "PATCH",
                    body: JSON.stringify({ phase: "final", questionIndex: i }),
                });
            } catch { }
            setPhase("final");
            return;
        }
        startQuestion(i + 1);
    }

    async function togglePause() {
        const newPaused = !isPaused;
        setIsPaused(newPaused);
        try {
            await api(`/api/sessions/${code}/state`, {
                method: "PATCH",
                body: JSON.stringify({ isPaused: newPaused }),
            });
        } catch { }
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
                <div className="pop-card bg-grape p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="font-bold text-white/80">Kamu jadi host untuk</p>
                        <h1 className="font-display text-4xl font-extrabold">{quiz.title}</h1>
                        <p className="mt-1 font-medium text-white/90">{quiz.questions.length} soal • Host: {user.name}</p>
                    </div>
                    <button
                        onClick={toggleSound}
                        className={`pop-btn text-ink font-extrabold !py-2 !px-4 self-start sm:self-center transition-all ${muted ? "bg-white/90 text-ink/70" : "bg-sun text-ink shadow-[4px_4px_0_#1b1530]"}`}
                        title={muted ? "Nyalakan musik background" : "Matikan musik background"}
                    >
                        {muted ? "🔇 Suara: OFF" : "🔊 Suara: ON"}
                    </button>
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
                        onClick={startGame}
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

    /* ============ FINAL RESULTS ============ */
    if (phase === "final") {
        const totalAns = (report?.totalCorrect ?? 0) + (report?.totalIncorrect ?? 0);
        return (
            <main className="mx-auto max-w-2xl space-y-6 px-5 py-8">
                <h1 className="text-center font-display text-5xl font-extrabold">Final Results 🏆</h1>
                <div ref={cardRef}>
                    <Podium title={quiz.title} players={sorted} />
                </div>
                <Leaderboard players={sorted.slice(3)} />

                {/* ===== Laporan Hasil untuk Host ===== */}
                {report && totalAns > 0 && (
                    <div className="pop-card space-y-4 p-6 bg-white">
                        <h2 className="font-display text-2xl font-extrabold text-center">📊 Laporan Hasil Quiz</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Rata-rata Skor */}
                            <div className="rounded-2xl border-[3px] border-ink bg-mint p-4 text-center shadow-[3px_3px_0_#1b1530]">
                                <p className="text-sm font-bold text-ink/60">Rata-rata Skor</p>
                                <p className="font-display text-3xl font-extrabold">
                                    {Math.round(report.avgScore).toLocaleString("id-ID")}
                                </p>
                            </div>
                            {/* % Benar */}
                            <div className="rounded-2xl border-[3px] border-ink bg-sky p-4 text-center shadow-[3px_3px_0_#1b1530]">
                                <p className="text-sm font-bold text-ink/60">✅ Jawaban Benar</p>
                                <p className="font-display text-3xl font-extrabold">
                                    {report.correctPercentage.toFixed(1)}%
                                </p>
                                <p className="text-xs font-bold text-ink/50">{report.totalCorrect} jawaban</p>
                            </div>
                            {/* % Salah */}
                            <div className="rounded-2xl border-[3px] border-ink bg-pink p-4 text-center shadow-[3px_3px_0_#1b1530]">
                                <p className="text-sm font-bold text-ink/60">❌ Jawaban Salah</p>
                                <p className="font-display text-3xl font-extrabold">
                                    {report.incorrectPercentage.toFixed(1)}%
                                </p>
                                <p className="text-xs font-bold text-ink/50">{report.totalIncorrect} jawaban</p>
                            </div>
                        </div>

                        {/* Visual progress bar */}
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-ink/70">Distribusi Jawaban Keseluruhan</p>
                            <div className="flex h-6 overflow-hidden rounded-full border-[3px] border-ink">
                                <div
                                    className="bg-mint transition-all duration-700"
                                    style={{ width: `${report.correctPercentage}%` }}
                                />
                                <div className="bg-tomato flex-1" />
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-emerald-700">✅ Benar {report.correctPercentage.toFixed(1)}%</span>
                                <span className="text-red-600">❌ Salah {report.incorrectPercentage.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="flex gap-4 text-sm font-bold text-ink/60 justify-center flex-wrap">
                            <span>👥 {players.length} peserta</span>
                            <span>📝 {quiz.questions.length} soal</span>
                            <span>📊 {totalAns} total jawaban</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={saveImage} className="pop-btn bg-sun">📸 Save Winner Image</button>
                    <Link href="/dashboard" className="pop-btn bg-white">🏠 Kembali ke Dashboard</Link>
                </div>
            </main>
        );
    }

    /* ============ QUESTION & REVEAL ============ */
    const urgent = left <= 3 && phase === "question" && !isPaused;
    const total = players.length || 1;

    return (
        <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
            {/* Header bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="rounded-full border-[3px] border-ink bg-white px-4 py-1 font-extrabold">
                    Soal {i + 1}/{quiz.questions.length}
                </span>
                <span className="rounded-full border-[3px] border-ink bg-sky px-4 py-1 font-extrabold">
                    ✍️ {phase === "question" ? answered : players.length}/{players.length} sudah menjawab
                </span>
                <div className="flex items-center gap-2">
                    {/* Tombol Sound Mute/Unmute */}
                    <button
                        onClick={toggleSound}
                        className={`pop-btn !px-3 !py-1 text-sm font-extrabold transition-all ${muted ? "bg-white text-ink/70" : "bg-sun text-ink"}`}
                        title={muted ? "Nyalakan musik background" : "Matikan musik background"}
                    >
                        {muted ? "🔇 Suara: OFF" : "🔊 Suara: ON"}
                    </button>
                    {/* Tombol Pause / Resume */}
                    {phase === "question" && (
                        <button
                            onClick={togglePause}
                            className={`pop-btn !px-4 !py-1 font-extrabold transition-all ${isPaused
                                ? "bg-mint animate-pulse"
                                : "bg-sun"
                                }`}
                        >
                            {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                        </button>
                    )}
                </div>
            </div>

            {/* Timer bar */}
            <div className="flex items-center gap-3">
                <div className="h-6 flex-1 overflow-hidden rounded-full border-[3px] border-ink bg-white">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear ${isPaused
                            ? "bg-sun/60"
                            : urgent ? "bg-tomato" : "bg-mint"
                            }`}
                        style={{ width: `${(Math.max(left, 0) / q.duration) * 100}%` }}
                    />
                </div>
                <span
                    className={`grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink font-display text-2xl font-extrabold ${isPaused ? "bg-sun/60" : "bg-sun"
                        } ${urgent ? "animate-wiggle" : ""}`}
                >
                    {isPaused ? "⏸" : Math.max(left, 0)}
                </span>
            </div>

            {/* Paused banner */}
            {isPaused && (
                <div className="pop-card animate-pop bg-sun/50 p-3 text-center border-[3px] border-dashed border-ink">
                    <p className="font-display text-lg font-extrabold">
                        ⏸️ Quiz Di-Pause — Klik Resume untuk melanjutkan
                    </p>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="space-y-4">
                    {/* Kartu Pertanyaan */}
                    <div className="pop-card p-6 text-center">
                        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{q.text}</h1>
                        {/* Gambar Soal (image-based question) */}
                        {q.imageUrl && (
                            <div className="mt-4 flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={q.imageUrl}
                                    alt="Gambar Soal"
                                    className="max-h-56 max-w-full rounded-xl border-[3px] border-ink object-contain shadow-[3px_3px_0_#1b1530]"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Pilihan Jawaban */}
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
                                        {phase === "reveal" && (
                                            <span className="font-display">{counts[idx] ?? 0} orang</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Penjelasan Jawaban – muncul saat reveal jika ada */}
                    {phase === "reveal" && currentExplanation && (
                        <div className="pop-card animate-pop bg-sky/40 p-5 space-y-2 border-[3px] border-ink">
                            <h3 className="font-display text-lg font-extrabold flex items-center gap-2">
                                💡 Penjelasan Jawaban
                            </h3>
                            <p className="font-bold text-ink leading-relaxed">{currentExplanation}</p>
                        </div>
                    )}

                    <div className="flex justify-center gap-3 pt-2">
                        {phase === "question" ? (
                            <button onClick={reveal} className="pop-btn bg-white">⏭ Akhiri soal sekarang</button>
                        ) : (
                            <button onClick={next} className="pop-btn bg-grape text-white animate-pulse">
                                {i + 1 >= quiz.questions.length
                                    ? `Lihat hasil akhir (${countdownToNext}s) 🏁`
                                    : `Soal berikutnya dalam ${countdownToNext}s ➡️`}
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="font-display text-xl font-extrabold text-center">📊 Leaderboard</h2>
                    <Leaderboard players={sorted.slice(0, 10)} />
                </div>
            </div>
        </main>
    );
}
