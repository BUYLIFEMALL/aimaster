import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateText, NEED_KEY_RESPONSE } from "@/lib/gemini";
import { buildPersonaPrompt, parsePersonaJson, trimField } from "@/lib/persona/prompt";
import { LIMITS } from "@/lib/persona/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) return NextResponse.json(NEED_KEY_RESPONSE, { status: 400 });

  const body = await req.json().catch(() => null);
  const name = trimField(body?.name, LIMITS.name);
  const role = trimField(body?.role, LIMITS.role);
  if (!name || !role) return NextResponse.json({ error: "이름과 역할을 먼저 입력해 주세요." }, { status: 400 });

  const result = await generateText(apiKey, buildPersonaPrompt({ name, role, lang: body?.lang === "en" ? "en" : "ko" }), true);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const parsed = parsePersonaJson(result.text);
  if (!parsed) return NextResponse.json({ error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  return NextResponse.json({ persona: parsed });
}
