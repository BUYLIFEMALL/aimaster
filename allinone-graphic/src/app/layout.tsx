import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 올인원 그래픽 자동화 | AIMaster",
  description: "19개 직군 123종 전문 템플릿, 초고해상도 나노바나나 엔진, 브러시 매직 에디터 올인원 그래픽 스튜디오",
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
