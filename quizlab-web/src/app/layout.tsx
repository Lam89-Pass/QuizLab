import type { Metadata } from "next";
import { Baloo_2, Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["700", "800"],
});
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans" });

// Font bulat & tebal untuk landing page (judul, logo, tombol besar)
const fun = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo-var",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "QuizLab — Bikin Kuis. Bagi Kode. Biar Semua Main!",
  description: "Platform kuis interaktif realtime tanpa ribet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${fun.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">{children}</body>
    </html>
  );
}