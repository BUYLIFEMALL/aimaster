import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인스타 카드뉴스 자동화 | AIMaster",
  description: "주제만 넣으면 AI가 인스타 최적화 문구와 고화질 배경, 타이포그래피, 피드 캡션과 해시태그까지 완성하는 올인원 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
