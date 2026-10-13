import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "내 음악 파일을 재생하고 시각화·이퀄라이저로 즐기는 브라우저 뮤직 플레이어",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
