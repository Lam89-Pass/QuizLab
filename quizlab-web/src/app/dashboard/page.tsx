"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, Mascot } from "@/components/ui";
import { AIGeneratorModal } from "@/components/AIGeneratorModal";
import { useQuizzes, useUser } from "@/lib/store";

const TONES = ["bg-sun", "bg-sky", "bg-pink", "bg-mint"];

export default function Dashboard() {
    const router = useRouter();
    const { user, ready: userReady, logout } = useUser();
    const { quizzes, ready, error, remove } = useQuizzes();
    const [showAIModal, setShowAIModal] = useState(false);

    useEffect(() => {
        if (userReady && !user) router.replace("/login");
    }, [userReady, user, router]);

    if (!userReady || !user || !ready) return null;

    async function onRemove(id: string, title: string) {
        if (!window.confirm(`Hapus kuis "${title}"? Ini nggak bisa dibatalkan.`)) return;
        try {
            await remove(id);
        } catch (e) {
            window.alert((e as Error).message);
        }
    }

    return (
        <main className="mx-auto max-w-6xl px-5 pb-16">
            <header className="flex items-center justify-between py-5">
                <Logo />
                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border-[3px] border-ink bg-white px-4 py-1 font-extrabold sm:block">
                        {user.provider === "google" ? "G" : user.provider === "github" ? "🐙" : "🛠️"} {user.name}
                    </span>
                    <button
                        onClick={async () => {
                            await logout();
                            router.push("/");
                        }}
                        className="pop-btn bg-white !py-2"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="flex flex-wrap items-end justify-between gap-4 py-6">
                <div>
                    <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
                        Kuis <span className="hl">kamu</span>
                    </h1>
                    <p className="mt-1 font-medium text-ink/70">{quizzes.length} kuis siap dimainkan</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href="/dashboard/quiz/new" className="pop-btn bg-white">
                        ✏️ Bikin Manual
                    </Link>
                    <button
                        onClick={() => setShowAIModal(true)}
                        className="pop-btn bg-grape text-white"
                    >
                        ✨ Generate Pakai AI
                    </button>
                </div>
            </div>

            <AIGeneratorModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                onSuccess={(aiData) => {
                    sessionStorage.setItem("quizlab_ai_draft", JSON.stringify(aiData));
                    router.push("/dashboard/quiz/new");
                }}
            />

            {error && <p className="mb-4 font-bold text-tomato">{error}</p>}

            {quizzes.length === 0 ? (
                <div className="pop-card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
                    <Mascot mood="think" size={120} />
                    <h2 className="font-display text-2xl font-extrabold">Belum ada kuis</h2>
                    <p className="font-medium text-ink/70">Yuk bikin kuis pertamamu!</p>
                    <Link href="/dashboard/quiz/new" className="pop-btn bg-sun">✨ Bikin sekarang</Link>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((q, i) => (
                        <div key={q.id} className="pop-card flex flex-col overflow-hidden">
                            <div className={`${TONES[i % TONES.length]} border-b-[3px] border-ink px-5 py-4`}>
                                <h2 className="font-display text-2xl font-extrabold leading-tight">{q.title}</h2>
                            </div>
                            <div className="flex flex-1 flex-col gap-4 p-5">
                                <p className="flex-1 font-medium text-ink/70">
                                    {q.description || "Tanpa deskripsi."}
                                </p>
                                <span className="w-fit rounded-full border-[3px] border-ink bg-cream px-3 py-1 text-sm font-extrabold">
                                    📝 {q.questionCount} soal
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <Link href={`/host/${q.id}`} className="pop-btn flex-1 bg-mint !py-2">
                                        ▶ Start Quiz
                                    </Link>
                                    <Link href={`/dashboard/quiz/${q.id}`} className="pop-btn bg-white !py-2">
                                        ✏️ Edit
                                    </Link>
                                    <button onClick={() => onRemove(q.id, q.title)} className="pop-btn bg-white !py-2">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}