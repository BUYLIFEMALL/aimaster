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

// 카테고리 전체 조회
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("platform_guide_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 카테고리 신설
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "카테고리 이름을 입력해주세요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { data: maxRow } = await serviceClient
    .from("platform_guide_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await serviceClient
    .from("platform_guide_categories")
    .insert({ name, sort_order: nextOrder })
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "이미 있는 카테고리 이름입니다" : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 카테고리 이름 수정 / 순서 이동 — 이름을 바꾸면 이 카테고리에 속한 가이드들의
// category 값도 함께 일괄 변경해서 데이터가 어긋나지 않게 한다(category는 FK가 아니라
// 자유 텍스트라서 이 동기화를 여기서 직접 처리해야 한다).
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { id, name, sort_order } = body;
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();

  const { data: existing } = await serviceClient
    .from("platform_guide_categories")
    .select("name")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof sort_order === "number") updates.sort_order = sort_order;

  const { data, error } = await serviceClient
    .from("platform_guide_categories")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "이미 있는 카테고리 이름입니다" : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (updates.name && updates.name !== existing.name) {
    await serviceClient
      .from("platform_guides")
      .update({ category: updates.name })
      .eq("category", existing.name);
  }

  return NextResponse.json(data);
}

// 카테고리 삭제 — 안에 가이드가 남아있으면 삭제를 막는다(가이드가 카테고리 없이
// 붕 뜨는 걸 방지). 먼저 그 가이드들을 다른 카테고리로 옮기거나 삭제해야 한다.
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { data: category } = await serviceClient
    .from("platform_guide_categories")
    .select("name")
    .eq("id", id)
    .single();
  if (!category) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다" }, { status: 404 });

  const { count } = await serviceClient
    .from("platform_guides")
    .select("id", { count: "exact", head: true })
    .eq("category", category.name);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `이 카테고리에 가이드가 ${count}개 있습니다. 먼저 다른 카테고리로 옮기거나 삭제해주세요.` },
      { status: 400 },
    );
  }

  const { error } = await serviceClient.from("platform_guide_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
