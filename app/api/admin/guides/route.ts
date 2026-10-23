import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

// 플랫폼 가이드 전체 조회 (비활성 포함)
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("platform_guides")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 플랫폼 가이드 생성
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { category, title, content, sort_order } = body;

  if (!category?.trim() || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "카테고리, 제목, 내용은 필수입니다" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("platform_guides")
    .insert({
      category: category.trim(),
      title: title.trim(),
      content,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 플랫폼 가이드 수정
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("platform_guides")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 플랫폼 가이드 삭제
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("platform_guides").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
