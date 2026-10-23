import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "마크다운 문서를 편집하고 회원별로 보관하는 문서 작업실" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" suppressHydrationWarning><body>{/* v1.15: 로그인 화면까지 같은 테마(라이트·다크·자동)를 그리기 전에 적용 */}<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />{children}</body></html>;
}
