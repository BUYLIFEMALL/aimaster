import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "본인 Gemini 계정으로 문서를 번역하고 문맥·용어·문체를 검토합니다.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
