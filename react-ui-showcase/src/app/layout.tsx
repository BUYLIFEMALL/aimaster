import type { Metadata } from "next";
import "./globals.css";
import { PROGRAM_NAME } from "@/lib/version";

export const metadata: Metadata = {
  title: `${PROGRAM_NAME} | AIMaster`,
  description: "React 19, TypeScript, Tailwind CSS 기반 12대 필수 UI 컴포넌트 라이브러리 & 실시간 AI 웹 UI 제작 자동화 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
