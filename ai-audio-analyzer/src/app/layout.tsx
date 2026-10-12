import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Audio분석 자동화 | AIMaster",
  description: "Gemini 멀티모달 기반 음성 인텔리전스 리포트, 회의록 자동 생성, 음악 분석, Suno v5 역설계 프롬프트, 오디오 포렌식 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
