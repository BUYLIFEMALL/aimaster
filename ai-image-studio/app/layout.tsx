import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 이미지 스튜디오 (Image Studio) — AIMaster",
  description: "OpenAI DALL-E 3, FLUX, Google Imagen 3 등 다양한 AI 이미지 생성 플랫폼을 단일 인터페이스에서 맞춤 자동 생성합니다.",
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
