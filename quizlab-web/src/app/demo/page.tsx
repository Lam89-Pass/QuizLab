"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { Mascot } from "@/components/ui";
import { Leaderboard, Player } from "@/components/Leaderboard";
import { Podium } from "@/components/Podium";

const DURATION = 10;
const QUESTIONS = [
    { q: "Ibu kota Indonesia yang baru bernama...", options: ["Nusantara", "Bandung", "Atlantis", "Mordor"], correct: 0 },
    { q: "2 + 2 × 2 = ...", options: ["8", "6", "22", "Tergantung mood"], correct: 1 },
    { q: "Kucing boleh makan cokelat.", options: ["Benar", "Salah"], correct: 1 },
];
const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const LETTERS = ["A", "B", "C", "D"];
const INITIAL: Player[] = [
    { name: "Kamu", score: 0, isMe: true },
    { name: "Budi Santuy", score: 0 },
    { name: "Sari Kilat", score: 0 },
    { name: "Dimas Gabut", score: 0 },
    { name: "Nisa Ninja", score: 0 },
];

type Phase = "question" | "reveal" | "board" | "final";

export default function Demo() {
    const [i, setI] = useState(0);
    const [phase, setPhase] = useState<Phase>("question");
    const [left, setLeft] = useState(DURATION);
    const [picked, setPicked] = useState<number | null>(null);
    const [muted, setMuted] = useState(false);
    const [players, setPlayers] = useState<Player[]>(INITIAL);
    const cardRef = useRef<HTMLDivElement>(null);

    const q = QUESTIONS[i];
    const isCorrect = picked === q.correct;
    const sorted = [...players].sort((a, b) => b.score - a.score);

    function play(file: string) {
        if (muted) return;
        new Audio(`/sounds/${file}`).play().catch(() => { });
    }

    function reveal() {
        const before = [...players].sort((a, b) => b.score - a.score).map((p) => p.name);
        const updated = players.map((p) => ({
            ...p,
            score: p.score + (p.isMe ? (isCorrect ? 1000 : 0) : Math.random() > 0.45 ? 1000 : 0),
        }));
        const after = [...updated].sort((a, b) => b.score - a.score);
        setPlayers(after.map((p, idx) => ({ ...p, change: before.indexOf(p.name) - idx })));
        setPhase("reveal");
        if (isCorrect) {
            confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 } });
            play("win.mp3");
        } else if (picked !== null) {
            play("wrong.mp3");
        }
    }

    // timer (di aplikasi asli: waktu berasal dari server via WebSocket)
    useEffect(() => {
        if (phase !== "question") return;
        if (left <= 0) { reveal(); return; }
        const t = setTimeout(() => setLeft((l) => l - 1), 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, left]);

    useEffect(() => {
        if (phase === "final") {
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
            play("win.mp3");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    function next() {
        if (i + 1 >= QUESTIONS.length) return setPhase("final");
        setI(i + 1); setPicked(null); setLeft(DURATION); setPhase("question");
    }

    async function saveImage() {
        if (!cardRef.current) return;
        const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
        const a = document.createElement("a");
        a.download = "quizlab-winners.png";
        a.href = url;
        a.click();
    }

    /* ============ FINAL ============ */
    if (phase === "final") {
        return (
            <main className="mx-auto max-w-xl space-y-6 px-5 py-8">
                <h1 className="text-center font-display text-5xl font-extrabold">Final Results 🏆</h1>
                <div ref={cardRef}>
                    <Podium title="Kuis Receh Sejagat 🤪" players={sorted} />
                </div>
                <Leaderboard players={sorted.slice(3)} />
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={saveImage} className="pop-btn bg-sun">📸 Save Winner Image</button>
                    <Link href="/" className="pop-btn bg-white">🏠 Kembali ke Homepage</Link>
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
                        {i + 1 >= QUESTIONS.length ? "Lihat hasil akhir 🏁" : "Pertanyaan berikutnya ➡️"}
                    </button>
                </div>
            </main>
        );
    }

    /* ============ QUESTION + REVEAL ============ */
    const urgent = left <= 3 && phase === "question";
    return (
        <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            <div className="flex items-center justify-between">
                <span className="rounded-full border-[3px] border-ink bg-white px-4 py-1 font-extrabold">
                    Soal {i + 1}/{QUESTIONS.length}
                </span>
                <button onClick={() => setMuted(!muted)} className="pop-btn bg-white !px-3 !py-1">
                    {muted ? "🔇" : "🔊"}
                </button>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-3">
                <div className="h-6 flex-1 overflow-hidden rounded-full border-[3px] border-ink bg-white">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear ${urgent ? "bg-tomato" : "bg-mint"}`}
                        style={{ width: `${(left / DURATION) * 100}%` }}
                    />
                </div>
                <span className={`grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink bg-sun font-display text-2xl font-extrabold ${urgent ? "animate-wiggle" : ""}`}>
                    {left}
                </span>
            </div>

            <div className="pop-card p-6 text-center">
                <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{q.q}</h1>
            </div>

            <div className={`grid gap-4 ${q.options.length > 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {q.options.map((opt, idx) => {
                    let cls = COLORS[idx % 4];
                    if (phase === "reveal") {
                        if (idx === q.correct) cls = "bg-mint scale-105";
                        else if (idx === picked) cls = "bg-tomato text-white";
                        else cls = `${COLORS[idx % 4]} opacity-30`;
                    } else if (picked !== null) {
                        cls += picked === idx ? " ring-4 ring-ink ring-offset-2" : " opacity-50";
                    }
                    return (
                        <button
                            key={opt}
                            disabled={picked !== null || phase !== "question"}
                            onClick={() => setPicked(idx)}
                            className={`pop-btn !justify-start gap-4 !py-5 text-left text-xl ${cls}`}
                        >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[3px] border-ink bg-white font-display">
                                {phase === "reveal" && idx === q.correct ? "✓" : phase === "reveal" && idx === picked ? "✗" : LETTERS[idx]}
                            </span>
                            {opt}
                        </button>
                    );
                })}
            </div>

            {phase === "question" && picked !== null && (
                <p className="text-center font-bold">Jawaban terkunci 🔒 Tunggu timer habis...</p>
            )}

            {phase === "reveal" && (
                <div className="pop-card flex animate-pop items-center gap-4 bg-white p-5">
                    <Mascot mood={isCorrect ? "happy" : "sad"} size={90} />
                    <div className="flex-1">
                        <h2 className="font-display text-3xl font-extrabold">
                            {isCorrect ? "BENAR! +1000 🎉" : picked === null ? "Waktu habis! ⏰" : "Yah, salah 😭"}
                        </h2>
                        {!isCorrect && (
                            <p className="font-bold">Jawaban benar: {q.options[q.correct]} • 0 poin</p>
                        )}
                    </div>
                    <button onClick={() => setPhase("board")} className="pop-btn bg-grape text-white">
                        Leaderboard 📊
                    </button>
                </div>
            )}

            {/* Efek jawaban salah: zoom-in kecil -> besar */}
            {phase === "reveal" && picked !== null && !isCorrect && (
                <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
                    <div className="pop-card animate-zoomfx max-w-sm p-4 text-center">
                        {/* Ganti emoji ini dengan video aset platform:
                <video src="/wrong.mp4" autoPlay muted playsInline className="rounded-xl" /> */}
                        <div className="text-9xl">🤡</div>
                        <p className="font-display text-3xl font-extrabold">SALAH WOI!</p>
                    </div>
                </div>
            )}
        </main>
    );
}