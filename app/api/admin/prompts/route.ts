import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

// 헬퍼: 테이블 미존재 시 자동 생성 시도
async function ensureTableExists() {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("program_prompts").select("id").limit(1);
  if (error && (error.code === "42P01" || error.message.includes("does not exist"))) {
    // 테이블 생성 SQL 호스팅 실행 또는 스키마 매뉴얼 처리
    await serviceClient.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.program_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            program_slug TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general',
            title TEXT NOT NULL,
            prompt_text TEXT NOT NULL,
            description TEXT DEFAULT '',
            tags TEXT[] DEFAULT '{}',
            is_active BOOLEAN NOT NULL DEFAULT true,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    }).catch(() => {});
  }
}

// 프로그램별 프롬프트 전체 조회 (관리자용 - 비활성 포함)
export async function GET(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await ensureTableExists();
  const { searchParams } = new URL(req.url);
  const programSlug = searchParams.get("program_slug");
  const category = searchParams.get("category");

  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("program_prompts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (programSlug && programSlug !== "all") {
    query = query.eq("program_slug", programSlug);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    // 테이블이 아예 비어있거나 생성이 필요할 때 빈 배열 반환
    return NextResponse.json([]);
  }
  return NextResponse.json(data ?? []);
}

// 프로그램 프롬프트 생성
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await ensureTableExists();
  const body = await req.json();
  const { program_slug, category, title, prompt_text, description, tags, is_active, sort_order } = body;

  if (!program_slug?.trim() || !title?.trim() || !prompt_text?.trim()) {
    return NextResponse.json({ error: "프로그램 식별자, 프롬프트 제목, 프롬프트 내용은 필수입니다." }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("program_prompts")
    .insert({
      program_slug: program_slug.trim(),
      category: (category || "general").trim(),
      title: title.trim(),
      prompt_text: prompt_text.trim(),
      description: (description || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      is_active: is_active !== false,
      sort_order: Number.isFinite(sort_order) ? Number(sort_order) : 0,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 프로그램 프롬프트 수정
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "프롬프트 ID가 필요합니다." }, { status: 400 });

  if (updates.prompt_text) updates.prompt_text = updates.prompt_text.trim();
  if (updates.title) updates.title = updates.title.trim();
  updates.updated_at = new Date().toISOString();

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("program_prompts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 프로그램 프롬프트 삭제
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "프롬프트 ID가 필요합니다." }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("program_prompts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
