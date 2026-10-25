import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "부동산 실시간 매물 알림",
  description: "네이버 블로그 콘텐츠를 기획하고 검수하는 AI 스튜디오",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
