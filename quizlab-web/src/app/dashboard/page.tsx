// quizlab-web/src/app/dashboard/page.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AIGeneratorModal } from "@/components/AIGeneratorModal";
import { Mascot } from "@/components/ui";
import { Shell } from "@/components/landing/Shell";
import { SiteHeader } from "@/components/landing/SiteHeader";
import {
    ArchiveI,
    CheckCircleI,
    FileI,
    PencilI,
    PlayFillI,
    SparklesI,
    TrashI,
    UndoI,
} from "@/components/landing/Icons";
import { useQuizzes, useUser } from "@/lib/store";

type Tab = "semua" | "draft" | "publish" | "arsip";
type Status = "draft" | "publish" | "arsip";
type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const ARCHIVE_KEY = "quizlab_archived";

const TABS: { key: Tab; label: string }[] = [
    { key: "semua", label: "Semua Kuis" },
    { key: "draft", label: "Draft" },
    { key: "publish", label: "Dipublikasikan" },
    { key: "arsip", label: "Arsip" },
];

const BADGE: Record<Status, { label: string; cls: string; Icon: IconType }> = {
    draft: { label: "Draft", cls: "bg-[#fff0c2] text-[#8a5a00]", Icon: PencilI },
    publish: { label: "Dipublikasikan", cls: "bg-[#d7f7e6] text-[#0f6b45]", Icon: CheckCircleI },
    arsip: { label: "Arsip", cls: "bg-violet-100 text-brand-deep", Icon: ArchiveI },
};

const EMPTY: Record<Tab, string> = {
    semua: "Belum ada kuis. Yuk bikin kuis pertamamu!",
    draft: "Tidak ada draft. Kuis yang belum punya soal akan muncul di sini.",
    publish: "Belum ada kuis yang siap dimainkan.",
    arsip: "Arsip kosong. Kuis yang sudah selesai bisa kamu arsipkan.",
};

const TONES = [
    "from-[#fff5da] to-[#ffeacb]",
    "from-[#f3edff] to-[#e7defc]",
    "from-[#ffe9f4] to-[#ffdcec]",
    "from-[#dff8ec] to-[#cdf3e0]",
];

const BTN =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40";
const BTN_PRIMARY = `${BTN} bg-mint text-brand-ink shadow-[0_3px_0_#1f9d6b]`;
const BTN_SOFT = `${BTN} bg-white text-brand-deep ring-1 ring-violet-200 shadow-[0_3px_0_#e4d9ff]`;
const BTN_DANGER = `${BTN} bg-white text-tomato ring-1 ring-tomato/30`;

// Status diturunkan dari data yang ada:
// - belum ada soal  -> Draft
// - sudah ada soal  -> Dipublikasikan
// - diarsipkan host -> Arsip (disimpan di browser ini)
function statusOf(id: string, questionCount: number, archived: string[]): Status {
    if (archived.includes(id)) return "arsip";
    return questionCount > 0 ? "publish" : "draft";
}

