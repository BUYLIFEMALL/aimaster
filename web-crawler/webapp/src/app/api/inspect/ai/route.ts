import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { AI_MODEL_OPTIONS } from "@/lib/ai/models";
import { extractListWithAi, InspectAiError, MAX_AI_HTML } from "@/lib/inspect/ai";

export const maxDuration = 120;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 「한 페이지 분석」 AI 목록 정리(2026-10-21 병합 A) — 회원 본인 키(user_api_keys)를 서버에서만 쓴다. 키는 브라우저로 보내지 않는다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json().catch(() => null)) as { url?: unknown; html?: unknown; model?: unknown } | null;
  const option = AI_MODEL_OPTIONS.find((m) => m.value === body?.model);
  if (!option) return NextResponse.json({ error: "AI 모델을 골라 주세요." }, { status: 400 });
  const html = typeof body?.html === "string" ? body.html.slice(0, MAX_AI_HTML) : "";
  if (!html.trim()) return NextResponse.json({ error: "분석할 HTML이 없습니다. 먼저 페이지를 분석해 주세요." }, { status: 400 });
  let targetUrl: string;
  try { targetUrl = new URL(String(body?.url ?? "")).href; } catch { return NextResponse.json({ error: "대상 주소가 올바르지 않습니다." }, { status: 400 }); }

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, option.provider);
  if (!apiKey) return NextResponse.json({ error: "선택한 AI의 본인 API 키가 없습니다. 설정 > API키등록·플랫폼연동에서 등록해 주세요.", code: "no_key" }, { status: 400 });

  try {
    const items = await extractListWithAi({ provider: option.provider, model: option.value, apiKey, targetUrl, html });
    await logProgramUsage({ userId: access.user.id, action: "inspect_ai", metadata: { provider: option.provider, model: option.value, items: items.length } });
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof InspectAiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
