import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateText, NEED_KEY_RESPONSE } from "@/lib/gemini";
import { buildRewritePrompt, clampValues, trimField } from "@/lib/persona/prompt";
import { LIMITS } from "@/lib/persona/types";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) return NextResponse.json(NEED_KEY_RESPONSE, { status: 400 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "다시 쓸 글을 입력해 주세요." }, { status: 400 });
  if (text.length > LIMITS.text) {
    return NextResponse.json({ error: `글이 너무 깁니다. ${LIMITS.text.toLocaleString()}자 이하로 줄여 주세요.` }, { status: 400 });
  }

  const lang = body?.lang === "en" ? "en" : "ko";
  const p = body?.persona;
  const persona =
    p && typeof p === "object"
      ? {
          name: trimField(p.name, LIMITS.name),
          role: trimField(p.role, LIMITS.role),
          context: {
            lore: trimField(p.context?.lore, LIMITS.field),
            voice: trimField(p.context?.voice, LIMITS.field),
            style: trimField(p.context?.style, LIMITS.field),
          },
        }
      : null;

  const prompt = buildRewritePrompt({ text, values: clampValues(body?.values), persona: persona?.name ? persona : null, lang });
  const result = await generateText(apiKey, prompt);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ text: result.text, ms: result.ms, inputChars: text.length, outputChars: result.text.length });
}
