import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 이미지 스튜디오 (Image Studio) — AIMaster",
  description: "GPT Image, Gemini(Nano Banana), FLUX.2, Z-Image 등 최신 AI 엔진으로 이미지를 생성하고 세부 옵션을 맞춤 설정하세요.",
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
