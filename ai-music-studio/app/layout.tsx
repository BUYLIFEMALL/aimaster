import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 음악 스튜디오 — AIMaster",
  description: "Google Lyria·ElevenLabs·Suno·fal·Replicate 등 여러 AI로 노래와 배경음악을 만들고 나란히 들어 비교하는 음악 스튜디오입니다.",
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
