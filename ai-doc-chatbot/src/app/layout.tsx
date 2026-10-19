import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 문서 챗봇 자동화 | AIMaster",
  description: "내 문서와 실시간 웹 검색을 근거로 출처까지 보여 주며 답하는 AI 챗봇",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0d0f17] text-slate-100">{children}</body>
    </html>
  );
}
