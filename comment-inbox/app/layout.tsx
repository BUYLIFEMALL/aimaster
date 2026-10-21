import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 댓글·DM 통합 받은편지함",
  description: "인스타·쓰레드·유튜브 댓글과 DM을 한곳에 모아 급한 순서대로 바로 응대하는 통합 받은편지함입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-ig-bg text-ig-text min-h-screen">{children}</body>
    </html>
  );
}
