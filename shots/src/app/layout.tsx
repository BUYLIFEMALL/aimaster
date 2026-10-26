import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YOUTUBE Shots (헐리우드 시네마틱 REC 에디션)",
  description: "유튜브 쇼츠 바이럴 시나리오·Suno BGM·WebCodecs 1080p 브라우저 렌더링 올인원 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0d1b] text-slate-100 selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
