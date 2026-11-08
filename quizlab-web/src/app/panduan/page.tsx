// quizlab-web/src/app/panduan/page.tsx
import Link from "next/link";
import { Shell } from "@/components/landing/Shell";
import { SiteHeader } from "@/components/landing/SiteHeader";
import {
    BulbI,
    ChevronDownI,
    HelpI,
    ListCheckI,
    PencilI,
    PlayCircleI,
    QrI,
    SparklesI,
    TrophyI,
    UsersI,
} from "@/components/landing/Icons";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type Section = { id: string; Icon: IconType; title: string; intro?: string; steps: string[]; tip?: string };

const SECTIONS: Section[] = [
    {
        id: "membuat-kuis",
        Icon: PencilI,
        title: "Cara membuat kuis",
        intro: "Hanya Host yang perlu login. Peserta bisa langsung main tanpa akun.",
        steps: [
            "Klik Buat Kuis di navbar, lalu login dengan akun Google atau GitHub.",
            "Setelah masuk, buka menu Kuisku (dashboard Host) untuk melihat dan mengelola semua kuis milikmu.",
            "Pilih Bikin Manual untuk menulis soal sendiri, atau Generate Pakai AI untuk dibuatkan otomatis.",
            "Isi judul dan deskripsi kuis, tambahkan soal, lalu simpan.",
        ],
    },
    {
        id: "soal-manual",
        Icon: ListCheckI,
        title: "Cara membuat soal manual",
        steps: [
            "Buka Kuisku, lalu klik Bikin Manual di bagian Buat Kuis.",
            "Tulis pertanyaan, lalu isi pilihan jawaban (2 sampai 4 pilihan).",
            "Tandai satu pilihan sebagai jawaban yang benar.",
            "Atur durasi (timer) untuk setiap soal.",
            "Opsional: tambahkan gambar soal dan penjelasan jawaban. Penjelasan akan tampil setelah waktu habis.",
            "Tambahkan soal lain sesuai kebutuhan, lalu simpan kuis. Kuis yang sudah ada bisa diubah lewat tombol Edit.",
        ],
    },
    {
        id: "soal-ai",
        Icon: SparklesI,
        title: "Cara generate soal menggunakan AI",
        steps: [
            "Buka Kuisku, lalu klik Generate Pakai AI di bagian Buat Kuis.",
            "Isi form yang muncul di jendela AI, lalu jalankan proses generate.",
            "Hasilnya dibuka di editor kuis sebagai draf, jadi belum tersimpan otomatis.",
            "Periksa soal dan jawaban yang dibuat AI, ubah kalau perlu, lalu simpan.",
        ],
        tip: "Selalu cek ulang jawaban benar hasil AI sebelum kuis dimainkan.",
    },
    {
        id: "bagikan-kode",
        Icon: QrI,
        title: "Cara membagikan kode atau QR",
        steps: [
            "Di Kuisku, klik Start Quiz pada kuis yang ingin dimainkan.",
            "Kamu masuk ke lobi Host. Di sana ada panel berbagi berisi kode game, link, dan QR.",
            "Bagikan kode, link, atau QR itu ke peserta lewat chat, proyektor, atau layar kelas.",
        ],
    },
    {
        id: "peserta-gabung",
        Icon: UsersI,
        title: "Cara peserta bergabung",
        steps: [
            "Buka halaman utama QuizLab, atau scan QR dari Host.",
            "Ketik kode game (6 karakter) di kolom Kode Game, lalu klik Gabung.",
            "Masukkan nama panggilan, lalu tunggu Host memulai permainan.",
            "Nama peserta akan muncul di lobi Host secara langsung.",
        ],
    },
    {
        id: "menjalankan-game",
        Icon: PlayCircleI,
        title: "Cara menjalankan permainan",
        steps: [
            "Tunggu sampai minimal satu peserta masuk. Tombol Mulai permainan baru aktif setelah itu.",
            "Klik Mulai permainan. Soal pertama tampil dengan timer berjalan.",
            "Peserta memilih jawaban dan masih boleh mengganti pilihan sebelum waktu habis.",
            "Host bisa menekan Pause untuk menghentikan timer, atau Akhiri soal sekarang untuk langsung membuka jawaban.",
            "Setelah waktu habis, jawaban benar, jumlah pemilih tiap opsi, dan penjelasan (kalau ada) ditampilkan.",
            "Soal berikutnya muncul otomatis setelah hitungan mundur 5 detik. Setelah soal terakhir, hasil akhir tampil.",
        ],
        tip: "Jawaban benar bernilai 1000 poin. Jawaban benar berturut-turut memberi bonus combo +100 poin per urutan.",
    },
    {
        id: "leaderboard",
        Icon: TrophyI,
        title: "Cara membaca leaderboard",
        steps: [
            "Leaderboard menampilkan peserta berurutan dari skor tertinggi. Host melihat 10 teratas di sisi layar.",
            "Peserta melihat peringkat sementara (5 teratas) setiap kali jawaban dibuka.",
            "Di akhir permainan, tiga juara tampil di podium dan sisanya ada di papan skor.",
            "Klik Save Winner Image untuk menyimpan gambar para juara.",
            "Host juga mendapat laporan hasil: rata-rata skor serta persentase jawaban benar dan salah.",
        ],
    },
];

