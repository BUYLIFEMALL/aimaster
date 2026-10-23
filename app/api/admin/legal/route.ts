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

// 약관/정책 문서 전체 조회 (이용약관/개인정보처리방침/환불정책 3건)
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("legal_documents")
    .select("*")
    .order("slug", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 약관/정책 문서 수정 (slug 기준, 새 문서 생성은 지원하지 않음 — 3종 고정)
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { slug, title, content } = body;
  if (!slug) return NextResponse.json({ error: "slug 필요" }, { status: 400 });
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용은 필수입니다" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("legal_documents")
    .update({ title: title.trim(), content: content.trim() })
    .eq("slug", slug)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
