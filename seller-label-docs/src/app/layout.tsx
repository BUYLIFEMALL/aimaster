import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "셀러 라벨·QR·서류 자동화 | AIMaster",
  description: "A4 라벨 인쇄·QR·파일명 일괄 변경·PDF 정리·문서 서명을 브라우저 안에서만 처리하는 판매자 도구함",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">{children}</body>
    </html>
  );
}
