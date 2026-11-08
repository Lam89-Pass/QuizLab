import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/* ============ ICONS ============ */

export function HomeIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
            <path d="M12 2.5 2.5 11a1 1 0 0 0 .7 1.7H5V21a1 1 0 0 0 1 1h4.2v-6h3.6v6H18a1 1 0 0 0 1-1v-8.3h1.8a1 1 0 0 0 .7-1.7z" />
        </svg>
    );
}

export function PlusCircle(p: P) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
    );
}

export function BookIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
            <path d="M2 5.2C5 3.8 8.8 3.9 12 6.3c3.2-2.4 7-2.5 10-1.1V19c-3-1.4-6.8-1.3-10 1.1C8.8 17.7 5 17.6 2 19z" />
            <path d="M12 6.6v12.8" stroke="#fff" strokeWidth="1.6" fill="none" />
        </svg>
    );
}

export function BoltIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
            <path
                d="M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.5z"
                fill="#ffb000"
                stroke="#e08a00"
                strokeWidth="1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function PlayCircle(p: P) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" {...p}>
            <circle cx="16" cy="16" r="16" fill="#fff" fillOpacity=".22" />
            <path d="M13 9.5v13l10-6.5z" fill="#fff" />
        </svg>
    );
}

export function ArrowIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
            <path d="M5 12h13m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function Sparkle(p: P) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
            <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />
        </svg>
    );
}

export function Burst(p: P) {
    return (
        <svg viewBox="0 0 60 60" fill="none" aria-hidden="true" {...p}>
            <g stroke="#ffcf3f" strokeWidth="8" strokeLinecap="round">
                <path d="M6 42 22 35" />
                <path d="M12 14 26 24" />
                <path d="M38 6 39 22" />
            </g>
        </svg>
    );
}

/* ============ LOGO ============ */

export function BrandLogo() {
    return (
        <span className="inline-flex items-center gap-2.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#5b2fd1] shadow-[0_4px_0_#3b1d94] ring-2 ring-white">
                <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
                    <g transform="rotate(40 16 16)">
                        <rect x="12" y="3" width="8" height="21" rx="2" fill="#ffcf3f" stroke="#c77712" strokeWidth="1.5" />
                        <rect x="12" y="1" width="8" height="5" rx="2" fill="#ff8fb1" stroke="#c77712" strokeWidth="1.5" />
                        <path d="M12 24 16 31 20 24z" fill="#f6d1a6" stroke="#c77712" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M14.5 28.5 16 31 17.5 28.5z" fill="#3b2a6b" />
                    </g>
                </svg>
            </span>
            <span className="font-fun text-4xl font-extrabold leading-none text-brand-ink">
                Quiz<span className="text-brand">Lab</span>
            </span>
        </span>
    );
}

/* ============ HERO ILLUSTRATIONS ============ */

export function Trophy(p: P) {
    return (
        <svg viewBox="0 0 160 200" aria-hidden="true" {...p}>
            <defs>
                <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe066" />
                    <stop offset="1" stopColor="#f5a623" />
                </linearGradient>
            </defs>
            <path d="M30 38H10c-2 36 12 56 38 60" stroke="#f0a020" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M130 38h20c2 36-12 56-38 60" stroke="#f0a020" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path
                d="M30 18h100v52c0 36-22 58-50 58S30 106 30 70z"
                fill="url(#trophyGold)"
                stroke="#e8941a"
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <polygon
                points="80,38 87,55 106,56 91,68 96,86 80,76 64,86 69,68 54,56 73,55"
                fill="#fff4b8"
                stroke="#f0b030"
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <rect x="70" y="124" width="20" height="30" fill="#f5a623" />
            <rect x="45" y="150" width="70" height="18" rx="6" fill="#e8941a" />
            <rect x="35" y="164" width="90" height="24" rx="9" fill="#ffcf3f" stroke="#e8941a" strokeWidth="4" />
        </svg>
    );
}

