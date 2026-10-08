import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 회원별 네이버 블로그 계정(블로그 ID). 모든 조회·쓰기는 로그인한 회원의 user_id로만 한다.
// 화면이 계정 목록 전체를 한 번에 저장한다(추가·수정·삭제 포함). 계정 식별은 blog_id.
const BLOG_ID = /^[A-Za-z0-9_-]{2,40}$/;
const MAX_ACCOUNTS = 50;

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const admin: any = createAdminClient();
    const { data, error } = await admin
      .from("nba_accounts")
      .select("id, blog_id, label, default_category")
      .eq("user_id", access.userId)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ accounts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "계정 조회 실패" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.accounts) || body.accounts.length > MAX_ACCOUNTS) {
      return NextResponse.json({ error: "계정 목록 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const seen = new Set<string>();
    const rows: any[] = [];
    for (const item of body.accounts) {
      const blogId = typeof item?.blog_id === "string" ? item.blog_id.trim() : "";
      const label = typeof item?.label === "string" ? item.label.trim().slice(0, 60) : "";
      if (!BLOG_ID.test(blogId) || !label) {
        return NextResponse.json({ error: "블로그 ID(영문·숫자·_·- 2~40자)와 별칭을 확인해 주세요." }, { status: 400 });
      }
      if (seen.has(blogId)) return NextResponse.json({ error: "같은 블로그 ID가 중복되었습니다." }, { status: 400 });
      seen.add(blogId);
      rows.push({ user_id: access.userId, blog_id: blogId, label, updated_at: new Date().toISOString() });
    }

    const admin: any = createAdminClient();
    if (rows.length > 0) {
      const { error } = await admin.from("nba_accounts").upsert(rows, { onConflict: "user_id,blog_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // 화면에서 지운 계정만 삭제한다(본인 행 중 이번 목록에 없는 것).
    const { data: existing, error: listErr } = await admin.from("nba_accounts").select("id, blog_id").eq("user_id", access.userId);
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    const staleIds = (existing || []).filter((r: any) => !seen.has(r.blog_id)).map((r: any) => r.id);
    if (staleIds.length > 0) {
      const { error: delErr } = await admin.from("nba_accounts").delete().eq("user_id", access.userId).in("id", staleIds);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "계정 저장 실패" }, { status: 500 });
  }
}
