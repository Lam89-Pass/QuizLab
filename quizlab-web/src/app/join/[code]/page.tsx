"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, Mascot } from "@/components/ui";
import { api } from "@/lib/store";

const FIRST = ["Kucing", "Bebek", "Ninja", "Kopi", "Mie", "Capybara"];
const SECOND = ["Ngantuk", "Sakti", "Gabut", "Galau", "Kilat", "Santuy"];

export default function JoinPage() {
    const params = useParams<{ code: string }>();
    const code = params.code.toUpperCase();
    const router = useRouter();
    const [name, setName] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return setErr("Nama panggilan wajib diisi dong 😅");
        setBusy(true);
        try {
            let token = "";
            try {
                token = JSON.parse(sessionStorage.getItem(`quizlab:${code}`) ?? "{}").token ?? "";
            } catch { }
            const res = await api<{ participantId: string; token: string; nickname: string }>(
                `/api/sessions/${code}/join`,
                { method: "POST", body: JSON.stringify({ nickname: name.trim(), token }) }
            );
            sessionStorage.setItem(`quizlab:${code}`, JSON.stringify(res));
            router.push(`/lobby?code=${code}`);
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    function randomName() {
        const r = (a: string[]) => a[Math.floor(Math.random() * a.length)];
        setName(`${r(FIRST)} ${r(SECOND)}`);
        setErr("");
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5">
            <Logo />
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
                <Mascot mood="think" size={140} />
                <form onSubmit={submit} className="pop-card w-full space-y-4 p-6">
                    <div className="text-center">
                        <span className="inline-block rotate-2 rounded-lg border-[3px] border-ink bg-sun px-3 py-1 font-display text-2xl font-extrabold tracking-widest">
                            {code}
                        </span>
                        <h1 className="mt-3 font-display text-3xl font-extrabold">Siapa namamu?</h1>
                    </div>
                    <input
                        className="pop-input text-center"
                        placeholder="Nama panggilan"
                        maxLength={20}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setErr(""); }}
                    />
                    {err && <p className="text-center font-bold text-tomato">{err}</p>}
                    <button type="button" onClick={randomName} className="pop-btn w-full bg-white">
                        🎲 Acak nama lucu
                    </button>
                    <button disabled={busy} className="pop-btn w-full bg-grape text-white disabled:opacity-60">
                        {busy ? "Masuk..." : "Masuk! 🚪"}
                    </button>
                </form>
            </div>
        </main>
    );
}