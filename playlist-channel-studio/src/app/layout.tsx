import type { Metadata } from "next";
import "./globals.css";
import { GOOGLE_FONTS_HREF } from "@/lib/playlist/types";

export const metadata: Metadata = {
  title: "플레이리스트 채널 제작 자동화 | AIMaster",
  description: "장르 선택부터 제목·Suno 프롬프트·가사·유튜브 설명·썸네일까지 한 번에 만드는, 회원 본인의 AI 키로 동작하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
