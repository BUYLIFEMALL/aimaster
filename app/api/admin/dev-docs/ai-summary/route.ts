import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/devDocs/admin";
import { resolveApiKey } from "@/lib/apiKeys";
import { summarizeMenu, MAX_INPUT_CHARS } from "@/lib/devDocs/aiSummary";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** POST { tab, label, text } — 지금 보이는 메뉴 글자를 관리자 Claude 키로 정리 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").slice(0, 60);
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "정리할 내용이 없습니다." }, { status: 400 });

  const apiKey = await resolveApiKey(createServiceClient(), auth.userId, "anthropic");
  if (!apiKey) return NextResponse.json({ error: "관리자 계정에 Claude(Anthropic) API 키가 없습니다. API 설정에서 등록해 주세요." }, { status: 400 });

  try {
    const summary = await summarizeMenu(apiKey, label, text);
    return NextResponse.json({ summary, truncated: text.length > MAX_INPUT_CHARS });
  } catch (e) {
    const status = (e as { status?: number }).status;
    console.error("[dev-docs ai-summary]", status ?? "", (e as Error).message?.slice(0, 200));
    const msg = status === 401 ? "Claude API 키가 맞지 않습니다. 키를 확인해 주세요."
      : status === 429 ? "Claude API 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요."
      : (e as Error).message || "AI 정리에 실패했습니다.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
