import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { MAX_CATEGORIES, sanitizeCategories } from "@/lib/blog/categories";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 내 카테고리 목록(없으면 빈 목록 — 화면이 기본 목록을 보여 준다) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aio_categories")
    .select("id, name, slug, sort_order")
    .eq("user_id", gate.userId)
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: "카테고리를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

/** 목록 전체를 한 번에 저장한다(추가·이름 변경·순서·삭제 모두 포함) */
export async function PUT(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const raw = (body as { categories?: unknown } | null)?.categories;
  if (!Array.isArray(raw) || raw.length > MAX_CATEGORIES) {
    return NextResponse.json({ error: `카테고리는 ${MAX_CATEGORIES}개까지 저장할 수 있습니다.` }, { status: 400 });
  }
  const list = sanitizeCategories(raw);
  if (list.length === 0) return NextResponse.json({ error: "카테고리가 최소 1개는 있어야 합니다." }, { status: 400 });

  const supabase = await createClient();
  const rows = list.map((c) => ({ user_id: gate.userId, id: c.id, name: c.name, slug: c.slug, sort_order: c.sort_order, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("aio_categories").upsert(rows, { onConflict: "user_id,id" });
  if (error) return NextResponse.json({ error: "카테고리를 저장하지 못했습니다." }, { status: 500 });

  const { data: existing } = await supabase.from("aio_categories").select("id").eq("user_id", gate.userId);
  const keep = new Set(list.map((c) => c.id));
  const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error: delErr } = await supabase.from("aio_categories").delete().eq("user_id", gate.userId).in("id", stale);
    if (delErr) return NextResponse.json({ error: "지운 카테고리를 정리하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ categories: list });
}
