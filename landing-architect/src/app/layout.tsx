import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "주제·타겟·목표만으로 AI가 랜딩페이지 기획안과 HTML 프로토타입을 만들어 주는 기획 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
