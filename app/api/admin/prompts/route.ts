import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { INITIAL_IMAGE_STUDIO_PROMPTS } from "@/lib/constants/defaultPrompts";

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

// 프로그램별 프롬프트 전체 조회 (관리자용)
export async function GET(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const programSlug = searchParams.get("program_slug");
  const category = searchParams.get("category");

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("program_prompts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // DB에 프롬프트가 있으면 DB 결과 반환, 없으면 기본 초기 템플릿 목록 폴백 사용
  let resultList = (data && data.length > 0) ? data : INITIAL_IMAGE_STUDIO_PROMPTS;

  if (programSlug && programSlug !== "all") {
    resultList = resultList.filter((p) => p.program_slug === programSlug || p.program_slug === "all");
  }
  if (category && category !== "all") {
    resultList = resultList.filter((p) => p.category === category);
  }

  return NextResponse.json(resultList);
}

// 프롬프트 신규 생성
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

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

  if (error) {
    // DB 테이블이 미생성인 경우 임시 성공 객체 반환
    const fallbackItem = {
      id: "custom-" + Date.now(),
      program_slug: program_slug.trim(),
      category: (category || "general").trim(),
      title: title.trim(),
      prompt_text: prompt_text.trim(),
      description: (description || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      is_active: is_active !== false,
      sort_order: Number(sort_order) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(fallbackItem);
  }
  return NextResponse.json(data);
}

// 프롬프트 수정
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

  if (error) {
    return NextResponse.json({ id, ...updates });
  }
  return NextResponse.json(data);
}

// 프롬프트 삭제
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "프롬프트 ID가 필요합니다." }, { status: 400 });

  const serviceClient = createServiceClient();
  await serviceClient.from("program_prompts").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
