import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쇼츠 떡상 분석·대본 자동화 | AIMaster",
  description: "유튜브 떡상 쇼츠 검색부터 분석, 소재 발굴, 대본·프롬프트 생성까지 한 번에",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-neutral-50/60 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
