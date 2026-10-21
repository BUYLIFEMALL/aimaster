import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePlain } from "@/lib/gemini";
import { buildRewritePrompt, clampValues, trimField } from "@/lib/persona/prompt";
import { LIMITS } from "@/lib/persona/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 「🎚️ 문체 바꾸기」(2026-10-21 병합 B — 옛 페르소나 문체 자동화): {text, values, persona?} → {text}
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const { body, apiKey } = g;

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "문체를 바꿀 글이 없습니다." }, 400);
  if (text.length > LIMITS.text) return json({ error: `한 번에 ${LIMITS.text.toLocaleString("ko-KR")}자까지 바꿀 수 있습니다. 부분을 선택해 나눠서 바꿔 주세요.` }, 400);

  const p = body.persona as Record<string, unknown> | null | undefined;
  const ctx = (p?.context ?? {}) as Record<string, unknown>;
  const persona = p && typeof p === "object" && trimField(p.name, LIMITS.name)
    ? {
        name: trimField(p.name, LIMITS.name),
        role: trimField(p.role, LIMITS.role),
        context: { lore: trimField(ctx.lore, LIMITS.field), voice: trimField(ctx.voice, LIMITS.field), style: trimField(ctx.style, LIMITS.field) },
      }
    : null;

  try {
    const prompt = buildRewritePrompt({ text, values: clampValues(body.values as Record<string, unknown>), persona, lang: "ko" });
    const out = await generatePlain({
      apiKey,
      system: "You are a professional Korean writing assistant. Follow the style settings in the user message exactly. If the original uses Markdown (headings, lists, bold, tables, images), keep the same Markdown structure and keep image lines unchanged.",
      user: prompt,
      temperature: 0.8,
      maxOutputTokens: 16384,
    });
    if (out.truncated) return json({ error: "AI 응답이 중간에 끊겼습니다. 길이 값을 낮추거나 부분을 나눠서 바꿔 주세요." }, 502);
    const result = out.text.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
    if (!result) return json({ error: "AI가 빈 응답을 돌려주었습니다. 다시 시도해 주세요." }, 502);
    return json({ text: result });
  } catch (e) {
    return fail(e);
  }
}
