import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoToGIF | 상세페이지 GIF 자동화",
  description: "영상을 고화질 GIF로 변환하고 용량까지 자동 최적화합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
