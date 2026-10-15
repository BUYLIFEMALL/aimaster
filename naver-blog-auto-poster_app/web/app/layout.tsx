import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "네이버 블로그 자동화(App) - 기기 연동 | AIMaster" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
