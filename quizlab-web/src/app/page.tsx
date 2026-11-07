"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, Mascot } from "@/components/ui";

const STEPS = [
  { e: "✍️", t: "Bikin kuis", d: "Login, tulis pertanyaan, atur timer. Gampang, nggak pakai drama.", c: "bg-sun" },
  { e: "📲", t: "Bagi kodenya", d: "Link, kode, atau QR. Peserta tanpa daftar, tanpa ribet.", c: "bg-sky" },
  { e: "🏆", t: "Adu cepat!", d: "Jawab, deg-degan, lihat leaderboard. Pemenang berhak pamer.", c: "bg-pink" },
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) router.push(`/join/${code.trim().toUpperCase()}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <a href="#cara-main" className="hidden font-bold sm:block">Cara main</a>
          <Link href="/login" className="pop-btn bg-white">Login</Link>        </nav>
      </header>

      <section className="grid items-center gap-10 py-10 lg:grid-cols-2">
        <div>
          <span className="inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mint px-4 py-1 text-sm font-extrabold">
            ⚡ Realtime • Tanpa daftar buat peserta
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] sm:text-7xl">
            Bikin kuis. <span className="hl">Bagi kode.</span> Biar semua main!
          </h1>
          <p className="mt-5 max-w-lg text-lg font-medium text-ink/70">
            Kuis seru buat kelas, kampus, dan komunitas. Salah jawab? Tenang, kami
            siapkan efek memalukan yang menghibur. 🤡
          </p>

          <form onSubmit={join} className="pop-card mt-8 flex flex-col gap-3 p-4 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="KODE GAME"
              className="pop-input text-center text-xl tracking-[0.3em]"
            />
            <button className="pop-btn bg-grape text-white">Gabung 🚀</button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard" className="pop-btn bg-sun">✨ Create Quiz</Link>            <Link href="/demo" className="pop-btn bg-white">▶ Coba demo</Link>
          </div>
        </div>

        <div className="relative mx-auto grid h-80 w-80 place-items-center sm:h-96 sm:w-96">
          <div className="absolute inset-4 rotate-6 rounded-[2.5rem] border-[3px] border-ink bg-sky shadow-[8px_8px_0_#1b1530]" />
          <Mascot size={230} />
          <span className="absolute left-0 top-6 animate-wiggle rounded-xl border-[3px] border-ink bg-pink px-3 py-1 font-display text-xl font-extrabold shadow-[3px_3px_0_#1b1530]">
            +1000!
          </span>
          <span className="absolute bottom-10 right-0 -rotate-6 rounded-xl border-[3px] border-ink bg-mint px-3 py-1 font-extrabold shadow-[3px_3px_0_#1b1530]">
            🔥 Benar semua!
          </span>
          <span className="absolute bottom-0 left-8 rotate-3 rounded-xl border-[3px] border-ink bg-white px-3 py-1 font-extrabold shadow-[3px_3px_0_#1b1530]">
            ⏰ 00:03
          </span>
        </div>
      </section>

      <section id="cara-main" className="py-10">
        <h2 className="font-display text-4xl font-extrabold">Cara mainnya gampang banget</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.t}
              className={`pop-card ${s.c} p-6 ${i % 2 ? "md:rotate-1" : "md:-rotate-1"}`}
            >
              <div className="text-5xl">{s.e}</div>
              <h3 className="mt-3 font-display text-2xl font-extrabold">{i + 1}. {s.t}</h3>
              <p className="mt-1 font-medium">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="pt-10 text-center font-bold text-ink/60">
        Create a Quiz. Share the Code. Let Everyone Play. 🎉
      </footer>
    </main>
  );
}