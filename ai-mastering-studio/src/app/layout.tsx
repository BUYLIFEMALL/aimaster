import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 마스터링 스튜디오 | AIMaster",
  description: "WAV 음원을 브라우저에서 EQ·컴프레서·리미터로 마스터링하고, AI가 원하는 사운드의 설정값을 제안하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
