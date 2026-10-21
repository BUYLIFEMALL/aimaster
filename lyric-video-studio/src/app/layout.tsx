import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import { GOOGLE_FONTS_HREF } from "@/lib/design";
import "./globals.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "음악과 가사만 넣으면 가사가 흐르는 유튜브·쇼츠 영상을 브라우저에서 바로 MP4로 만드는 도구" };
// 화면 깜빡임 없이 저장된 테마(다크 기본 / 라이트)를 먼저 적용한다. 저장소를 못 쓰는 환경이면 다크로 둔다.
const THEME_INIT = `try{var t=localStorage.getItem("lvs-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /><link rel="stylesheet" href={GOOGLE_FONTS_HREF} /></head><body>{children}</body></html>;
}
