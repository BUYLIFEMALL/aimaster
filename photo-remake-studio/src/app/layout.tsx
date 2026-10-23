import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = { title: `${APP_NAME} | AIMaster`, description: "본인 AI로 오래된 사진을 복원·컬러화하고 여러 사물을 자연스럽게 합성하는 포토 리메이크 스튜디오" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
