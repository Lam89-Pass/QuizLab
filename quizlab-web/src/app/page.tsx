// quizlab-web/src/app/page.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/lib/store";
import {
  ArrowIcon,
  BoltIcon,
  BotChip,
  Burst,
  ClipboardArt,
  Gamepad,
  PhoneQRArt,
  PlayCircle,
  PlayIcon,
  PlusCircle,
  Robot,
  Sparkle,
  Trophy,
} from "@/components/landing/Art";
import { HeartI, SparklesI } from "@/components/landing/Icons";
import { SiteHeader } from "@/components/landing/SiteHeader";

const STEPS = [
  {
    n: 1,
    t: "Bikin kuis",
    d: "Login, tulis pertanyaan, atur timer. Gampang, nggak pakai drama.",
    card: "from-[#fff5da] to-[#ffeacb] ring-[#fbd9a1]",
    badge: "bg-[#ffc21f] text-brand-ink",
    Art: ClipboardArt,
  },
  {
    n: 2,
    t: "Bagi kodenya",
    d: "Link, kode, atau QR. Peserta tanpa daftar, tanpa ribet.",
    card: "from-[#f3edff] to-[#e7defc] ring-violet-200",
    badge: "bg-brand text-white",
    Art: PhoneQRArt,
  },
  {
    n: 3,
    t: "Adu cepat!",
    d: "Jawab, deg-degan, lihat leaderboard. Pemenang berhak pamer.",
    card: "from-[#ffe9f4] to-[#ffdcec] ring-pink-200",
    badge: "bg-[#ff5fa2] text-white",
    Art: Trophy,
  },
];

const FOCUS = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40";

