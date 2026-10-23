import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePlain } from "@/lib/gemini";
import { LIMITS, isAction } from "@/lib/we/types";
import { rewritePrompt } from "@/lib/we/prompts";
import { cleanLine, cleanText } from "@/lib/we/util";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 선택한 부분 수정: {selection, action?, instruction?, before?, after?} → {text} */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const { body, apiKey } = g;

  const selection = cleanText(body.selection, LIMITS.selection);
  if (!selection.trim()) return json({ error: "수정할 문장을 먼저 선택해 주세요." }, 400);
  const action = isAction(body.action) ? body.action : null;
  const instruction = cleanLine(body.instruction, LIMITS.instruction);
  if (!action && !instruction) return json({ error: "수정 방식을 선택하거나 지시문을 입력해 주세요." }, 400);
  const before = cleanText(body.before, 600).slice(-600);
  const after = cleanText(body.after, 600).slice(0, 600);
  const context = before || after ? `${before}[[선택 부분]]${after}` : "";

  try {
    const p = rewritePrompt(selection, action, instruction, context);
    const out = await generatePlain({ apiKey, system: p.system, user: p.user, temperature: 0.6, maxOutputTokens: 6144 });
    if (out.truncated) return json({ error: "AI 응답이 중간에 끊겼습니다. 선택 범위를 줄이거나 다시 시도해 주세요." }, 502);
    // 모델이 따옴표·코드 펜스로 감싼 경우만 벗긴다(본문 내용은 건드리지 않는다)
    const text = out.text.replace(/^```[a-z]*\n?|\n?```$/g, "").replace(/^\[\[선택 부분\]\]|\[\[선택 부분\]\]$/g, "").trim();
    if (!text) return json({ error: "AI가 빈 응답을 돌려주었습니다. 다시 시도해 주세요." }, 502);
    return json({ text });
  } catch (e) {
    return fail(e);
  }
}
