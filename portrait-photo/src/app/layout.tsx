import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "사진 한 장으로 증명사진·비즈니스 프로필·SNS·시네마틱 화보 인물 사진을 만드는 AI 인물사진 자동화",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
