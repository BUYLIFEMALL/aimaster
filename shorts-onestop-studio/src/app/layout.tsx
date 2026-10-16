import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "주제 하나로 대본·배경·음성·자막·음악을 자동으로 만들어 세로 쇼츠 MP4로 완성하는 제작 도구" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
