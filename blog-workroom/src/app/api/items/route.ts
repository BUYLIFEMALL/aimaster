import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { deleteItem, getItem, isKind, listItems, updateItem } from "@/lib/store";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원 본인 작업 목록·수정·삭제(서버가 user_id로 한정). 새 항목 만들기는 /api/run의 각 단계가 맡는다.
const EDITABLE = new Set(["blog", "keyword", "brief", "bench", "research", "draft", "final", "image_job"]);

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const sp = request.nextUrl.searchParams;
    const id = sp.get("id");
    if (id) { const item = await getItem(g.userId, id); return item ? json({ item }) : json({ error: "찾지 못했습니다." }, 404); }
    const kind = sp.get("kind");
    if (!isKind(kind)) return json({ error: "종류가 올바르지 않습니다." }, 400);
    return json({ items: await listItems(g.userId, kind, { refId: sp.get("ref") ?? undefined }) });
  } catch (e) { return fail(e); }
}

export async function PATCH(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = String(g.body.id ?? "");
    const item = await getItem(g.userId, id);
    if (!item || !EDITABLE.has(item.kind)) throw new UserError(404, "수정할 작업을 찾지 못했습니다.");
    const data = g.body.data;
    if (data !== undefined && (typeof data !== "object" || data === null || Array.isArray(data))) throw new UserError(400, "저장 형식이 올바르지 않습니다.");
    const title = typeof g.body.title === "string" ? g.body.title : undefined;
    return json({ item: await updateItem(g.userId, id, { title, data: data as Record<string, unknown> | undefined }) });
  } catch (e) { return fail(e); }
}

export async function DELETE(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const item = await getItem(g.userId, id);
    if (!item || !EDITABLE.has(item.kind)) throw new UserError(404, "삭제할 작업을 찾지 못했습니다.");
    await deleteItem(g.userId, id);
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
