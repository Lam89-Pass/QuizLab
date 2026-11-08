// quizlab-web/src/components/landing/Icons.tsx
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Dasar semua ikon: 24x24, garis mengikuti warna teks (currentColor). */
function Base({ children, ...p }: P) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...p}
        >
            {children}
        </svg>
    );
}

export const PencilI = (p: P) => (
    <Base {...p}>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
    </Base>
);

export const SparklesI = (p: P) => (
    <Base {...p}>
        <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" />
        <path d="M19 15v4M17 17h4" />
    </Base>
);

export const FileI = (p: P) => (
    <Base {...p}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Base>
);

export const ArchiveI = (p: P) => (
    <Base {...p}>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
    </Base>
);

export const TrashI = (p: P) => (
    <Base {...p}>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </Base>
);

export const UndoI = (p: P) => (
    <Base {...p}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Base>
);

/** Segitiga isi, untuk tombol Start */
export const PlayFillI = (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
        <path d="M7 4.6v14.8a.8.8 0 0 0 1.2.7l12-7.4a.8.8 0 0 0 0-1.4L8.2 3.9A.8.8 0 0 0 7 4.6z" />
    </svg>
);

export const PlayCircleI = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5z" />
    </Base>
);

export const CheckCircleI = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.7 2.7L16 9.5" />
    </Base>
);

export const ChevronDownI = (p: P) => (
    <Base {...p}>
        <path d="m6 9 6 6 6-6" />
    </Base>
);

export const LogOutI = (p: P) => (
    <Base {...p}>
        <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9" />
    </Base>
);

export const LogInI = (p: P) => (
    <Base {...p}>
        <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
    </Base>
);

export const HeartI = (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
        <path d="M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z" />
    </svg>
);

export const UsersI = (p: P) => (
    <Base {...p}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17 14.5a5 5 0 0 1 4.5 5" />
    </Base>
);

export const QrI = (p: P) => (
    <Base {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM20 14v3M17 20h4" />
    </Base>
);

export const TrophyI = (p: P) => (
    <Base {...p}>
        <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9.5 17h5" />
    </Base>
);

export const ListCheckI = (p: P) => (
    <Base {...p}>
        <path d="m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M12 6.5h8M12 12.5h8M12 18.5h8" />
    </Base>
);

export const HelpI = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17.5h.01" />
    </Base>
);

export const BulbI = (p: P) => (
    <Base {...p}>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </Base>
);

export const PlusI = (p: P) => (
    <Base {...p}>
        <path d="M12 5v14M5 12h14" />
    </Base>
);

export const LayoutI = (p: P) => (
    <Base {...p}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" />
    </Base>
);