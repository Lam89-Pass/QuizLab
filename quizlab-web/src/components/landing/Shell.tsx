export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fbf9ff_0%,#f6f1ff_55%,#eee3ff_100%)] text-brand-ink">
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
            <div className="mx-auto max-w-6xl px-5 pb-16">{children}</div>
        </div>
    );
}