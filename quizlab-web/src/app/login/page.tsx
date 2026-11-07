"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, Mascot } from "@/components/ui";
import { useUser } from "@/lib/store";

const ERRORS: Record<string, string> = {
    login_dibatalkan: "Login dibatalkan. Coba lagi ya.",
    state_tidak_valid: "Sesi login kedaluwarsa. Coba lagi ya.",
    gagal_tukar_kode: "Gagal menyelesaikan login. Coba lagi ya.",
    gagal_ambil_profil: "Gagal mengambil profil akun. Coba lagi ya.",
    gagal_simpan_user: "Gagal menyimpan akun. Coba lagi ya.",
};

export default function LoginPage() {
    const router = useRouter();
    const { user, ready } = useUser();
    const [err, setErr] = useState("");

    // Kalau sudah login, redirect ke dashboard
    useEffect(() => {
        if (ready && user) router.replace("/dashboard");
    }, [ready, user, router]);

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

    if (!ready || user) return null; // loading atau redirect

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5">
            <Logo />
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
                <Mascot size={150} />
                <div className="pop-card w-full space-y-5 p-6 text-center">
                    <div>
                        <h1 className="font-display text-3xl font-extrabold">Halo, Host! 👋</h1>
                        <p className="mt-2 font-medium text-ink/70">
                            Pilih akun buat masuk — langsung jadi, nggak perlu daftar dulu.
                        </p>
                        <p className="mt-1 text-sm font-bold text-ink/50">
                            Peserta nggak perlu login kok 😎
                        </p>
                    </div>

                    {err && (
                        <div className="rounded-xl border-[3px] border-tomato bg-tomato/10 px-4 py-3">
                            <p className="font-bold text-tomato">{err}</p>
                        </div>
                    )}

                    {/* Tombol login — satu klik langsung masuk */}
                    <div className="space-y-3">
                        <button
                            onClick={() => go("google")}
                            className="pop-btn w-full bg-white !py-3 text-base"
                        >
                            <span className="flex items-center gap-3">
                                {/* Google color G */}
                                <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.5 1.3 8.9 3.4l6.6-6.6C35.5 2.5 30.1 0 24 0 14.7 0 6.8 5.4 2.9 13.3l7.7 6C12.4 13.2 17.7 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
                                    <path fill="#FBBC05" d="M10.6 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.7-4.7l-7.7-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.1-6z"/>
                                    <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15.1-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.6 2.3-6.3 0-11.6-3.7-13.4-9.3l-8.1 6C6.8 42.6 14.7 48 24 48z"/>
                                </svg>
                                <span className="font-extrabold">Lanjut dengan Google</span>
                            </span>
                        </button>

                        <button
                            onClick={() => go("github")}
                            className="pop-btn w-full bg-ink text-white !py-3 text-base"
                        >
                            <span className="flex items-center gap-3">
                                <svg className="h-5 w-5 shrink-0 fill-white" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/>
                                </svg>
                                <span className="font-extrabold">Lanjut dengan GitHub</span>
                            </span>
                        </button>
                    </div>

                    <p className="text-xs font-bold text-ink/40">
                        Dengan masuk, kamu setuju bahwa kuis ini untuk bersenang-senang 🎉
                    </p>

                    {process.env.NODE_ENV === "development" && (
                        <button onClick={devLogin} className="pop-btn w-full bg-sun !py-2 text-sm">
                            🛠️ Masuk mode dev
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
