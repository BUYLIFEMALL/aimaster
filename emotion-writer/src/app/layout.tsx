import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/gowun-dodum/400.css";
import "@fontsource/nanum-myeongjo/400.css";
import "@fontsource/nanum-pen-script/400.css";
export const metadata: Metadata = {
  title: "감성 글귀 이미지 | AIMaster",
  description:
    "본인 API로 글귀와 배경을 만들고 마음을 전하는 이미지로 저장하세요.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
