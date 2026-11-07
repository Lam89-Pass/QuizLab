"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function SharePanel({ code }: { code: string }) {
    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState<"" | "link" | "code">("");
    const qr = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const link = `${origin}/join/${code}`;

    async function copy(text: string, which: "link" | "code") {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(which);
            setTimeout(() => setCopied(""), 1500);
        } catch { }
    }

    function downloadQr() {
        const url = qr.current?.toDataURL("image/png");
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = `quizlab-${code}.png`;
        a.click();
    }

    return (
        <div className="pop-card grid gap-5 bg-white p-5 sm:grid-cols-[1fr_auto]">
            <div className="space-y-4">
                <div>
                    <p className="text-sm font-extrabold uppercase text-ink/60">Kode game</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="rounded-xl border-[3px] border-ink bg-sun px-4 py-2 font-display text-4xl font-extrabold tracking-[0.3em]">
                            {code || "······"}
                        </span>
                        <button onClick={() => copy(code, "code")} className="pop-btn bg-white !py-2">
                            {copied === "code" ? "Tersalin! ✅" : "📋 Salin kode"}
                        </button>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-extrabold uppercase text-ink/60">Link bergabung</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="min-w-0 max-w-full flex-1 truncate rounded-xl border-[3px] border-ink bg-cream px-3 py-2 font-bold">
                            {code ? link : "..."}
                        </span>
                        <button onClick={() => copy(link, "link")} className="pop-btn bg-white !py-2">
                            {copied === "link" ? "Tersalin! ✅" : "🔗 Salin link"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border-[3px] border-ink bg-white p-1">
                    {code && origin ? (
                        <QRCodeCanvas ref={qr} value={link} size={130} marginSize={1} />
                    ) : (
                        <div className="h-[138px] w-[138px]" />
                    )}
                </div>
                <button onClick={downloadQr} className="pop-btn bg-mint !py-2 text-sm">
                    ⬇️ Unduh QR
                </button>
            </div>
        </div>
    );
}