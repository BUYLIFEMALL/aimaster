// 공개 페이지 1단계(2026-11-14, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md B): 로그인 없이 「웹에 게시」된 페이지를 보는 화면.
// 원본 화면(PublicPage)을 그대로 쓰되, 명령은 /api/public 으로만 보낸다(src/litpage/web/lib/api.ts).
// 검색엔진: 기본 noindex — 회원이 「검색 엔진에 표시」를 켠 게시 페이지만 색인 허용(0번 규칙: 공개 페이지는 검색 허용).
import type { Metadata } from "next";
import { WorkspaceApp } from "@/components/WorkspaceApp";
import { publicIndexing } from "@/server/publicPages";
import { expandId, idFromSlug } from "#shared/ids.ts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const idOf = (path: string[] | undefined) => {
  const part = decodeURIComponent(path?.[0] ?? "");
  return part ? expandId(idFromSlug(part) ?? part) : "";
};

export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }): Promise<Metadata> {
  const { path } = await params;
  const id = idOf(path);
  const info = id ? await publicIndexing(id).catch(() => ({ open: false, index: false, title: "" })) : { open: false, index: false, title: "" };
  return {
    title: info.open ? info.title || "제목 없음" : "페이지를 찾을 수 없습니다",
    robots: info.open && info.index ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function PublicPageRoute() {
  return <WorkspaceApp email="" />;
}
