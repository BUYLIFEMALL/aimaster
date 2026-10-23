import type { Metadata } from "next";
import "./globals.css";
import DetailShell from "@/components/layout/DetailShell";

export const metadata: Metadata = {
  title: "상세페이지 자동생성기 v1 — 이커머스 셀러 스튜디오",
  description: "제품 이미지와 정보를 입력하면 AI가 쿠팡/스마트스토어/럭셔리몰 스타일의 고전환율 상세페이지를 자동으로 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-slate-50 min-h-screen text-slate-900">
        <DetailShell>{children}</DetailShell>
      </body>
    </html>
  );
}
