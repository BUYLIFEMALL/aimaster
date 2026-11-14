import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { downloadFile } from "@/server/files";
import { storageDownloadUrl } from "@/server/fileStorage";
import { publicFileOpen } from "@/server/publicPages";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; name: string }> }) {
  const access = await checkProgramAccessApi();
  const { id } = await params;
  // 2026-11-14 공개 페이지 1단계: 로그인 없는 방문자는 열린 게시 페이지 안의 파일만(src/server/publicPages.ts)
  if (!access.allowed && !(await publicFileOpen(id))) return new Response("Not found", { status: 404 });
  const download = request.nextUrl.searchParams.get("download") === "1";
  const r = downloadFile(access.allowed ? access.user.id : "", id, download);
  if (r instanceof Response) return r;
  // 2026-11-14: Storage에 둔 큰 파일 — 권한 확인을 마친 뒤 5분짜리 서명 주소로 넘긴다
  const url = await storageDownloadUrl(r.storagePath, r.name, download);
  return url ? Response.redirect(url, 302) : new Response("Not found", { status: 404 });
}