export function Gamepad(p: P) {
    return (
        <svg viewBox="0 0 120 80" aria-hidden="true" {...p}>
            <path
                d="M25 10H95c15 0 23 15 21 35-2 17-8 27-18 27-10 0-14-10-22-16H44c-8 6-12 16-22 16C12 72 6 62 4 45 2 25 10 10 25 10z"
                fill="#8b5cf6"
                stroke="#5b2fd1"
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <path d="M28 24h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#fff" />
            <g fill="#fff">
                <circle cx="84" cy="24" r="5" />
                <circle cx="98" cy="34" r="5" />
                <circle cx="84" cy="44" r="5" />
                <circle cx="70" cy="34" r="5" />
            </g>
        </svg>
    );
}

export function BotChip(p: P) {
    return (
        <svg viewBox="0 0 90 90" aria-hidden="true" {...p}>
            <rect x="8" y="14" width="74" height="68" rx="20" fill="#fff" stroke="#d9ccff" strokeWidth="4" />
            <rect x="40" y="2" width="10" height="14" rx="4" fill="#8b5cf6" />
            <rect x="18" y="28" width="54" height="40" rx="14" fill="#6d3fe0" />
            <path d="M30 50l8-5M60 50l-8-5" stroke="#1d0f4d" strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}

export function Robot(p: P) {
    return (
        <svg viewBox="0 0 520 500" aria-hidden="true" {...p}>
            {/* sand */}
            <ellipse cx="270" cy="462" rx="235" ry="28" fill="#fde9b8" opacity=".85" />
            {/* feet */}
            <ellipse cx="215" cy="440" rx="62" ry="34" fill="#6a3fd6" />
            <ellipse cx="360" cy="445" rx="55" ry="32" fill="#7c4df0" />

            {/* headband + ear cups */}
            <path d="M150 120Q280 -20 410 120" stroke="#7c4df0" strokeWidth="14" fill="none" strokeLinecap="round" />
            <ellipse cx="150" cy="145" rx="30" ry="50" fill="#7c4df0" stroke="#4c25b8" strokeWidth="5" />
            <ellipse cx="410" cy="145" rx="30" ry="50" fill="#7c4df0" stroke="#4c25b8" strokeWidth="5" />

            {/* torso */}
            <rect x="190" y="205" width="195" height="210" rx="72" fill="#fff" stroke="#d9ccff" strokeWidth="5" />

            {/* raised left arm + fist */}
            <path d="M205 285 150 225" stroke="#d9ccff" strokeWidth="54" strokeLinecap="round" />
            <path d="M205 285 150 225" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
            <circle cx="138" cy="205" r="36" fill="#fff" stroke="#d9ccff" strokeWidth="5" />
            <path d="M120 190q10 10 0 24M140 184q10 12 0 28" stroke="#cbbcf5" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* quiz board */}
            <g transform="rotate(-14 285 345)">
                <rect x="185" y="255" width="215" height="195" rx="30" fill="#6d3fe0" stroke="#4c25b8" strokeWidth="6" />
                <text x="292" y="302" textAnchor="middle" fontSize="38" fontWeight="900" fill="#fff" fontFamily="inherit">
                    QUIZ
                </text>
                <rect x="205" y="318" width="175" height="112" rx="16" fill="#fff" />
                <g>
                    <circle cx="228" cy="344" r="14" fill="#2fc77f" />
                    <path d="M221 344l5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="252" y="338" width="115" height="12" rx="6" fill="#cdbcf7" />

                    <circle cx="228" cy="377" r="14" fill="#2fc77f" />
                    <path d="M221 377l5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="252" y="371" width="115" height="12" rx="6" fill="#cdbcf7" />

                    <circle cx="228" cy="410" r="14" fill="#3aa0e8" />
                    <path d="M221 410l5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="252" y="404" width="75" height="12" rx="6" fill="#cdbcf7" />
                </g>
            </g>

            {/* right hand on board */}
            <circle cx="372" cy="335" r="33" fill="#fff" stroke="#d9ccff" strokeWidth="5" />
            <path d="M356 322q10 8 0 22M374 316q10 10 0 26" stroke="#cbbcf5" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* head */}
            <rect x="165" y="42" width="230" height="185" rx="82" fill="#fff" stroke="#d9ccff" strokeWidth="5" />
            <rect x="265" y="14" width="30" height="32" rx="10" fill="#fff" stroke="#d9ccff" strokeWidth="5" />
            <rect x="386" y="68" width="16" height="56" rx="8" fill="#6d3fe0" transform="rotate(14 394 96)" />
            <rect x="190" y="78" width="180" height="118" rx="56" fill="#1d0f4d" />
            {/* happy eyes */}
            <path d="M222 140q19-28 38 0" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M300 140q19-28 38 0" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
            {/* cheeks */}
            <ellipse cx="206" cy="166" rx="16" ry="11" fill="#ff7aa8" />
            <ellipse cx="354" cy="166" rx="16" ry="11" fill="#ff7aa8" />
            {/* open smile */}
            <path d="M258 150Q280 196 302 150Q280 160 258 150z" fill="#ff6b8f" />
            <path d="M268 170Q280 182 292 170Q280 176 268 170z" fill="#ffb3c8" />
        </svg>
    );
}

