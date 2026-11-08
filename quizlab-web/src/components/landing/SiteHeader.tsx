// quizlab-web/src/components/landing/SiteHeader.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/lib/store";
import { BookIcon, BrandLogo, HomeIcon, ListIcon, PlusCircle } from "@/components/landing/Art";
import { ChevronDownI, LogInI, LogOutI } from "@/components/landing/Icons";

export type NavKey = "beranda" | "panduan" | "kuisku";

const FOCUS = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40";

export function SiteHeader({ active }: { active?: NavKey }) {
    const router = useRouter();
    const { user, ready, logout } = useUser();
    const [showMenu, setShowMenu] = useState(false);
    const loggedIn = ready && !!user;

    // "Buat Kuis" dan "Kuisku" itu satu halaman yang sama: dashboard Host.
    // Belum login -> Buat Kuis (ke halaman login). Sudah login -> Kuisku (ke /dashboard).
    const nav = [
        { key: "beranda", href: "/", label: "Beranda", Icon: HomeIcon },
        loggedIn
            ? { key: "kuisku", href: "/dashboard", label: "Kuisku", Icon: ListIcon }
            : { key: "buat", href: "/login", label: "Buat Kuis", Icon: PlusCircle },
        { key: "panduan", href: "/panduan", label: "Panduan", Icon: BookIcon },
    ];

    return (
        <header className="flex flex-wrap items-center justify-between gap-3 py-5 md:grid md:grid-cols-[1fr_auto_1fr]">
            <Link href="/" className={`rounded-2xl ${FOCUS}`} aria-label="QuizLab, ke beranda">
                <BrandLogo />
            </Link>

            <nav
                aria-label="Navigasi utama"
                className="order-3 flex w-full items-center justify-center gap-1 rounded-full bg-white/70 p-1.5 shadow-sm ring-1 ring-violet-100 backdrop-blur md:order-none md:w-auto"
            >
                {nav.map(({ key, href, label, Icon }) => {
                    const isActive = key === active;
                    return (
                        <Link
                            key={key}
                            href={href}
                            aria-current={isActive ? "page" : undefined}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold transition-colors sm:px-5 sm:text-base ${FOCUS} ${isActive ? "bg-brand text-white shadow-[0_3px_0_#3b1d94]" : "text-brand-ink hover:bg-violet-100"
                                }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? "" : "text-brand"}`} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="relative justify-self-end">
                {/* Belum login: tombol Login */}
                {ready && !user && (
                    <Link
                        href="/login"
                        className={`inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-extrabold text-brand-deep shadow-[0_4px_0_#d9ccff] ring-2 ring-brand transition-transform hover:-translate-y-0.5 ${FOCUS}`}
                    >
                        <LogInI className="h-5 w-5" />
                        Login
                    </Link>
                )}

                {/* Sudah login: profil + menu */}
                {loggedIn && user && (
                    <>
                        <button
                            onClick={() => setShowMenu((v) => !v)}
                            aria-expanded={showMenu}
                            aria-haspopup="menu"
                            className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-extrabold shadow-[0_3px_0_#d9ccff] ring-1 ring-violet-200 transition-colors hover:bg-violet-50 ${FOCUS}`}
                        >
                            {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="h-7 w-7 rounded-full object-cover ring-2 ring-violet-200"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                    }}
                                />
                            ) : (
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
                                    {user.name[0]?.toUpperCase()}
                                </span>
                            )}
                            <span className="hidden max-w-[120px] truncate sm:block">{user.name}</span>
                            <ChevronDownI className={`h-4 w-4 text-brand-ink/60 transition-transform ${showMenu ? "rotate-180" : ""}`} />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl bg-white shadow-xl ring-1 ring-violet-200"
                                >
                                    <div className="border-b border-violet-100 px-4 py-3">
                                        <p className="truncate font-extrabold">{user.name}</p>
                                        {user.email && <p className="truncate text-xs font-bold text-brand-ink/50">{user.email}</p>}
                                    </div>
                                    <div className="space-y-1 p-2">
                                        <Link
                                            href="/dashboard"
                                            role="menuitem"
                                            onClick={() => setShowMenu(false)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 font-bold transition-colors hover:bg-violet-50"
                                        >
                                            <ListIcon className="h-5 w-5 text-brand" />
                                            Kuisku
                                        </Link>
                                        <button
                                            role="menuitem"
                                            onClick={async () => {
                                                setShowMenu(false);
                                                await logout();
                                                router.push("/");
                                            }}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 font-bold text-tomato transition-colors hover:bg-tomato/10"
                                        >
                                            <LogOutI className="h-5 w-5" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </header>
    );
}