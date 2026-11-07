"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, Mascot } from "@/components/ui";

const ERRORS: Record<string, string> = {
    login_dibatalkan: "Login dibatalkan. Coba lagi ya.",
    state_tidak_valid: "Sesi login kedaluwarsa. Coba lagi ya.",
    gagal_tukar_kode: "Gagal menyelesaikan login. Coba lagi ya.",
    gagal_ambil_profil: "Gagal mengambil profil akun. Coba lagi ya.",
    gagal_simpan_user: "Gagal menyimpan akun. Coba lagi ya.",
};

export default function LoginPage() {
    const router = useRouter();
    const [err, setErr] = useState("");

    useEffect(() => {
        const e = new URLSearchParams(window.location.search).get("error");
        if (e) setErr(ERRORS[e] ?? "Login gagal. Coba lagi ya.");
    }, []);

    function go(provider: "google" | "github") {
        window.location.href = `/api/auth/login/${provider}`;
    }

    async function devLogin() {
        const r = await fetch("/api/auth/dev-login", { method: "POST" });
        if (r.ok) router.push("/dashboard");
        else setErr("Dev login gagal. Cek DEV_LOGIN=true di .env backend.");
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5">
            <Logo />
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
                <Mascot size={150} />
                <div className="pop-card w-full space-y-4 p-6 text-center">
                    <h1 className="font-display text-3xl font-extrabold">Halo, Host! 👋</h1>
                    <p className="font-medium text-ink/70">
                        Login dulu buat bikin kuis. Peserta nggak perlu login kok.
                    </p>
                    {err && <p className="font-bold text-tomato">{err}</p>}
                    <button onClick={() => go("google")} className="pop-btn w-full bg-white">
                        <span className="text-xl font-extrabold text-tomato">G</span> Lanjut dengan Google
                    </button>
                    <button onClick={() => go("github")} className="pop-btn w-full bg-ink text-white">
                        <span className="text-xl">🐙</span> Lanjut dengan GitHub
                    </button>
                    {process.env.NODE_ENV === "development" && (
                        <button onClick={devLogin} className="pop-btn w-full bg-sun">
                            🛠️ Masuk mode dev
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}