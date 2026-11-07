"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/ui";
import { api } from "@/lib/store";

const COLORS = ["bg-pink", "bg-sky", "bg-mint", "bg-sun", "bg-grape text-white"];

type Info = {
    code: string;
    status: string;
    quizTitle: string;
    hostName: string;
    participants: string[];
    participantCount: number;
};

export default function Lobby() {
    const [code, setCode] = useState("");
    const [origin, setOrigin] = useState("");
    const [me, setMe] = useState("");
    const [info, setInfo] = useState<Info | null>(null);
    const [err, setErr] = useState("");

    useEffect(() => {
        const c = (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase();
        setCode(c);
        setOrigin(window.location.origin);
        try {
            const saved = sessionStorage.getItem(`quizlab:${c}`);
            if (saved) setMe(JSON.parse(saved).nickname ?? "");
        } catch { }
    }, []);

    useEffect(() => {
        if (!code) return;
        let stop = false;
        async function tick() {
            try {
                const s = await api<Info>(`/api/sessions/${code}`);
                if (!stop) { setInfo(s); setErr(""); }
            } catch (e) {
                if (!stop) setErr((e as Error).message);
            }
        }
        tick();
        const t = setInterval(tick, 2000);
        return () => { stop = true; clearInterval(t); };
    }, [code]);

    if (err && !info) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
                <h1 className="font-display text-3xl font-extrabold">Waduh 😵</h1>
                <p className="font-bold text-tomato">{err}</p>
                <Link href="/" className="pop-btn bg-sun">🏠 Ke homepage</Link>
            </main>
        );
    }
    if (!info) return null;

    return (
        <main className="mx-auto max-w-4xl px-5 py-5">
            <Logo />
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
                <div className="pop-card bg-grape p-6 text-white">
                    <p className="font-bold">Kuis</p>
                    <h1 className="font-display text-4xl font-extrabold">{info.quizTitle}</h1>
                    <p className="mt-1 font-medium">Host: {info.hostName}</p>
                    <p className="mt-4 inline-block rounded-xl border-[3px] border-ink bg-sun px-4 py-2 font-display text-3xl font-extrabold tracking-[0.3em] text-ink">
                        {info.code}
                    </p>
                </div>
                <div className="pop-card grid place-items-center p-4">
                    {origin && <QRCodeSVG value={`${origin}/join/${info.code}`} size={120} />}
                    <p className="mt-1 text-xs font-bold">Scan buat gabung</p>
                </div>
            </div>

            <div className="pop-card mt-6 p-6">
                <h2 className="font-display text-2xl font-extrabold">
                    {info.participantCount} peserta sudah masuk 🎉
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                    {info.participants.map((n, i) => (
                        <span
                            key={n}
                            className={`animate-pop rounded-full border-[3px] border-ink px-4 py-2 font-extrabold shadow-[3px_3px_0_#1b1530] ${COLORS[i % COLORS.length]}`}
                        >
                            {n}{n === me ? " (kamu)" : ""}
                        </span>
                    ))}
                </div>
                <p className="mt-6 animate-pulse font-bold text-ink/60">Menunggu host mulai... 🥱</p>
            </div>
        </main>
    );
}