export default function Home() {
  const router = useRouter();
  const { user, ready } = useUser();
  const createHref = ready && user ? "/dashboard" : "/login";
  const [code, setCode] = useState("");

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) router.push(`/join/${code.trim().toUpperCase()}`);
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fbf9ff_0%,#f6f1ff_55%,#eee3ff_100%)] text-brand-ink">
      {/* ===== Dekorasi latar ===== */}
      <div className="pointer-events-none absolute -right-28 -top-28 -z-10 h-[460px] w-[560px] rounded-full bg-violet-300/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-48 -z-10 h-80 w-80 rounded-full bg-violet-200/70 blur-3xl" />
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 w-full"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 120c60-40 140-50 200-10 50-50 150-50 200 0 60-40 150-30 200 20 70-50 170-40 230 10 60-40 150-30 200 20 80-50 190-30 240 20 60-30 120-20 170 10v50H0z"
          fill="#c9b3fb"
          fillOpacity=".55"
        />
        <path
          d="M0 170c80-40 170-30 240 10 70-40 170-40 240 0 80-40 180-30 250 10 80-40 170-30 240 10 80-30 170-20 230 10v20H0z"
          fill="#a688f5"
          fillOpacity=".55"
        />
      </svg>

      <div className="mx-auto max-w-6xl px-5 pb-10">
        <SiteHeader active="beranda" />

        {/* ===== Hero ===== */}
        <section className="grid items-center gap-6 py-4 lg:grid-cols-[1.05fr_1fr] lg:py-8">
          <div>
            <span className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-gradient-to-r from-[#d9f7c9] to-[#c2efdd] px-4 py-1.5 text-sm font-extrabold shadow-sm ring-2 ring-white">
              <BoltIcon className="h-5 w-5" />
              Realtime • Tanpa daftar
            </span>

            <h1 className="mt-4 font-fun text-[3.4rem] font-extrabold leading-[0.95] sm:text-7xl">
              Bikin kuis.
              <br />
              <span className="relative isolate inline-block text-brand">
                <span className="absolute -inset-x-3 bottom-1 top-[52%] -z-10 -rotate-2 rounded-md bg-[#ffd84d]" />
                Bagi kode.
              </span>
              <br />
              Biar semua main!
            </h1>

            <p className="mt-5 max-w-md text-lg font-semibold leading-snug">
              Kuis seru buat kelas, kampus, dan komunitas. Salah jawab? Tenang, kami siapkan efek
              memalukan yang menghibur.
            </p>

            <form
              onSubmit={join}
              className="mt-6 flex max-w-xl items-center gap-2 rounded-full bg-white/80 p-2 shadow-[0_6px_0_#e4d9ff] ring-2 ring-violet-200"
            >
              <span className="grid h-11 w-12 shrink-0 place-items-center rounded-full bg-violet-100">
                <Gamepad className="h-7 w-9" />
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                aria-label="Kode game"
                placeholder="Kode Game"
                className="min-w-0 flex-1 rounded-full bg-white px-4 py-3 text-lg font-extrabold tracking-[0.25em] text-brand-ink outline-none ring-1 ring-violet-200 placeholder:font-bold placeholder:tracking-normal placeholder:text-violet-400 focus:ring-2 focus:ring-brand"
              />
              <button
                className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-b from-[#7c4df0] to-[#5b2fd1] py-2.5 pl-3 pr-6 text-lg font-extrabold text-white shadow-[0_5px_0_#3b1d94] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#3b1d94] ${FOCUS}`}
              >
                <PlayCircle className="h-8 w-8" />
                Gabung
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={createHref}
                className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#ffd95a] to-[#ffc21f] py-3 pl-3 pr-6 text-lg font-extrabold text-brand-ink shadow-[0_5px_0_#d99a0b] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#d99a0b] ${FOCUS}`}
              >
                <PlusCircle className="h-7 w-7 text-brand-ink" />
                Buat Kuis
              </Link>
              <Link
                href="/demo"
                className={`inline-flex items-center gap-2 rounded-full bg-white/60 py-3 pl-3 pr-6 text-lg font-extrabold text-brand-deep ring-2 ring-brand transition-colors hover:bg-white ${FOCUS}`}
              >
                <PlayIcon className="h-7 w-7 text-brand" />
                Demo
              </Link>
            </div>
          </div>

          {/* Ilustrasi maskot */}
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div className="absolute inset-4 rounded-[45%] bg-gradient-to-br from-violet-200/70 to-violet-300/40" />

            <Sparkle className="absolute left-[30%] top-[2%] h-6 w-6 text-[#ffcf3f]" />
            <Sparkle className="absolute right-[26%] top-[6%] h-7 w-7 text-[#ffcf3f]" />
            <Sparkle className="absolute left-[18%] top-[56%] h-9 w-9 text-[#ffcf3f]" />
            <Sparkle className="absolute right-[10%] top-[58%] h-6 w-6 text-[#ffcf3f]" />
            <Sparkle className="absolute right-[18%] top-[22%] h-4 w-4 text-white" />
            <Sparkle className="absolute left-[6%] top-[40%] h-4 w-4 text-white" />

            <Burst className="absolute left-[22%] top-[-2%] h-14 w-14" />

            <div className="absolute left-[5%] top-[6%] w-[88%] animate-bob motion-reduce:animate-none">
              <Robot className="w-full drop-shadow-[0_14px_20px_rgba(91,47,209,0.25)]" />
            </div>

            <Gamepad className="absolute left-[4%] top-[22%] h-auto w-[22%] -rotate-12" />
            <BotChip className="absolute right-[-2%] top-[34%] h-auto w-[18%] rotate-12" />
            <Trophy className="absolute bottom-[2%] right-[0%] h-auto w-[30%] drop-shadow-lg" />

            <div className="absolute right-[-2%] top-[0%]">
              <div className="relative rounded-[28px] bg-gradient-to-b from-[#ffe27a] to-[#ffc21f] px-6 py-2.5 font-fun text-3xl font-extrabold text-brand-ink shadow-[0_6px_0_#a688f5] ring-4 ring-white">
                +1000!
                <span className="absolute -bottom-1.5 left-8 h-4 w-4 rotate-45 bg-[#ffc21f]" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== Cara main ===== */}
        <section id="cara-main" className="scroll-mt-6 pb-6 pt-8">
          <div className="flex items-center justify-center gap-4">
            <Burst className="h-10 w-10 -scale-x-100" />
            <h2 className="-rotate-1 rounded-[28px] bg-gradient-to-b from-[#7c4df0] to-[#5b2fd1] px-8 py-3 text-center font-fun text-2xl font-extrabold text-white shadow-[0_6px_0_#3b1d94] sm:px-12 sm:text-3xl">
              Cara mainnya gampang banget!
            </h2>
            <Burst className="h-10 w-10" />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-9">
            {STEPS.map(({ n, t, d, card, badge, Art }, i) => (
              <div
                key={t}
                className={`relative flex items-center gap-3 rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${card}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-fun text-xl font-extrabold ${badge}`}
                    >
                      {n}
                    </span>
                    <h3 className="font-fun text-2xl font-extrabold">{t}</h3>
                  </div>
                  <p className="mt-2 text-[0.95rem] font-semibold leading-snug text-brand-ink/80">{d}</p>
                </div>
                <Art className="h-28 w-24 shrink-0" />

                {i < STEPS.length - 1 && (
                  <span className="absolute -right-8 top-1/2 hidden h-7 w-7 -translate-y-1/2 text-violet-400 md:block">
                    <ArrowIcon className="h-7 w-7" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-6 text-center text-sm font-bold text-brand-ink/80">
          <span className="inline-flex items-center justify-center gap-2">
            <HeartI className="h-4 w-4 text-[#ff5fa2]" />
            Create a Quiz. Share the Code. Let Everyone Play.
            <SparklesI className="h-4 w-4 text-brand" />
          </span>
        </footer>
      </div>
    </div>
  );
}