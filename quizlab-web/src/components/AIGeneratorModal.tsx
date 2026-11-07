"use client";
import { useEffect, useRef, useState } from "react";
import { api, uid, Question } from "@/lib/store";

type AIGeneratedQuiz = {
    title: string;
    description: string;
    questions: {
        text: string;
        type: "mc" | "tf";
        options: string[];
        correct: number;
        duration: number;
        explanation: string;
    }[];
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { title: string; description: string; questions: Question[] }) => void;
};

type InputMode = "text" | "file";

const ACCEPTED = ".pdf,.ppt,.pptx,.doc,.docx,.odp,.odt,.txt,.md";
const ACCEPTED_LABEL = "PDF, PPT, PPTX, DOC, DOCX, ODP, TXT";

export function AIGeneratorModal({ isOpen, onClose, onSuccess }: Props) {
    const [mode, setMode] = useState<InputMode>("text");
    const [material, setMaterial] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [count, setCount] = useState(5);
    const [type, setType] = useState<"mc" | "tf">("mc");
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedKey = localStorage.getItem("quizlab_gemini_api_key") || "";
            setApiKey(savedKey);
        }
    }, []);

    if (!isOpen) return null;

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setErr("");
    }

    function clearFile() {
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    function mapQuestions(res: AIGeneratedQuiz): Question[] {
        return res.questions.map((q) => ({
            id: uid(),
            text: q.text,
            type: q.type || type,
            options: q.options || (q.type === "tf" ? ["Benar", "Salah"] : ["", "", "", ""]),
            correct: typeof q.correct === "number" ? q.correct : 0,
            duration: q.duration || 15,
            imageUrl: "",
            explanation: q.explanation || "",
        }));
    }

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault();

        if (mode === "text" && !material.trim()) {
            setErr("Masukkan bahan materi atau ringkasan topik dulu ya!");
            return;
        }
        if (mode === "file" && !file) {
            setErr("Pilih file terlebih dahulu!");
            return;
        }

        setLoading(true);
        setErr("");

        try {
            if (apiKey.trim()) {
                localStorage.setItem("quizlab_gemini_api_key", apiKey.trim());
            }

            let res: AIGeneratedQuiz;

            if (mode === "file" && file) {
                // Upload file sebagai multipart/form-data
                const form = new FormData();
                form.append("file", file);
                form.append("count", String(count));
                form.append("type", type);
                form.append("apiKey", apiKey.trim());

                const raw = await fetch("/api/ai/generate-from-file", {
                    method: "POST",
                    credentials: "include",
                    body: form,
                });
                if (!raw.ok) {
                    const j = await raw.json().catch(() => ({ error: "Gagal memproses file" }));
                    throw new Error(j.error || "Gagal memproses file");
                }
                res = await raw.json();
            } else {
                res = await api<AIGeneratedQuiz>("/api/ai/generate", {
                    method: "POST",
                    body: JSON.stringify({
                        material: material.trim(),
                        count,
                        type,
                        apiKey: apiKey.trim(),
                    }),
                });
            }

            if (!res.questions || res.questions.length === 0) {
                throw new Error("Gagal membuat pertanyaan dari materi tersebut. Coba perjelas materinya.");
            }

            onSuccess({
                title: res.title || "Kuis AI",
                description: res.description || "Kuis hasil generate AI",
                questions: mapQuestions(res),
            });
            onClose();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-pop">
            <div className="pop-card w-full max-w-lg bg-white p-6 space-y-4 max-h-[90vh] overflow-y-auto border-[4px] border-ink shadow-[8px_8px_0_#1b1530]">
                {/* Header */}
                <div className="flex items-center justify-between border-b-[3px] border-ink pb-3">
                    <h2 className="font-display text-2xl font-extrabold flex items-center gap-2">
                        ✨ Generate Kuis dengan AI
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg border-[2px] border-ink bg-white px-2 py-0.5 text-xs font-black hover:bg-tomato hover:text-white transition-colors"
                    >
                        ✖ Tutup
                    </button>
                </div>

                {/* Error */}
                {err && (
                    <div className="rounded-xl border-[2px] border-tomato bg-tomato/10 p-3 text-sm font-bold text-tomato">
                        ⚠️ {err}
                    </div>
                )}

                <form onSubmit={handleGenerate} className="space-y-4">
                    {/* Mode selector */}
                    <div className="flex gap-2 rounded-xl border-[2px] border-ink p-1 bg-cream">
                        <button
                            type="button"
                            onClick={() => setMode("text")}
                            className={`flex-1 rounded-lg py-1.5 text-sm font-extrabold transition-all border-[2px] ${
                                mode === "text"
                                    ? "border-ink bg-grape text-white shadow-[2px_2px_0_#1b1530]"
                                    : "border-transparent bg-transparent text-ink/60 hover:text-ink"
                            }`}
                        >
                            📝 Ketik / Tempel Teks
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("file")}
                            className={`flex-1 rounded-lg py-1.5 text-sm font-extrabold transition-all border-[2px] ${
                                mode === "file"
                                    ? "border-ink bg-grape text-white shadow-[2px_2px_0_#1b1530]"
                                    : "border-transparent bg-transparent text-ink/60 hover:text-ink"
                            }`}
                        >
                            📁 Upload File
                        </button>
                    </div>

                    {/* Text input */}
                    {mode === "text" && (
                        <div className="space-y-1">
                            <label className="text-sm font-extrabold text-ink">
                                📖 Bahan Materi / Topik Kuis:
                            </label>
                            <textarea
                                rows={5}
                                className="pop-input resize-y text-sm font-medium"
                                placeholder={`Tempelkan materi pelajaran, artikel, ringkasan, atau topik di sini...\n\nContoh: Sistem tata surya terdiri dari Matahari dan delapan planet. Merkurius adalah planet terdekat...`}
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                            />
                        </div>
                    )}

                    {/* File upload */}
                    {mode === "file" && (
                        <div className="space-y-2">
                            <label className="text-sm font-extrabold text-ink">
                                📁 Upload File Materi:
                            </label>
                            <p className="text-xs font-bold text-ink/50">
                                Format yang didukung: {ACCEPTED_LABEL}
                            </p>

                            {!file ? (
                                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-[3px] border-dashed border-grape bg-grape/5 py-8 hover:bg-grape/10 transition-colors">
                                    <span className="text-4xl">📂</span>
                                    <span className="text-sm font-extrabold text-grape">
                                        Klik untuk pilih file
                                    </span>
                                    <span className="text-xs font-bold text-ink/40">
                                        atau drag & drop ke sini
                                    </span>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept={ACCEPTED}
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-3 rounded-xl border-[2px] border-ink bg-cream px-4 py-3">
                                    <span className="text-2xl">
                                        {file.name.endsWith(".pdf") ? "📄" :
                                         file.name.match(/\.(ppt|pptx)$/) ? "📊" :
                                         file.name.match(/\.(doc|docx)$/) ? "📝" : "📃"}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-extrabold text-ink truncate">{file.name}</p>
                                        <p className="text-xs font-bold text-ink/50">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="rounded-lg border-[2px] border-ink bg-white px-2 py-0.5 text-xs font-black hover:bg-tomato hover:text-white transition-colors"
                                    >
                                        ✖
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Count & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-ink">🔢 Jumlah Soal:</label>
                            <select
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="pop-input !py-2 text-sm font-extrabold"
                            >
                                <option value={3}>3 Soal (Cepat)</option>
                                <option value={5}>5 Soal (Standar)</option>
                                <option value={10}>10 Soal (Lengkap)</option>
                                <option value={15}>15 Soal (Ujian)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-ink">🎯 Tipe Pertanyaan:</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as "mc" | "tf")}
                                className="pop-input !py-2 text-sm font-extrabold"
                            >
                                <option value="mc">Pilihan Ganda (A, B, C, D)</option>
                                <option value="tf">Benar / Salah (True/False)</option>
                            </select>
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-1 pt-1 border-t-[2px] border-dashed border-ink/20">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-ink/70">
                                🔑 Google Gemini API Key (Opsional):
                            </label>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-extrabold text-grape underline"
                            >
                                Dapatkan Gratis ↗
                            </a>
                        </div>
                        <input
                            type="password"
                            className="pop-input !py-1.5 text-xs font-medium"
                            placeholder="AIzaSy... (Bisa dikosongkan untuk mode AI bawaan)"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-[11px] font-bold text-ink/50">
                            *Jika dikosongkan, sistem tetap akan mengekstrak soal otomatis menggunakan AI bawaan!
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t-[3px] border-ink">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="pop-btn bg-white !py-2 !px-4 text-sm"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="pop-btn bg-grape text-white !py-2 !px-5 text-sm font-extrabold flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin text-base">🧠</span>
                                    <span>
                                        {mode === "file" ? "Membaca File..." : "Sedang Membuat Soal..."}
                                    </span>
                                </>
                            ) : (
                                <span>🚀 Generate Soal Sekarang</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