/* ============ STEP ILLUSTRATIONS ============ */

export function ClipboardArt(p: P) {
    return (
        <svg viewBox="0 0 120 130" aria-hidden="true" {...p}>
            <rect x="12" y="18" width="80" height="100" rx="12" fill="#fff" stroke="#5b4bd6" strokeWidth="4" />
            <rect x="38" y="8" width="30" height="18" rx="8" fill="#6d3fe0" />
            <g stroke="#3aa0e8" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 46l5 5 8-9M24 68l5 5 8-9M24 90l5 5 8-9" />
            </g>
            <g fill="#8d9bf2">
                <rect x="44" y="44" width="38" height="7" rx="3.5" />
                <rect x="44" y="66" width="38" height="7" rx="3.5" />
                <rect x="44" y="88" width="26" height="7" rx="3.5" />
            </g>
            <g transform="translate(92 74) rotate(38)">
                <rect x="-8" y="-40" width="16" height="62" rx="3" fill="#ffcf3f" stroke="#c77712" strokeWidth="3" />
                <rect x="-8" y="-52" width="16" height="12" rx="4" fill="#ff8fb1" stroke="#c77712" strokeWidth="3" />
                <path d="M-8 22 0 42 8 22z" fill="#f6d1a6" stroke="#c77712" strokeWidth="3" strokeLinejoin="round" />
                <path d="M-3 35 0 42 3 35z" fill="#3b2a6b" />
            </g>
        </svg>
    );
}

const QR = [
    "111010111",
    "101110101",
    "111001111",
    "010110010",
    "101001101",
    "010110110",
    "111010010",
    "101101101",
    "111011011",
];

export function PhoneQRArt(p: P) {
    return (
        <svg viewBox="0 0 100 140" aria-hidden="true" {...p}>
            <g transform="rotate(7 50 70)">
                <rect x="12" y="6" width="70" height="126" rx="13" fill="#2b1763" />
                <rect x="19" y="15" width="56" height="108" rx="8" fill="#fff" />
                <g fill="#2b1763">
                    {QR.flatMap((row, r) =>
                        row.split("").map((c, i) =>
                            c === "1" ? <rect key={`${r}-${i}`} x={24 + i * 5.1} y={24 + r * 5.1} width="4.4" height="4.4" rx="0.8" /> : null
                        )
                    )}
                </g>
                <rect x="26" y="88" width="42" height="7" rx="3.5" fill="#f5b8dd" />
                <rect x="26" y="101" width="26" height="7" rx="3.5" fill="#e0d4ff" />
            </g>
        </svg>
    );
}

export function PlayIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <path d="M9.5 6.8v10.4l8-5.2z" fill="#fff" />
        </svg>
    );
}

export function ListIcon(p: P) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <path d="M8 9h8M8 12h8M8 15h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}