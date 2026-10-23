import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/version";
export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "개인 AI로 음악 스타일·가사·앨범을 기획하고 Suno에 전달하세요.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
