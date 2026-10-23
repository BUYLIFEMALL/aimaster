import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generatePortrait } from "@/lib/gemini";
import { buildPrompt } from "@/lib/portrait/prompt";
import { MAX_IMAGE_B64, parseGenerateRequest } from "@/lib/portrait/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/**
 * 참조 사진 1장 + 촬영 옵션 id → 인물 사진 1장.
 * 회원 본인 Gemini 키로만 호출하고, 사진·결과는 서버에 저장하지 않는다(요청 처리 후 폐기).
 * 프롬프트는 클라이언트가 보낸 옵션 id로 서버가 조립한다(임의 문장 주입 불가).
 */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, MAX_IMAGE_B64 + 4_000);
  if (g instanceof NextResponse) return g;
  const parsed = parseGenerateRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const r = parsed.value;
  const prompt = buildPrompt(r.prompt);
  if (!prompt) return json({ error: "촬영 옵션이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요." }, 400);
  try {
    const out = await generatePortrait({
      apiKey: g.apiKey, base64: r.image.data, mimeType: r.image.mimeType, prompt, aspect: r.aspect, resolution: r.resolution, level: r.model,
    });
    return json({ image: { data: out.data, mimeType: out.mimeType }, model: out.model });
  } catch (e) {
    return fail(e);
  }
}
