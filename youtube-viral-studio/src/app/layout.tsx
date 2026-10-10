import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Viral Studio (골든 파인더 엔진) - AIMaster",
  description: "소형 채널 떡상 쇼츠 발굴, 황금 채널 스크리닝, 실시간 VPH 급상승 영상 랭킹 및 원본 역추적",
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
