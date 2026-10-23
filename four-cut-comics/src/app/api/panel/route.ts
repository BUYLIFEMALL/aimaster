import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateImage } from "@/lib/gemini";
import { buildPanelPrompt } from "@/lib/comic/prompt";
import { MAX_SHEET_B64, MAX_SHEETS, parsePanelRequest } from "@/lib/comic/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // 2026-10-18: Pro 이미지 모델 시간 초과 방지(60 → 300초)

/** 컷 그림 1장. 캐릭터 시트를 참고 이미지로 첨부해 같은 인물이 나오게 한다. 본인 Gemini 키 1회 호출. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, MAX_SHEET_B64 * MAX_SHEETS + 20_000);
  if (g instanceof NextResponse) return g;
  const parsed = parsePanelRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const v = parsed.value;
  const prompt = buildPanelPrompt({ description: v.description, styleId: v.styleId, hasSheets: v.sheets.length > 0, aspect: v.aspect });
  if (!prompt) return json({ error: "그림 스타일이 올바르지 않습니다." }, 400);
  try {
    const image = await generateImage({ apiKey: g.apiKey, model: v.model, prompt, refs: v.sheets, aspectRatio: v.aspect });
    return json({ image });
  } catch (e) {
    return fail(e);
  }
}
