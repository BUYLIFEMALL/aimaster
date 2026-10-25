import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 쇼핑몰 주문·매출 리포트 자동화 | AIMaster",
  description: "마켓 주문 엑셀로 주문 현황·매출·순이익·재고·리뷰를 내 PC 안에서 정리하는 판매 후 리포트",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">{children}</body>
    </html>
  );
}
