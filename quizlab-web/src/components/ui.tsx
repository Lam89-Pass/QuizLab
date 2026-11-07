import Link from "next/link";

export function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2">
            <span className="grid h-11 w-11 -rotate-6 place-items-center rounded-xl border-[3px] border-ink bg-grape text-2xl shadow-[3px_3px_0_#1b1530]">
                🧪
            </span>
            <span className="font-display text-2xl font-extrabold">
                Quiz<span className="text-grape">Lab</span>
            </span>
        </Link>
    );
}

export function Mascot({
    mood = "happy",
    size = 120,
}: {
    mood?: "happy" | "sad" | "think";
    size?: number;
}) {
    const mouth =
        mood === "happy" ? "M35 62 Q50 80 65 62" : mood === "sad" ? "M35 74 Q50 58 65 74" : "M40 68 H60";
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="animate-bob">
            <path
                d="M50 6C78 6 94 26 94 54C94 80 76 94 50 94C24 94 6 80 6 54C6 26 22 6 50 6Z"
                fill="#ffd23f" stroke="#1b1530" strokeWidth="4"
            />
            <g className="animate-blink" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                <circle cx="35" cy="45" r="6" fill="#1b1530" />
                <circle cx="65" cy="45" r="6" fill="#1b1530" />
            </g>
            <circle cx="22" cy="58" r="5" fill="#ff6b9d" opacity=".75" />
            <circle cx="78" cy="58" r="5" fill="#ff6b9d" opacity=".75" />
            <path d={mouth} fill="none" stroke="#1b1530" strokeWidth="4" strokeLinecap="round" />
            {mood === "sad" && (
                <path d="M80 42Q85 52 80 56Q75 52 80 42Z" fill="#4cc9f0" stroke="#1b1530" strokeWidth="2" />
            )}
            {mood === "think" && <text x="74" y="22" fontSize="18" fontWeight="800">?</text>}
        </svg>
    );
}