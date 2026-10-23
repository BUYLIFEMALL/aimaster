import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_CATEGORIES, sanitizeCategories } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원별 생성 기록 분류 목록(네이버 블로그 카테고리가 아님). 없으면 빈 목록 — 화면이 기본 목록을 보여 준다.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("naver_blog_seo_categories")
    .select("id, name, slug, sort_order")
    .eq("user_id", access.user.id)
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: "카테고리를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

// 목록 전체를 한 번에 저장한다(추가·이름 변경·순서·삭제 포함).
export async function PUT(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { categories?: unknown } | null;
  if (!Array.isArray(body?.categories) || body.categories.length > MAX_CATEGORIES) {
    return NextResponse.json({ error: `카테고리는 ${MAX_CATEGORIES}개까지 저장할 수 있습니다.` }, { status: 400 });
  }
  const list = sanitizeCategories(body.categories);
  if (list.length === 0) return NextResponse.json({ error: "카테고리가 최소 1개는 있어야 합니다." }, { status: 400 });

  const supabase = await createClient();
  const rows = list.map((c) => ({ user_id: access.user.id, id: c.id, name: c.name, slug: c.slug, sort_order: c.sort_order, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("naver_blog_seo_categories").upsert(rows, { onConflict: "user_id,id" });
  if (error) return NextResponse.json({ error: "카테고리를 저장하지 못했습니다." }, { status: 500 });

  const { data: existing } = await supabase.from("naver_blog_seo_categories").select("id").eq("user_id", access.user.id);
  const keep = new Set(list.map((c) => c.id));
  const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error: delErr } = await supabase.from("naver_blog_seo_categories").delete().eq("user_id", access.user.id).in("id", stale);
    if (delErr) return NextResponse.json({ error: "지운 카테고리를 정리하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ categories: list });
}
