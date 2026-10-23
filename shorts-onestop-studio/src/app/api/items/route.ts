import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { createItem, deleteItem, getItem, isKind, listItems, updateItem } from "@/lib/store";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = request.nextUrl.searchParams.get("id");
    if (id) { if (!UUID.test(id)) throw new UserError(400, "항목 번호가 올바르지 않습니다."); return json({ item: await getItem(g.userId, id) }); }
    const kind = request.nextUrl.searchParams.get("kind");
    if (!isKind(kind)) throw new UserError(400, "목록 종류가 올바르지 않습니다.");
    return json({ items: await listItems(g.userId, kind) });
  } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const { kind, title, data } = g.body;
    if (!isKind(kind)) throw new UserError(400, "저장 종류가 올바르지 않습니다.");
    if (!data || typeof data !== "object") throw new UserError(400, "저장할 내용이 없습니다.");
    return json({ item: await createItem(g.userId, kind, String(title ?? "제목 없음"), data) });
  } catch (e) { return fail(e); }
}

export async function PATCH(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = String(g.body.id ?? "");
    if (!UUID.test(id)) throw new UserError(400, "항목 번호가 올바르지 않습니다.");
    const data = g.body.data;
    if (data !== undefined && (!data || typeof data !== "object")) throw new UserError(400, "저장할 내용이 올바르지 않습니다.");
    return json({ item: await updateItem(g.userId, id, { title: typeof g.body.title === "string" ? g.body.title : undefined, data }) });
  } catch (e) { return fail(e); }
}

export async function DELETE(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!UUID.test(id)) throw new UserError(400, "항목 번호가 올바르지 않습니다.");
    await deleteItem(g.userId, id);
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
