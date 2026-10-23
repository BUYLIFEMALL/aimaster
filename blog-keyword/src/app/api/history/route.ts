import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { deleteReport, isUuid, listReports, loadReport, setFavorite } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/history → 목록, GET /api/history?id=… → 1건(결과 포함) */
export async function GET(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    if (!isUuid(id)) return json({ error: "기록 번호가 올바르지 않습니다." }, 400);
    const row = await loadReport(access.user.id, id);
    if (!row) return json({ error: "기록을 찾을 수 없습니다." }, 404);
    return json({ report: row });
  }
  return json({ reports: await listReports(access.user.id) });
}

export async function PATCH(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: { id?: unknown; favorite?: unknown } = {};
  try { body = await request.json(); } catch { /* 아래에서 처리 */ }
  if (!isUuid(body.id) || typeof body.favorite !== "boolean") return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const ok = await setFavorite(access.user.id, body.id, body.favorite);
  return ok ? json({ success: true }) : json({ error: "기록을 찾을 수 없습니다." }, 404);
}

export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return json({ error: "기록 번호가 올바르지 않습니다." }, 400);
  const ok = await deleteReport(access.user.id, id);
  if (!ok) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  return json({ success: true });
}