export default function Dashboard() {
    const router = useRouter();
    const { user, ready: userReady } = useUser();
    const { quizzes, ready, error, remove } = useQuizzes();
    const [tab, setTab] = useState<Tab>("semua");
    const [archived, setArchived] = useState<string[]>([]);
    const [showAIModal, setShowAIModal] = useState(false);

    // Halaman khusus Host: belum login -> ke halaman login
    useEffect(() => {
        if (userReady && !user) router.replace("/login");
    }, [userReady, user, router]);

    // Baca daftar arsip dari browser
    useEffect(() => {
        try {
            const raw = localStorage.getItem(ARCHIVE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) setArchived(parsed.filter((x) => typeof x === "string"));
        } catch { }
    }, []);

    function saveArchived(next: string[]) {
        setArchived(next);
        try {
            localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
        } catch { }
    }

    async function onRemove(id: string, title: string) {
        if (!window.confirm(`Hapus kuis "${title}"? Ini nggak bisa dibatalkan.`)) return;
        try {
            await remove(id);
            if (archived.includes(id)) saveArchived(archived.filter((x) => x !== id));
        } catch (e) {
            window.alert((e as Error).message);
        }
    }

    if (!userReady || !user || !ready) return null;

    const withStatus = quizzes.map((q) => ({ q, status: statusOf(q.id, q.questionCount, archived) }));
    const count: Record<Tab, number> = {
        semua: withStatus.length,
        draft: withStatus.filter((x) => x.status === "draft").length,
        publish: withStatus.filter((x) => x.status === "publish").length,
        arsip: withStatus.filter((x) => x.status === "arsip").length,
    };
    const shown = tab === "semua" ? withStatus : withStatus.filter((x) => x.status === tab);

    return (
        <Shell>
            <SiteHeader active="kuisku" />

            <div className="py-4">
                <h1 className="font-fun text-5xl font-extrabold">Kuisku</h1>
                <p className="mt-1 font-semibold text-brand-ink/70">Kelola semua kuis yang kamu buat sebagai Host.</p>
            </div>

            {/* ===== Buat Kuis ===== */}
            <section aria-labelledby="buat-kuis" className="py-4">
                <h2 id="buat-kuis" className="font-fun text-2xl font-extrabold">
                    Buat Kuis
                </h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <Link
                        href="/dashboard/quiz/new"
                        className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#fff5da] to-[#ffeacb] p-5 ring-1 ring-[#fbd9a1] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                    >
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[#c77712] shadow-sm">
                            <PencilI className="h-7 w-7" />
                        </span>
                        <span>
                            <span className="block font-fun text-2xl font-extrabold">Bikin Manual</span>
                            <span className="block font-semibold text-brand-ink/70">
                                Tulis soal, pilihan jawaban, dan timer sendiri.
                            </span>
                        </span>
                    </Link>

                    <button
                        onClick={() => setShowAIModal(true)}
                        className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#f3edff] to-[#e7defc] p-5 text-left ring-1 ring-violet-200 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                    >
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-sm">
                            <SparklesI className="h-7 w-7" />
                        </span>
                        <span>
                            <span className="block font-fun text-2xl font-extrabold">Generate Pakai AI</span>
                            <span className="block font-semibold text-brand-ink/70">
                                AI membuatkan draf soal, kamu tinggal cek dan edit.
                            </span>
                        </span>
                    </button>
                </div>
            </section>

            <AIGeneratorModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                onSuccess={(aiData) => {
                    sessionStorage.setItem("quizlab_ai_draft", JSON.stringify(aiData));
                    router.push("/dashboard/quiz/new");
                }}
            />

            {/* ===== Daftar kuis ===== */}
            <section className="py-6">
                <div role="tablist" aria-label="Filter kuis" className="flex flex-wrap gap-2">
                    {TABS.map((t) => {
                        const on = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                role="tab"
                                aria-selected={on}
                                onClick={() => setTab(t.key)}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${on
                                        ? "bg-brand text-white shadow-[0_3px_0_#3b1d94]"
                                        : "bg-white/80 text-brand-ink ring-1 ring-violet-200 hover:bg-violet-100"
                                    }`}
                            >
                                {t.label}
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs ${on ? "bg-white/25 text-white" : "bg-violet-100 text-brand-deep"}`}
                                >
                                    {count[t.key]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {error && <p className="mt-4 font-bold text-tomato">{error}</p>}

                {shown.length === 0 ? (
                    <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-3xl bg-white/80 p-8 text-center ring-1 ring-violet-200">
                        <Mascot mood="think" size={110} />
                        <p className="font-bold text-brand-ink/80">{EMPTY[tab]}</p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {shown.map(({ q, status }, i) => {
                            const B = BADGE[status];
                            return (
                                <article
                                    key={q.id}
                                    className="flex flex-col overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-violet-200"
                                >
                                    <div className={`bg-gradient-to-br px-5 py-4 ${TONES[i % TONES.length]}`}>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${B.cls}`}>
                                            <B.Icon className="h-3.5 w-3.5" />
                                            {B.label}
                                        </span>
                                        <h3 className="mt-2 font-fun text-2xl font-extrabold leading-tight">{q.title}</h3>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-4 p-5">
                                        <p className="flex-1 font-semibold text-brand-ink/70">{q.description || "Tanpa deskripsi."}</p>
                                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-extrabold text-brand-deep">
                                            <FileI className="h-4 w-4" />
                                            {q.questionCount} soal
                                        </span>

                                        <div className="flex flex-wrap gap-2">
                                            {status === "publish" && (
                                                <Link href={`/host/${q.id}`} className={BTN_PRIMARY}>
                                                    <PlayFillI className="h-4 w-4" />
                                                    Start Quiz
                                                </Link>
                                            )}
                                            <Link href={`/dashboard/quiz/${q.id}`} className={BTN_SOFT}>
                                                <PencilI className="h-4 w-4" />
                                                {status === "draft" ? "Lanjutkan" : "Edit"}
                                            </Link>
                                            {status === "publish" && (
                                                <button onClick={() => saveArchived([...archived, q.id])} className={BTN_SOFT}>
                                                    <ArchiveI className="h-4 w-4" />
                                                    Arsipkan
                                                </button>
                                            )}
                                            {status === "arsip" && (
                                                <button
                                                    onClick={() => saveArchived(archived.filter((x) => x !== q.id))}
                                                    className={BTN_SOFT}
                                                >
                                                    <UndoI className="h-4 w-4" />
                                                    Aktifkan lagi
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onRemove(q.id, q.title)}
                                                className={BTN_DANGER}
                                                aria-label={`Hapus kuis ${q.title}`}
                                            >
                                                <TrashI className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </Shell>
    );
}