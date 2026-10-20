import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { sanitizeStyle } from "@/lib/cardnews/sanitize";
import { createClient } from "@/lib/cardnews/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_TEMPLATES = 20;

/** 내 디자인 템플릿 목록(RLS + user_id 한정) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cns_templates")
    .select("id, name, style, created_at")
    .eq("user_id", gate.auth.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_TEMPLATES);
  if (error) return NextResponse.json({ error: "템플릿을 불러오지 못했습니다." }, { status: 500 });

  // 저장된 값도 꺼낼 때 다시 정리해서 내보낸다(옛 형식·잘못된 값 방어).
  const templates = (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string, style: sanitizeStyle(row.style) }));
  return NextResponse.json({ templates });
}

/** 현재 디자인 스타일을 템플릿으로 저장 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "템플릿 이름을 입력해주세요." }, { status: 400 });

  const supabase = await createClient();
  const { count } = await supabase.from("cns_templates").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_TEMPLATES) {
    return NextResponse.json({ error: `템플릿은 최대 ${MAX_TEMPLATES}개까지 저장할 수 있습니다. 쓰지 않는 템플릿을 삭제해주세요.` }, { status: 400 });
  }

  const style = sanitizeStyle(body.style);
  const { data, error } = await supabase.from("cns_templates").insert({ user_id: userId, name, style }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "템플릿을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ id: data.id, name, style });
}
