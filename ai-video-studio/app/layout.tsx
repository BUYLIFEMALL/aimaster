import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 영상 스튜디오 — AIMaster",
  description: "Gemini Omni Flash·Kling·Seedance 등 여러 AI 영상 모델을 본인 키로 골라 영상을 만들고 보관하는 영상 스튜디오입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
