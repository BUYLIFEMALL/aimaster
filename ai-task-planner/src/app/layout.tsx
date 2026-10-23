import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
import "./overview.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "날짜별 할 일 계획과 집중시간, 성과 기록" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