const FAQ: { q: string; a: string }[] = [
    {
        q: "Apakah peserta harus daftar atau login?",
        a: "Tidak. Peserta cukup memasukkan kode game dan nama panggilan. Hanya Host yang perlu login.",
    },
    {
        q: "Kode game saya tidak diterima. Kenapa?",
        a: "Pastikan kodenya 6 karakter dan diketik benar. Kode hanya aktif kalau Host sudah menekan Start Quiz dan lobinya terbuka.",
    },
    {
        q: "Bisakah peserta mengganti jawaban?",
        a: "Bisa, selama waktu belum habis. Jawaban terakhir yang dipilih yang dihitung.",
    },
    {
        q: "Bagaimana skor dihitung?",
        a: "Jawaban benar bernilai 1000 poin, ditambah bonus combo kalau peserta menjawab benar beberapa kali berturut-turut. Jawaban salah atau kosong bernilai 0.",
    },
    {
        q: "Apa yang terjadi kalau Host menekan Pause?",
        a: "Timer berhenti dan peserta tidak bisa memilih atau mengganti jawaban sampai Host menekan Resume.",
    },
    {
        q: "Bisakah saya mencoba dulu tanpa membuat kuis?",
        a: "Bisa. Klik Demo di halaman utama untuk memainkan kuis contoh langsung di browser.",
    },
    {
        q: "Kuis saya tidak muncul di Kuisku. Bagaimana?",
        a: "Pastikan kamu login dengan akun yang sama seperti saat membuat kuis. Kuis hanya muncul untuk akun pembuatnya.",
    },
];

export const metadata = { title: "Panduan — QuizLab" };

export default function PanduanPage() {
    return (
        <Shell>
            <SiteHeader active="panduan" />

            <div className="py-4">
                <h1 className="font-fun text-5xl font-extrabold sm:text-6xl">Panduan</h1>
                <p className="mt-2 max-w-xl text-lg font-semibold text-brand-ink/80">
                    Halaman bantuan dan tutorial penggunaan QuizLab.
                </p>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
                {/* Daftar isi */}
                <aside className="lg:sticky lg:top-6 lg:self-start">
                    <nav
                        aria-label="Daftar isi panduan"
                        className="rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-violet-200 backdrop-blur"
                    >
                        <ul className="space-y-1">
                            {[...SECTIONS, { id: "faq", Icon: HelpI as IconType, title: "FAQ (pertanyaan umum)" }].map((s) => (
                                <li key={s.id}>
                                    <a
                                        href={`#${s.id}`}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                                    >
                                        <s.Icon className="h-5 w-5 shrink-0 text-brand" />
                                        {s.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <div className="space-y-6">
                    {SECTIONS.map((s) => (
                        <section
                            key={s.id}
                            id={s.id}
                            className="scroll-mt-6 rounded-3xl bg-white/85 p-6 shadow-[0_6px_0_#e4d9ff] ring-1 ring-violet-200"
                        >
                            <h2 className="flex items-center gap-3 font-fun text-2xl font-extrabold sm:text-3xl">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-brand">
                                    <s.Icon className="h-6 w-6" />
                                </span>
                                {s.title}
                            </h2>
                            {s.intro && <p className="mt-3 font-semibold text-brand-ink/80">{s.intro}</p>}
                            <ol className="mt-4 space-y-3">
                                {s.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
                                            {i + 1}
                                        </span>
                                        <span className="pt-0.5 font-semibold leading-snug">{step}</span>
                                    </li>
                                ))}
                            </ol>
                            {s.tip && (
                                <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fff5da] px-4 py-3 text-sm font-bold ring-1 ring-[#fbd9a1]">
                                    <BulbI className="mt-0.5 h-5 w-5 shrink-0 text-[#c77712]" />
                                    <span>{s.tip}</span>
                                </p>
                            )}
                        </section>
                    ))}

                    <section
                        id="faq"
                        className="scroll-mt-6 rounded-3xl bg-white/85 p-6 shadow-[0_6px_0_#e4d9ff] ring-1 ring-violet-200"
                    >
                        <h2 className="flex items-center gap-3 font-fun text-2xl font-extrabold sm:text-3xl">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-brand">
                                <HelpI className="h-6 w-6" />
                            </span>
                            FAQ (pertanyaan umum)
                        </h2>
                        <div className="mt-4 space-y-3">
                            {FAQ.map((f) => (
                                <details key={f.q} className="group rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-100">
                                    <summary className="cursor-pointer list-none font-extrabold marker:content-none">
                                        <span className="flex items-center justify-between gap-3">
                                            {f.q}
                                            <ChevronDownI className="h-5 w-5 shrink-0 text-brand transition-transform group-open:rotate-180" />
                                        </span>
                                    </summary>
                                    <p className="mt-2 font-semibold leading-snug text-brand-ink/80">{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#ffd95a] to-[#ffc21f] px-6 py-3 text-lg font-extrabold text-brand-ink shadow-[0_5px_0_#d99a0b] transition-transform hover:-translate-y-0.5"
                        >
                            <PencilI className="h-5 w-5" />
                            Mulai Buat Kuis
                        </Link>
                        <Link
                            href="/demo"
                            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-6 py-3 text-lg font-extrabold text-brand-deep ring-2 ring-brand transition-colors hover:bg-white"
                        >
                            <PlayCircleI className="h-5 w-5" />
                            Coba Demo
                        </Link>
                    </div>
                </div>
            </div>
        </Shell>
    );
}