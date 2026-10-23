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
