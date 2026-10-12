import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AIMaster`,
  description: "유튜브 감성 음악 플레이리스트 및 실시간 오디오 스펙트럼 1080p MP4 제작 스튜디오",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
