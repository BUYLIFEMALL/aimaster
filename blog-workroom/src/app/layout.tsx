import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "내 블로그 문체를 분석해 키워드 발굴부터 근거 자료 확인, 내 문체 초안, 최종 검수, 이미지까지 돕는 네이버 블로그 작업실" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
