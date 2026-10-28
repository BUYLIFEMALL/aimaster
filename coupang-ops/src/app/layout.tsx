import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 쿠팡 운영 자동화 | AIMaster",
  description: "쿠팡 공식 WING Open API로 상품 등록부터 주문·송장·문의까지 내 쿠팡 판매를 한 화면에서 처리하는 운영 도우미",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">{children}</body>
    </html>
  );
}
