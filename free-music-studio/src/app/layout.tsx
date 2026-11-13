import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 무료음악 자동화 | AIMaster",
  description: "가사와 스타일을 정리하고, 내 PC에서 키 없이 노래를 만드는 AI 무료음악 자동화",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#060911] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">{children}<Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" /></body>
    </html>
  );
}
