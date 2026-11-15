// 공개 폼(2026-11-15, 공개 페이지 2단계): /form/<폼 보기 번호> — 「누구나(공개)」 폼은 로그인 없이 응답할 수 있다.
// 이 프로그램을 쓰는 회원이면 원래 화면(로그인 입구 /api/rpc)으로, 아니면 회원 이메일을 비워 공개 입구(/api/public)로 보낸다
// (src/litpage/web/lib/api.ts isPublicView). 검색엔진에는 노출하지 않는다(noindex).
import type { Metadata } from "next";
import { WorkspaceApp } from "@/components/WorkspaceApp";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = { title: "폼", robots: { index: false, follow: false } };

export default async function PublicFormRoute() {
  const access = await checkProgramAccessApi().catch(() => null);
  const email = access && access.allowed ? access.user.email ?? "" : "";
  return <WorkspaceApp email={email} />;
}
