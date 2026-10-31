import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "부동산 실시간 매물 알림",
  description: "관심 단지의 네이버 부동산 새 매물과 가격 변동을 내 PC가 찾아 텔레그램/이메일/카카오톡으로 알려 주는 알림 자동화",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
