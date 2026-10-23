import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePlain } from "@/lib/gemini";
import { buildPersonaPrompt, parsePersonaJson, trimField } from "@/lib/persona/prompt";
import { LIMITS } from "@/lib/persona/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 나만의 페르소나 AI 채우기: {name, role} → {persona: {description, lore, voice, style, values}}
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const { body, apiKey } = g;
  const name = trimField(body.name, LIMITS.name);
  const role = trimField(body.role, LIMITS.role);
  if (!name || !role) return json({ error: "이름과 역할을 먼저 입력해 주세요." }, 400);
  try {
    const out = await generatePlain({ apiKey, system: "Return only one JSON object.", user: buildPersonaPrompt({ name, role, lang: "ko" }), temperature: 0.8, maxOutputTokens: 4096 });
    const parsed = parsePersonaJson(out.text);
    if (!parsed) return json({ error: "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요." }, 502);
    return json({ persona: parsed });
  } catch (e) {
    return fail(e);
  }
}
