"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { AIGeneratorModal } from "@/components/AIGeneratorModal";
import { Question, QType, Quiz, api, newQuestion, useUser } from "@/lib/store";

const DURATIONS = [5, 10, 15, 20, 30, 60];
const COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];
const LETTERS = ["A", "B", "C", "D"];

export default function QuizEditor() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, ready: userReady } = useUser();
    const [saving, setSaving] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [draft, setDraft] = useState<Quiz | null>(() =>
        id === "new"
            ? { id: "", title: "", description: "", questions: [newQuestion("mc")], updatedAt: 0 }
            : null
    );
    const [preview, setPreview] = useState(false);
    const [err, setErr] = useState("");

    // Load AI draft jika digenerate dari dashboard
    useEffect(() => {
        if (id === "new") {
            try {
                const raw = sessionStorage.getItem("quizlab_ai_draft");
                if (raw) {
                    const aiData = JSON.parse(raw);
                    setDraft({
                        id: "",
                        title: aiData.title || "",
                        description: aiData.description || "",
                        questions: aiData.questions || [newQuestion("mc")],
                        updatedAt: Date.now(),
                    });
                    sessionStorage.removeItem("quizlab_ai_draft");
                }
            } catch { }
        }
    }, [id]);

    useEffect(() => {
        if (userReady && !user) {
            router.replace("/login");
            return;
        }
        if (!userReady || !user) return;
        if (id === "new") return;
        api<Quiz>(`/api/quizzes/${id}`)
            .then(setDraft)
            .catch(() => router.replace("/dashboard"));
    }, [userReady, user, id, router]);

    if (!draft || !user) return null;

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

    const handleFileUpload = (file: File, qid: string) => {
        if (!file.type.startsWith("image/")) {
            setErr("File harus berupa gambar (JPG, PNG, GIF, WebP).");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const raw = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const maxDim = 1000;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, w, h);
                const optimizedUrl = canvas.toDataURL("image/jpeg", 0.85);
                setQ(qid, { imageUrl: optimizedUrl });
                setErr("");
            };
            img.src = raw;
        };
        reader.readAsDataURL(file);
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
                            {q.imageUrl && (
                                <div className="mt-3 flex justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={q.imageUrl}
                                        alt="Preview Gambar Soal"
                                        className="max-h-48 max-w-full rounded-xl border-[3px] border-ink object-contain shadow-[3px_3px_0_#1b1530]"
                                    />
                                </div>
                            )}
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
            <div className="flex items-center justify-between flex-wrap gap-2">
                <Logo />
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowAIModal(true)}
                        className="pop-btn bg-grape text-white !py-2 text-sm font-extrabold"
                    >
                        ✨ Generate Soal Pakai AI
                    </button>
                    <button onClick={() => router.push("/dashboard")} className="pop-btn bg-white !py-2 text-sm">← Dashboard</button>
                </div>
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

                    {/* Image-Based Question: Upload Komputer atau URL Internet */}
                    <div className="space-y-2 rounded-xl border-[2px] border-dashed border-ink/30 bg-cream/50 p-3">
                        <label className="text-xs font-bold text-ink/70 flex items-center gap-1">
                            🖼️ Gambar Soal (opsional: biologi, geografi, diagram, meme, dll)
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {/* Tombol Upload File dari Komputer */}
                            <label className="pop-btn bg-white !py-2 !px-3 text-sm cursor-pointer shrink-0">
                                📁 Upload dari Komputer
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file, q.id);
                                    }}
                                />
                            </label>
                            {/* Input URL Gambar */}
                            <input
                                className="pop-input !py-2 text-sm flex-1"
                                placeholder="🌐 Atau tempel URL gambar (https://...)"
                                value={q.imageUrl?.startsWith("data:") ? "(Gambar terupload dari komputer)" : (q.imageUrl || "")}
                                onChange={(e) => setQ(q.id, { imageUrl: e.target.value })}
                            />
                            {/* Tombol Hapus Gambar jika sudah ada */}
                            {q.imageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setQ(q.id, { imageUrl: "" })}
                                    className="pop-btn bg-tomato text-white !py-2 !px-3 text-sm shrink-0"
                                    title="Hapus gambar"
                                >
                                    🗑️ Hapus
                                </button>
                            )}
                        </div>
                        {q.imageUrl && (
                            <div className="relative inline-block overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-[3px_3px_0_#1b1530] mt-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={q.imageUrl}
                                    alt="Preview Gambar Soal"
                                    className="max-h-48 max-w-full object-contain"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-bold text-ink/60">Klik bulatan untuk menandai jawaban benar</p>
                        {q.options.map((o, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQ(q.id, { correct: i })}
                                    aria-label={`Jawaban benar: ${LETTERS[i]}`}
                                    title="Klik untuk jadikan jawaban benar"
                                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-ink font-extrabold transition-colors ${q.correct === i ? "bg-mint ring-2 ring-ink" : "bg-white hover:bg-cream"
                                        }`}
                                >
                                    {q.correct === i ? "✓" : LETTERS[i]}
                                </button>
                                {q.type === "tf" ? (
                                    <span className="pop-input !shadow-none">{o}</span>
                                ) : (
                                    <input
                                        className={`pop-input !py-2 ${q.correct === i ? "border-emerald-600 bg-mint/10" : ""}`}
                                        placeholder={`Pilihan ${LETTERS[i]}`}
                                        value={o}
                                        onChange={(e) => { setOpt(q, i, e.target.value); setErr(""); }}
                                    />
                                )}
                                {q.correct === i && (
                                    <span className="shrink-0 rounded-full border-[2px] border-ink bg-mint px-2 py-0.5 text-xs font-black">
                                        Jawaban Benar
                                    </span>
                                )}
                                {q.type === "mc" && q.options.length > 2 && (
                                    <button type="button" onClick={() => removeOpt(q, i)} className="text-xl" aria-label="Hapus pilihan">✖️</button>
                                )}
                            </div>
                        ))}
                        {q.type === "mc" && q.options.length < 4 && (
                            <button type="button" onClick={() => addOpt(q)} className="pop-btn bg-white !py-1 text-sm">➕ Tambah pilihan</button>
                        )}
                    </div>

                    {/* Penjelasan Jawaban (Media Pembelajaran) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-ink/70">💡 Penjelasan / Alasan Jawaban Benar (opsional):</label>
                        <textarea
                            className="pop-input min-h-16 resize-y !py-2 text-sm"
                            placeholder="Tuliskan penjelasan mengapa jawaban ini benar (muncul saat pembahasan)..."
                            value={q.explanation || ""}
                            onChange={(e) => setQ(q.id, { explanation: e.target.value })}
                        />
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
                <button
                    type="button"
                    onClick={() => setShowAIModal(true)}
                    className="pop-btn bg-grape text-white"
                >
                    ✨ Generate Soal Pakai AI
                </button>
            </div>

            <AIGeneratorModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                onSuccess={(aiData) => {
                    setDraft((prev) => {
                        if (!prev) return null;
                        const existing = prev.questions.filter((q) => q.text.trim() !== "");
                        return {
                            ...prev,
                            title: prev.title.trim() ? prev.title : aiData.title,
                            description: prev.description.trim() ? prev.description : aiData.description,
                            questions: existing.length > 0 ? [...existing, ...aiData.questions] : aiData.questions,
                        };
                    });
                }}
            />

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