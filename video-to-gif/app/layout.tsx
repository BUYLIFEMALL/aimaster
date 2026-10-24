import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 영상렌더 스튜디오 | VideoRender Studio",
  description: "AI 영상 전문 고속 변환 및 스마트 렌더링 엔진. 프레임 정밀 편집과 고화질 용량 최적화를 지원합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
