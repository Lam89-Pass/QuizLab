import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["700", "800"],
});
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans" });

export const metadata: Metadata = {
  title: "QuizLab — Bikin Kuis. Bagi Kode. Biar Semua Main!",
  description: "Platform kuis interaktif realtime tanpa ribet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}