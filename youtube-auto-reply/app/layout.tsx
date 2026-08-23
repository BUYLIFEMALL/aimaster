import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "유튜브 댓글 자동 답글",
  description: "내 유튜브 채널에 달린 댓글을 AI가 읽고 자연스러운 답글(원하는 링크 포함)을 초안으로 만들어, 검토 후 게시해드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
