import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "사진 한 장을 Nano Banana로 복원·스타일 변환·합성·배경 제거하고 증명사진·인생 앨범·만화·스토리까지 만드는 이미지 변환 도구함",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
