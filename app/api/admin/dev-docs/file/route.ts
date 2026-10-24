import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/devDocs/admin";
import { fetchRepoText, isAllowedDocPath } from "@/lib/devDocs/github";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const EDIT_LIMIT = 400 * 1024;

/** GET ?path=docs/... — 저장소 문서 원문 하나(관리자만) */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!isAllowedDocPath(path)) return NextResponse.json({ error: "허용되지 않는 경로입니다." }, { status: 400 });

  // fresh=1이면 캐시 없이 지금 GitHub 최신본(수정 창을 열 때)
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const content = await fetchRepoText(path, fresh ? 0 : 300);
  if (content == null) return NextResponse.json({ error: "문서를 찾지 못했습니다(아직 푸시되지 않았거나 지워진 문서)." }, { status: 404 });

  const size = new TextEncoder().encode(content).length;
  return NextResponse.json({ path, content, size, editable: size <= EDIT_LIMIT });
}
