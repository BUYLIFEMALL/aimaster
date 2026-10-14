import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
import "./we.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "주제만 적으면 AI가 초안을 쓰고, 문장을 드래그해 바로 고치고, 글 전체의 문법·표현 제안을 한 번에 적용하는 AI 글쓰기 에디터",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
