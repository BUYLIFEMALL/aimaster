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

// 관련 프로그램(2026-10-20): 실제로 있는 프로그램 ID만 남긴다. 비어 있으면 사이트 전체 공지.
async function cleanProgramIds(value: unknown): Promise<string[]> {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)))];
  if (!ids.length) return [];
  const { data } = await createServiceClient().from("programs").select("id").in("id", ids);
  return (data ?? []).map((p) => p.id as string);
}

// 공지사항 전체 조회 (비활성 포함)
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("notices")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 공지사항 생성
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { title, content, is_pinned, program_ids } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용은 필수입니다" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("notices")
    .insert({
      title: title.trim(),
      content: content.trim(),
      is_pinned: !!is_pinned,
      is_active: body.is_active === false ? false : true,
      program_ids: await cleanProgramIds(program_ids),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 공지사항 수정
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  // 고칠 수 있는 칸만 받는다(2026-10-20)
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.content === "string") updates.content = body.content.trim();
  if (typeof body.is_pinned === "boolean") updates.is_pinned = body.is_pinned;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if ("program_ids" in body) updates.program_ids = await cleanProgramIds(body.program_ids);

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("notices")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 공지사항 삭제
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("notices").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
