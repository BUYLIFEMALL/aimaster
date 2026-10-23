import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 이미지 스튜디오 (Image Studio) — AIMaster",
  description: "OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image 등 다양한 AI 엔진으로 1장~10장 연속 생성 및 세부 옵션 맞춤 설정이 가능한 프리미엄 이미지 스튜디오입니다.",
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
