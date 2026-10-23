import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_SNIPPETS, MAX_SNIPPET_CODE, sanitizeSnippets } from "@/lib/projects";

// 저장한 AI 컴포넌트(2026-10-21 병합 D) — 프로젝트 문서의 snippets만 바꾼다.
// updated_at은 그대로 둬서 열려 있는 편집기의 자동 저장과 충돌(409)하지 않게 한다. 편집기 저장은 snippets를 보존한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return { error: NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE }) };
  const { id } = await ctx.params;
  if (!UUID.test(id)) return { error: NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE }) };
  const admin = createAdminClient();
  const { data } = await admin.from("ui_canvas_projects").select("id, doc").eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE }) };
  const doc = (data.doc ?? {}) as Record<string, unknown>;
  return { admin, id, userId: access.user.id, doc, snippets: sanitizeSnippets(doc.snippets) };
}

async function save(l: Exclude<Awaited<ReturnType<typeof load>>, { error: NextResponse }>, snippets: ReturnType<typeof sanitizeSnippets>) {
  const { error } = await l.admin
    .from("ui_canvas_projects")
    .update({ doc: { ...l.doc, snippets } })
    .eq("id", l.id)
    .eq("user_id", l.userId);
  return !error;
}

/** POST {title, prompt, code} — 저장한 AI 컴포넌트 추가 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const l = await load(ctx);
  if ("error" in l) return l.error;
  const body = await request.json().catch(() => null) as { title?: unknown; prompt?: unknown; code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) return NextResponse.json({ error: "저장할 코드가 없습니다." }, { status: 400, headers: NO_STORE });
  if (code.length > MAX_SNIPPET_CODE) return NextResponse.json({ error: "코드가 너무 깁니다." }, { status: 413, headers: NO_STORE });
  if (l.snippets.length >= MAX_SNIPPETS) {
    return NextResponse.json({ error: `한 프로젝트에 AI 컴포넌트는 ${MAX_SNIPPETS}개까지 저장할 수 있습니다.` }, { status: 409, headers: NO_STORE });
  }
  const [added] = sanitizeSnippets([{ id: crypto.randomUUID(), title: body?.title, prompt: body?.prompt, code, createdAt: new Date().toISOString() }]);
  if (!(await save(l, [added, ...l.snippets]))) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ snippet: added }, { status: 201, headers: NO_STORE });
}

/** DELETE ?sid= — 저장한 AI 컴포넌트 삭제 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const l = await load(ctx);
  if ("error" in l) return l.error;
  const sid = request.nextUrl.searchParams.get("sid") ?? "";
  if (!(await save(l, l.snippets.filter((s) => s.id !== sid)))) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
