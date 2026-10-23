import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "이미지·동영상·오디오 파일을 올리면 AI가 Midjourney·Sora·Suno 등에 바로 쓸 수 있는 프롬프트(JSON)로 역설계해 주는 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
