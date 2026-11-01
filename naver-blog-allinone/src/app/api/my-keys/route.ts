import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 로그인한 회원 "본인"이 AIMaster 계정(user_api_keys)에 등록해 둔 AI 키를 설정창으로 불러온다.
// 다른 회원·운영자 키는 절대 돌려주지 않으며(user_id 고정), 이 프로그램이 쓰는 4개 공급사만 허용한다.
const PROVIDERS = ["gemini", "openai", "anthropic", "replicate"] as const;

export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", gate.userId)
    .in("provider", [...PROVIDERS]);
  if (error) return NextResponse.json({ error: "등록된 키를 불러오지 못했습니다." }, { status: 500 });

  const keys: Record<string, string | null> = { gemini: null, openai: null, anthropic: null, replicate: null };
  for (const row of data ?? []) {
    if (typeof row.api_key === "string" && row.api_key.trim()) keys[row.provider as string] = row.api_key.trim();
  }
  return NextResponse.json({ keys }, { headers: { "Cache-Control": "no-store" } });
}

// 2026-11-01(블로그 병합 결정 4번): 설정 창에서 입력한 키를 회원 "본인" AIMaster 계정(user_api_keys)에 저장한다.
// 보낸 공급사만 저장하고, 빈 값은 무시한다(계정 키는 다른 프로그램도 함께 쓰므로 여기서 지우지 않는다 — 삭제는 메인 사이트 API 설정).
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  const input = await request.json().catch(() => null) as { keys?: Record<string, unknown> } | null;
  const rows = PROVIDERS.flatMap((provider) => {
    const value = input?.keys?.[provider];
    const key = typeof value === "string" ? value.trim() : "";
    return key && key.length <= 500 && !/\s/.test(key) ? [{ user_id: gate.userId, provider, api_key: key }] : [];
  });
  if (!rows.length) return NextResponse.json({ error: "저장할 API 키를 입력해주세요." }, { status: 400 });

  const { error } = await createAdminClient().from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
  if (error) return NextResponse.json({ error: "API 키를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.map((r) => r.provider) }, { headers: { "Cache-Control": "no-store" } });
}
