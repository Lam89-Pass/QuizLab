"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import {
    Question, QType, Quiz, newQuestion, uid, useQuizzes, useUser,
} from "@/lib/store";

const DURATIONS = [5, 10, 15, 20, 30, 60];
const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const LETTERS = ["A", "B", "C", "D"];

export default function QuizEditor() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, ready: userReady } = useUser();
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Quiz | null>(null);
    const [preview, setPreview] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!userReady || !user) return;
        if (id === "new") {
            setDraft({ id: "", title: "", description: "", questions: [newQuestion("mc")], updatedAt: 0 });
            return;
        }
        api<Quiz>(`/api/quizzes/${id}`)
            .then(setDraft)
            .catch(() => router.replace("/dashboard"));
    }, [userReady, user, id, router]);

    if (!draft) return null;

    const setQ = (qid: string, patch: Partial<Question>) =>
        setDraft({ ...draft, questions: draft.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) });

    const move = (idx: number, dir: -1 | 1) => {
        const qs = [...draft.questions];
        const j = idx + dir;
        if (j < 0 || j >= qs.length) return;
        [qs[idx], qs[j]] = [qs[j], qs[idx]];
        setDraft({ ...draft, questions: qs });
    };

    const removeQ = (qid: string) =>
        setDraft({ ...draft, questions: draft.questions.filter((q) => q.id !== qid) });

    const changeType = (q: Question, type: QType) =>
        setQ(q.id, {
            type,
            options: type === "tf" ? ["Benar", "Salah"] : ["", "", "", ""],
            correct: 0,
        });

    const setOpt = (q: Question, i: number, v: string) =>
        setQ(q.id, { options: q.options.map((o, k) => (k === i ? v : o)) });

    const addOpt = (q: Question) => q.options.length < 4 && setQ(q.id, { options: [...q.options, ""] });

    const removeOpt = (q: Question, i: number) => {
        if (q.options.length <= 2) return;
        const correct = q.correct === i ? 0 : q.correct > i ? q.correct - 1 : q.correct;
        setQ(q.id, { options: q.options.filter((_, k) => k !== i), correct });
    };

    async function save() {
        if (!draft || saving) return;
        if (!draft.title.trim()) return setErr("Judul kuis wajib diisi ya 😅");
        if (draft.questions.length === 0) return setErr("Tambahkan minimal 1 pertanyaan dulu.");
        for (let n = 0; n < draft.questions.length; n++) {
            const q = draft.questions[n];
            if (!q.text.trim()) return setErr(`Soal ${n + 1}: teks pertanyaan masih kosong.`);
            if (q.options.some((o) => !o.trim())) return setErr(`Soal ${n + 1}: ada pilihan jawaban yang kosong.`);
        }
        setSaving(true);
        try {
            const body = JSON.stringify({
                title: draft.title,
                description: draft.description,
                questions: draft.questions,
            });
            if (id === "new") await api("/api/quizzes", { method: "POST", body });
            else await api(`/api/quizzes/${id}`, { method: "PUT", body });
            router.push("/dashboard");
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSaving(false);
        }
    }

    /* ============ PREVIEW ============ */
    if (preview) {
        return (
            <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
                <div className="flex items-center justify-between">
                    <h1 className="font-display text-3xl font-extrabold">👀 Preview: {draft.title || "Tanpa judul"}</h1>
                    <button onClick={() => setPreview(false)} className="pop-btn bg-white">← Kembali edit</button>
                </div>
                {draft.questions.map((q, n) => (
                    <div key={q.id} className="space-y-3">
                        <div className="pop-card p-5 text-center">
                            <p className="text-sm font-extrabold text-ink/60">
                                Soal {n + 1}/{draft.questions.length} • ⏱ {q.duration} detik
                            </p>
                            <h2 className="font-display text-2xl font-extrabold">{q.text || "(belum diisi)"}</h2>
                        </div>
                        <div className={`grid gap-3 ${q.options.length > 2 ? "sm:grid-cols-2" : ""}`}>
                            {q.options.map((o, i) => (
                                <div
                                    key={i}
                                    className={`pop-btn !justify-start text-left text-lg ${i === q.correct ? "bg-mint" : COLORS[i % 4]}`}
                                >
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[3px] border-ink bg-white font-display">
                                        {i === q.correct ? "✓" : LETTERS[i]}
                                    </span>
                                    {o || "(kosong)"}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <p className="text-center font-bold text-ink/60">Tanda ✓ hanya terlihat di preview, tidak di layar peserta.</p>
            </main>
        );
    }

    /* ============ EDITOR ============ */
    return (
        <main className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-5">
            <div className="flex items-center justify-between">
                <Logo />
                <button onClick={() => router.push("/dashboard")} className="pop-btn bg-white !py-2">← Dashboard</button>
            </div>

            <div className="pop-card space-y-4 p-5">
                <h1 className="font-display text-3xl font-extrabold">Info kuis</h1>
                <input
                    className="pop-input"
                    placeholder="Judul kuis (misal: Kuis Receh Sejagat)"
                    maxLength={60}
                    value={draft.title}
                    onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setErr(""); }}
                />
                <textarea
                    className="pop-input min-h-20 resize-y"
                    placeholder="Deskripsi singkat (opsional)"
                    maxLength={160}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
            </div>

            {draft.questions.map((q, n) => (
                <div key={q.id} className="pop-card space-y-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-ink bg-sun font-display text-lg font-extrabold">
                            {n + 1}
                        </span>
                        <div className="flex overflow-hidden rounded-xl border-[3px] border-ink">
                            {(["mc", "tf"] as QType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => q.type !== t && changeType(q, t)}
                                    className={`px-3 py-1 text-sm font-extrabold ${q.type === t ? "bg-grape text-white" : "bg-white"}`}
                                >
                                    {t === "mc" ? "Pilihan ganda" : "Benar / Salah"}
                                </button>
                            ))}
                        </div>
                        <label className="ml-auto flex items-center gap-2 font-bold">
                            ⏱
                            <select
                                value={q.duration}
                                onChange={(e) => setQ(q.id, { duration: Number(e.target.value) })}
                                className="rounded-xl border-[3px] border-ink bg-white px-2 py-1 font-extrabold"
                            >
                                {DURATIONS.map((d) => (
                                    <option key={d} value={d}>{d} dtk</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <input
                        className="pop-input"
                        placeholder="Tulis pertanyaannya di sini..."
                        value={q.text}
                        onChange={(e) => { setQ(q.id, { text: e.target.value }); setErr(""); }}
                    />

                    <div className="space-y-2">
                        <p className="text-sm font-bold text-ink/60">Klik bulatan untuk menandai jawaban benar</p>
                        {q.options.map((o, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <button
                                    onClick={() => setQ(q.id, { correct: i })}
                                    aria-label={`Jawaban benar: ${LETTERS[i]}`}
                                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-ink font-extrabold ${q.correct === i ? "bg-mint" : "bg-white"
                                        }`}
                                >
                                    {q.correct === i ? "✓" : LETTERS[i]}
                                </button>
                                {q.type === "tf" ? (
                                    <span className="pop-input !shadow-none">{o}</span>
                                ) : (
                                    <input
                                        className="pop-input !py-2"
                                        placeholder={`Pilihan ${LETTERS[i]}`}
                                        value={o}
                                        onChange={(e) => { setOpt(q, i, e.target.value); setErr(""); }}
                                    />
                                )}
                                {q.type === "mc" && q.options.length > 2 && (
                                    <button onClick={() => removeOpt(q, i)} className="text-xl" aria-label="Hapus pilihan">✖️</button>
                                )}
                            </div>
                        ))}
                        {q.type === "mc" && q.options.length < 4 && (
                            <button onClick={() => addOpt(q)} className="pop-btn bg-white !py-1 text-sm">➕ Tambah pilihan</button>
                        )}
                    </div>

                    <div className="flex gap-2 border-t-[3px] border-dashed border-ink/20 pt-3">
                        <button onClick={() => move(n, -1)} disabled={n === 0} className="pop-btn bg-white !px-3 !py-1 disabled:opacity-30">⬆️</button>
                        <button onClick={() => move(n, 1)} disabled={n === draft.questions.length - 1} className="pop-btn bg-white !px-3 !py-1 disabled:opacity-30">⬇️</button>
                        <button onClick={() => removeQ(q.id)} className="pop-btn ml-auto bg-white !py-1 text-sm">🗑️ Hapus soal</button>
                    </div>
                </div>
            ))}

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setDraft({ ...draft, questions: [...draft.questions, newQuestion("mc")] })}
                    className="pop-btn bg-sky"
                >
                    ➕ Pilihan ganda
                </button>
                <button
                    onClick={() => setDraft({ ...draft, questions: [...draft.questions, newQuestion("tf")] })}
                    className="pop-btn bg-pink"
                >
                    ➕ Benar / Salah
                </button>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-ink bg-cream/95 px-5 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
                    <p className="min-w-0 flex-1 truncate font-bold text-tomato">{err}</p>
                    <button onClick={() => setPreview(true)} className="pop-btn bg-white !py-2">👀 Preview</button>
                    <button onClick={save} className="pop-btn bg-grape text-white !py-2">💾 Simpan</button>
                </div>
            </div>
        </main>
    );
}