import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberGeminiKey } from "@/lib/serverAi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.27: 키 원문을 브라우저로 돌려주지 않는다(예전엔 GET이 키를 내려보내 브라우저 localStorage에 저장됨). 등록 여부만 알려 준다.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ hasKey: false, error: access.error }, { status: access.status });
  return NextResponse.json({ hasKey: Boolean(await getMemberGeminiKey(access.user.id)) });
}

// 키 확인(test: true면 저장하지 않음) 및 저장. 확인은 서버에서 머리글로 보내 키가 주소·브라우저 기록에 남지 않게 한다.
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { apiKey, test } = await req.json().catch(() => ({}));
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "유효한 API 키가 아닙니다." }, { status: 400 });
  }
  const key = apiKey.trim();

  if (test) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] }),
    }).catch(() => null);
    if (!res) return NextResponse.json({ error: "Gemini 서버에 연결하지 못했습니다." }, { status: 502 });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json({ error: errorData?.error?.message || `HTTP ${res.status}` }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await createAdminClient().from("user_api_keys").upsert(
    {
      user_id: access.user.id,
      provider: "gemini",
      api_key: key,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
