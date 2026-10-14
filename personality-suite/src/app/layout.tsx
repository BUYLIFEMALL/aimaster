import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "16유형 상황별 검사와 성격 5요인·행동 스타일·애착·에니어그램 검사를 하고, 내 Gemini 키로 AI 심층 분석과 종합 프로필을 받는 성격 진단 자동화",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
