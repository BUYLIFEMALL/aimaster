import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "엑셀·CSV·텍스트 파일을 머리글 기준으로 합치고, 시트·열 값·행 수·글자 수 기준으로 나누는 도구. 파일은 내 브라우저 안에서만 처리됩니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
