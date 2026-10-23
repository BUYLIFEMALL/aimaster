import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
import "./kw.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "키워드 하나로 자동완성·연관검색어·상위 블로그·경쟁력·오늘의 이슈·뉴스·트렌드를 분석하고 글 제목과 공략법을 제안하는 블로그 키워드 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
