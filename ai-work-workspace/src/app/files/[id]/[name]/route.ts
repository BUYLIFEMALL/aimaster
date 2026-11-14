import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { downloadFile } from "@/server/files";
import { storageDownloadUrl } from "@/server/fileStorage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; name: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const r = downloadFile(access.user.id, id, download);
  if (r instanceof Response) return r;
  // 2026-11-14: Storage에 둔 큰 파일 — 권한 확인을 마친 뒤 5분짜리 서명 주소로 넘긴다
  const url = await storageDownloadUrl(r.storagePath, r.name, download);
  return url ? Response.redirect(url, 302) : new Response("Not found", { status: 404 });
}
