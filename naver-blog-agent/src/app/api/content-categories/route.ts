import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원별 콘텐츠 분류 목록(네이버 블로그 메뉴가 아님). 목록 전체를 한 번에 저장한다(순서·이름 변경·삭제 포함).
const MAX_CATEGORIES = 100;

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const admin: any = createAdminClient();
    const { data, error } = await admin
      .from("nba_content_categories")
      .select("id, name, slug, sort_order")
      .eq("user_id", access.userId)
      .order("sort_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "분류 조회 실패" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.categories) || body.categories.length > MAX_CATEGORIES) {
      return NextResponse.json({ error: "분류 목록 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const [index, item] of body.categories.entries()) {
      const id = typeof item?.id === "string" ? item.id.trim().slice(0, 80) : "";
      const name = typeof item?.name === "string" ? item.name.trim().slice(0, 60) : "";
      if (!id || !name || seen.has(id)) return NextResponse.json({ error: "분류 id와 이름을 확인해 주세요." }, { status: 400 });
      seen.add(id);
      rows.push({
        user_id: access.userId,
        id,
        name,
        slug: typeof item.slug === "string" ? item.slug.slice(0, 80) : "",
        sort_order: Number.isFinite(item.sort_order) ? item.sort_order : index + 1,
        updated_at: new Date().toISOString(),
      });
    }

    const admin: any = createAdminClient();
    if (rows.length > 0) {
      const { error } = await admin.from("nba_content_categories").upsert(rows, { onConflict: "user_id,id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // 화면에서 지운 분류만 삭제한다(본인 행 중 이번 목록에 없는 것). 목록을 읽어 비교해 따옴표 이스케이프 문제를 피한다.
    const { data: existing, error: listErr } = await admin.from("nba_content_categories").select("id").eq("user_id", access.userId);
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    const stale = (existing || []).map((r: any) => r.id).filter((id: string) => !seen.has(id));
    if (stale.length > 0) {
      const { error: delErr } = await admin.from("nba_content_categories").delete().eq("user_id", access.userId).in("id", stale);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "분류 저장 실패" }, { status: 500 });
  }
}
