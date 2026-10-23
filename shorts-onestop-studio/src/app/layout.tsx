import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "주제 하나로 대본·배경·음성·자막·음악을 자동으로 만들어 세로 쇼츠 MP4로 완성하는 제작 도구" };
// 화면 깜빡임 없이 저장된 테마(다크 기본 / 라이트)를 먼저 적용한다. 저장소를 못 쓰는 환경이면 다크로 둔다.
const THEME_INIT = `try{var t=localStorage.getItem("sos-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head><body>{children}</body></html>;
}
