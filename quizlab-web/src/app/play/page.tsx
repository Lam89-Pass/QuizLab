"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { Logo, Mascot } from "@/components/ui";
import { Leaderboard, Player } from "@/components/Leaderboard";
import { Podium } from "@/components/Podium";
import { api } from "@/lib/store";

type LiveQuestion = {
    id: string;
    text: string;
    type: string;
    options: string[];
    duration: number;
    correct: number;
    imageUrl?: string;
    explanation?: string;
};

type GameState = {
    code: string;
    status: string;
    currentPhase: "lobby" | "question" | "reveal" | "final";
    currentQuestion: number;
    totalQuestions: number;
    quizTitle: string;
    hostName: string;
    question: LiveQuestion | null;
    players: Player[];
    answeredCount: number;
    counts: number[];
    myAnswer: number;
    myScore: number;
    myStreak: number;
    isPaused: boolean;
    elapsedSeconds: number;
};

const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const LETTERS = ["A", "B", "C", "D"];

export default function PlayPage() {
    const [code, setCode] = useState("");
    const [token, setToken] = useState("");
    const [nickname, setNickname] = useState("");
    const [state, setState] = useState<GameState | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [lastQIndex, setLastQIndex] = useState<number>(-1);
    const [muted, setMuted] = useState(false);
    const [comboShown, setComboShown] = useState(false);
    const [showWrongVideo, setShowWrongVideo] = useState(false);
    const prevPhaseRef = useRef<string>("");
    const cardRef = useRef<HTMLDivElement>(null);
    const wrongVideoRef = useRef<HTMLVideoElement>(null);
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

        const isPlaying = state?.currentPhase === "question" || state?.currentPhase === "reveal";
        if (isPlaying && !state?.isPaused && !showWrongVideo && !muted) {
            bg.play().catch(() => { });
        } else {
            bg.pause();
            if (state?.currentPhase === "final" || state?.currentPhase === "lobby") {
                bg.currentTime = 0;
            }
        }
    }, [state?.currentPhase, state?.isPaused, muted, showWrongVideo]);

    // Fungsi toggle suara langsung dengan gesture klik pengguna
    function toggleSound() {
        const nextMuted = !muted;
        setMuted(nextMuted);
        const bg = bgAudioRef.current;
        if (bg) {
            bg.muted = nextMuted;
            if (nextMuted) {
                bg.pause();
            } else {
                const isPlaying = state?.currentPhase === "question" || state?.currentPhase === "reveal";
                if (isPlaying && !state?.isPaused) {
                    bg.play().catch(() => { });
                }
            }
        }
    }

    // Ambil data sesi peserta dari sessionStorage
    useEffect(() => {
        const c = (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase();
        setCode(c);
        try {
            const raw = sessionStorage.getItem(`quizlab:${c}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                setToken(parsed.token ?? "");
                setNickname(parsed.nickname ?? "");
            }
        } catch { }
    }, []);

    // Polling adaptif: saat soal hampir habis (<= 2 detik), poll cepat (350ms) agar transisi ke jawaban benar instan
    useEffect(() => {
        if (!code) return;
        let stop = false;
        let timer: NodeJS.Timeout;

        async function fetchState() {
            try {
                const s = await api<GameState>(
                    `/api/sessions/${code}/state${token ? `?token=${encodeURIComponent(token)}` : ""}`
                );
                if (stop) return;
                setState(s);

                // Jika soal berganti → reset pilihan
                if (s.currentQuestion !== lastQIndex) {
                    setLastQIndex(s.currentQuestion);
                    setPicked(s.myAnswer >= 0 ? s.myAnswer : null);
                    setComboShown(false);
                    setShowWrongVideo(false);
                } else if (picked === null && s.myAnswer >= 0) {
                    setPicked(s.myAnswer);
                }
            } catch { }

            if (!stop) {
                // Kecepatan polling: 350ms saat fase question hampir selesai agar reveal langsung muncul tanpa delay
                const left = state?.question ? Math.max(0, state.question.duration - (state.elapsedSeconds || 0)) : 10;
                const isUrgent = state?.currentPhase === "question" && left <= 2;
                timer = setTimeout(fetchState, isUrgent ? 350 : 800);
            }
        }

        fetchState();
        return () => {
            stop = true;
            clearTimeout(timer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, token, lastQIndex, picked, state?.currentPhase, state?.elapsedSeconds]);

    // Efek suara & confetti saat reveal dan mulai
    useEffect(() => {
        if (!state) return;
        const prevPhase = prevPhaseRef.current;
        prevPhaseRef.current = state.currentPhase;

        // Efek reveal saat transisi ke fase reveal
        if (state.currentPhase === "reveal" && prevPhase !== "reveal") {
            const q = state.question;
            const myChoice = picked !== null ? picked : state.myAnswer;
            const isCorrect = q && q.correct >= 0 && myChoice === q.correct;
            if (isCorrect) {
                confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 } });
                playWinSound();
                if (state.myStreak > 1) {
                    setComboShown(true);
                    setTimeout(() => setComboShown(false), 2500);
                }
            } else if (myChoice !== null && myChoice >= 0) {
                // Tampilkan video salah.mp4 dengan efek zoom, durasi 2.8s pas (tidak terlalu singkat & tidak kepanjangan)
                setShowWrongVideo(true);
                setTimeout(() => setShowWrongVideo(false), 2800);
            }
        } else if (state.currentPhase === "final" && prevPhase !== "final") {
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
            playWinSound();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state?.currentPhase]);

    // Putar video salah otomatis saat modal muncul
    useEffect(() => {
        if (showWrongVideo && wrongVideoRef.current) {
            wrongVideoRef.current.currentTime = 0;
            wrongVideoRef.current.muted = muted;
            wrongVideoRef.current.play().catch(() => { });
        }
    }, [showWrongVideo, muted]);

    // Synthesize win sound pakai Web Audio API — jingle kemenangan yang meriah
    function playWinSound() {
        if (muted) return;
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            if (ctx.state === "suspended") {
                ctx.resume();
            }
            // Nada fanfare kemenangan: C5, E5, G5, C6 (akor mayor ceria)
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const startTime = ctx.currentTime + i * 0.11;
                const duration = i === notes.length - 1 ? 0.6 : 0.28;

                // Layer 1: Triangle wave untuk kehangatan nada
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = "triangle";
                osc1.frequency.value = freq;
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                gain1.gain.setValueAtTime(0, startTime);
                gain1.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
                gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc1.start(startTime);
                osc1.stop(startTime + duration);

                // Layer 2: Sine wave untuk nada jernih bel kemenangan
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.value = freq * 2; // Overtone oktaf
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                gain2.gain.setValueAtTime(0, startTime);
                gain2.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
                gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc2.start(startTime);
                osc2.stop(startTime + duration);
            });
        } catch { }
    }

    function playAudio(file: string) {
        if (muted) return;
        new Audio(`/sounds/${file}`).play().catch(() => { });
    }

    async function handlePick(optionIdx: number) {
        if (!state || state.currentPhase !== "question") return;
        if (state.isPaused) return;

        // Boleh ganti pilihan jawaban kapan pun sebelum waktu habis
        setPicked(optionIdx);

        try {
            await api(`/api/sessions/${code}/answer`, {
                method: "POST",
                body: JSON.stringify({
                    token,
                    questionIndex: state.currentQuestion,
                    selectedOption: optionIdx,
                }),
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

    if (!state) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
                <Logo />
                <div className="animate-pulse font-bold text-ink/50 mt-8">Menghubungkan ke kuis... 🚀</div>
            </main>
        );
    }

    const { currentPhase, question: q, players = [] } = state;
    const sorted = [...players].sort((a, b) => b.score - a.score);

    /* ============ LOBBY / WAITING ============ */
    if (currentPhase === "lobby" || state.status === "waiting" || !q) {
        return (
            <main className="mx-auto max-w-xl px-5 py-5 space-y-6">
                <div className="flex items-center justify-between">
                    <Logo />
                    <button
                        onClick={toggleSound}
                        className={`pop-btn !px-3 !py-1 text-sm font-extrabold transition-all ${muted ? "bg-white text-ink/70" : "bg-sun text-ink"}`}
                        title={muted ? "Nyalakan suara" : "Matikan suara"}
                    >
                        {muted ? "🔇 Suara: OFF" : "🔊 Suara: ON"}
                    </button>
                </div>
                <div className="pop-card bg-grape p-6 text-white text-center">
                    <p className="font-bold text-white/70">Kuis</p>
                    <h1 className="font-display text-4xl font-extrabold">{state.quizTitle}</h1>
                    <p className="mt-1 font-medium text-white/80">Host: {state.hostName}</p>
                    <p className="mt-4 inline-block rounded-xl border-[3px] border-ink bg-sun px-4 py-2 font-display text-3xl font-extrabold tracking-[0.3em] text-ink">
                        {state.code}
                    </p>
                </div>

                <div className="pop-card p-6 text-center space-y-4">
                    <Mascot mood="happy" size={120} />
                    <h2 className="font-display text-2xl font-extrabold">
                        Hai, {nickname || "Peserta"}! 🎉
                    </h2>
                    <p className="font-bold text-ink/60 animate-pulse">
                        Menunggu host memulai permainan... 🥱
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {players.map((p, idx) => (
                            <span
                                key={p.name}
                                className={`rounded-full border-[2px] border-ink px-3 py-1 text-sm font-extrabold ${COLORS[idx % COLORS.length]} ${p.isMe ? "ring-2 ring-ink ring-offset-1" : ""}`}
                            >
                                {p.name}{p.isMe ? " (kamu)" : ""}
                            </span>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    /* ============ FINAL RESULTS ============ */
    if (currentPhase === "final" || state.status === "finished") {
        const me = sorted.find((p) => p.isMe);
        const myRank = sorted.findIndex((p) => p.isMe) + 1;
        return (
            <main className="mx-auto max-w-xl space-y-6 px-5 py-8">
                <Logo />
                <h1 className="text-center font-display text-4xl font-extrabold">Hasil Akhir 🏆</h1>
                <div ref={cardRef}>
                    <Podium title={state.quizTitle} players={sorted} />
                </div>
                {me && (
                    <div className="pop-card bg-sun p-5 text-center space-y-1">
                        <p className="text-sm font-bold text-ink/60">Skor kamu</p>
                        <p className="font-display text-4xl font-extrabold">{me.score.toLocaleString("id-ID")}</p>
                        <p className="font-bold text-ink/70">Peringkat #{myRank} dari {sorted.length} peserta</p>
                        {me.maxStreak !== undefined && me.maxStreak > 1 && (
                            <p className="text-sm font-bold text-tomato">🔥 Combo terbaik: {me.maxStreak}x berturut-turut!</p>
                        )}
                    </div>
                )}
                <div className="pop-card p-4">
                    <h2 className="font-display text-xl font-extrabold mb-3 text-center">Papan Skor Akhir</h2>
                    <Leaderboard players={sorted} />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={saveImage} className="pop-btn bg-sun">📸 Simpan Gambar Juara</button>
                    <Link href="/" className="pop-btn bg-white">🏠 Kembali ke Beranda</Link>
                </div>
            </main>
        );
    }

    /* ============ QUESTION & REVEAL ============ */
    const isReveal = currentPhase === "reveal";
    // Gunakan picked lokal jika ada, fallback ke myAnswer dari server
    const myChoice = picked !== null ? picked : (state.myAnswer >= 0 ? state.myAnswer : null);
    const isCorrect = isReveal && q.correct >= 0 && myChoice === q.correct;
    const leftTime = Math.max(0, q.duration - (state.elapsedSeconds || 0));
    const urgent = leftTime <= 3 && !isReveal && !state.isPaused;
    const myStreak = state.myStreak ?? 0;

    return (
        <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="rounded-full border-[3px] border-ink bg-white px-4 py-1 font-extrabold">
                    Soal {state.currentQuestion + 1}/{state.totalQuestions}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                    {myStreak > 1 && (
                        <span className="rounded-full border-[3px] border-ink bg-tomato px-3 py-1 font-extrabold text-sm text-white animate-bounce">
                            🔥 {myStreak}x Combo!
                        </span>
                    )}
                    <span className="rounded-full border-[3px] border-ink bg-sun px-3 py-1 font-extrabold text-sm">
                        ⭐ {state.myScore.toLocaleString("id-ID")} Poin
                    </span>
                    <button
                        onClick={toggleSound}
                        className={`pop-btn !px-3 !py-1 text-sm font-extrabold transition-all ${muted ? "bg-white text-ink/70" : "bg-sun text-ink"}`}
                        title={muted ? "Nyalakan suara" : "Matikan suara"}
                    >
                        {muted ? "🔇 Suara: OFF" : "🔊 Suara: ON"}
                    </button>
                </div>
            </div>

            {/* Timer bar */}
            {!isReveal && (
                <div className="flex items-center gap-3">
                    <div className="h-6 flex-1 overflow-hidden rounded-full border-[3px] border-ink bg-white">
                        <div
                            className={`h-full transition-all duration-1000 ease-linear ${state.isPaused ? "bg-sun/60" : urgent ? "bg-tomato" : "bg-mint"}`}
                            style={{ width: `${(leftTime / q.duration) * 100}%` }}
                        />
                    </div>
                    <span className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-ink font-display text-xl font-extrabold ${state.isPaused ? "bg-sun/60" : "bg-sun"} ${urgent ? "animate-wiggle" : ""}`}>
                        {state.isPaused ? "⏸" : leftTime}
                    </span>
                </div>
            )}

            {/* Paused banner */}
            {state.isPaused && !isReveal && (
                <div className="pop-card animate-pop bg-sun/50 p-3 text-center border-[3px] border-dashed border-ink">
                    <p className="font-display text-lg font-extrabold">⏸️ Host mem-pause quiz — Tunggu sebentar...</p>
                </div>
            )}

            {/* Pertanyaan */}
            <div className="pop-card p-6 text-center">
                <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{q.text}</h1>
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
            <div className={`grid gap-4 ${q.options.length > 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {q.options.map((opt, idx) => {
                    let cls = COLORS[idx % 4];
                    if (isReveal) {
                        if (idx === q.correct) {
                            cls = "bg-mint scale-105 font-black ring-4 ring-ink";
                        } else if (idx === myChoice) {
                            cls = "bg-tomato text-white";
                        } else {
                            cls = `${COLORS[idx % 4]} opacity-30`;
                        }
                    } else if (myChoice !== null && myChoice >= 0) {
                        // Highlight pilihan aktif, lainnya tetap bisa diklik
                        cls += myChoice === idx
                            ? " ring-4 ring-ink ring-offset-2 scale-102 font-black shadow-lg"
                            : " opacity-80 hover:opacity-100";
                    }

                    const isDisabled = isReveal || state.isPaused;

                    return (
                        <button
                            key={idx}
                            disabled={isDisabled}
                            onClick={() => handlePick(idx)}
                            className={`pop-btn !justify-start gap-4 !py-4 text-left text-lg transition-all ${cls} ${isDisabled && !isReveal ? "cursor-default" : ""}`}
                        >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[3px] border-ink bg-white font-display">
                                {isReveal && idx === q.correct ? "✓" : isReveal && idx === myChoice ? "✗" : LETTERS[idx]}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isReveal && state.counts && (
                                <span className="text-sm font-display opacity-80">
                                    {state.counts[idx] ?? 0}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Status setelah pilih — bebas ganti jawaban */}
            {!isReveal && myChoice !== null && myChoice >= 0 && (
                <div className="pop-card bg-sun/40 p-3 text-center animate-pop border-[3px] border-ink">
                    <p className="font-display text-base font-extrabold text-ink">
                        Kamu memilih pilihan <span className="underline decoration-ink decoration-2 font-black">{LETTERS[myChoice]}</span>. Masih bisa ganti jawaban sebelum waktu habis! ✏️
                    </p>
                </div>
            )}

            {/* Feedback Reveal */}
            {isReveal && (
                <div className="pop-card flex animate-pop items-center gap-4 bg-white p-5">
                    <Mascot mood={isCorrect ? "happy" : "sad"} size={80} />
                    <div className="flex-1">
                        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                            {isCorrect
                                ? myStreak > 1
                                    ? `BENAR! +${1000 + (myStreak - 1) * 100} 🔥`
                                    : "BENAR! +1000 🎉"
                                : myChoice === null || myChoice < 0
                                    ? "Waktu Habis! ⏰"
                                    : "Yah, Salah! 😭"}
                        </h2>
                        {!isCorrect && (
                            <p className="font-bold text-ink/70">
                                Jawaban benar: <span className="text-ink font-black">{q.options[q.correct]}</span>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Penjelasan Jawaban */}
            {isReveal && q.explanation && (
                <div className="pop-card animate-pop bg-sky/40 p-5 space-y-2 border-[3px] border-ink">
                    <h3 className="font-display text-lg font-extrabold">💡 Penjelasan</h3>
                    <p className="font-bold text-ink leading-relaxed">{q.explanation}</p>
                </div>
            )}

            {/* Video Zoom Saat Salah */}
            {showWrongVideo && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-ink/75 p-4 backdrop-blur-sm">
                    <div className="pop-card animate-zoom-in w-full max-w-sm sm:max-w-md overflow-hidden bg-white p-4 text-center border-[4px] border-ink shadow-[8px_8px_0_#1b1530]">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b-[3px] border-ink">
                            <span className="font-display text-2xl font-extrabold text-tomato flex items-center gap-2">
                                💀 SALAH WOI!
                            </span>
                            <button
                                onClick={() => setShowWrongVideo(false)}
                                className="rounded-lg border-[2px] border-ink bg-white px-2 py-0.5 text-xs font-black hover:bg-tomato hover:text-white transition-colors"
                            >
                                ✖ Tutup
                            </button>
                        </div>
                        <div className="relative overflow-hidden rounded-xl border-[3px] border-ink bg-black shadow-[4px_4px_0_#1b1530]">
                            <video
                                ref={wrongVideoRef}
                                src="/sounds/salah.mp4"
                                autoPlay
                                playsInline
                                muted={muted}
                                onEnded={() => {
                                    setTimeout(() => setShowWrongVideo(false), 300);
                                }}
                                className="w-full max-h-[50vh] object-contain mx-auto"
                            />
                        </div>
                        <p className="mt-3 font-display text-base font-extrabold text-ink/80">
                            Jangan sedih, masih ada soal berikutnya! 😭
                        </p>
                    </div>
                </div>
            )}

            {/* Animasi Combo! */}
            {comboShown && (
                <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
                    <div className="pop-card animate-zoomfx max-w-xs p-6 text-center bg-tomato text-white border-[4px] border-ink">
                        <div className="text-6xl">🔥</div>
                        <p className="mt-2 font-display text-4xl font-extrabold">COMBO!</p>
                        <p className="font-display text-2xl font-extrabold">{myStreak}x berturut-turut!</p>
                        <p className="mt-1 font-bold text-white/80">+{(myStreak - 1) * 100} bonus poin</p>
                    </div>
                </div>
            )}

            {/* Mini Leaderboard */}
            {isReveal && (
                <div className="pop-card p-5 space-y-3">
                    <h3 className="font-display text-xl font-extrabold text-center">📊 Peringkat Sementara</h3>
                    <Leaderboard players={sorted.slice(0, 5)} />
                </div>
            )}
        </main>
    );
}
