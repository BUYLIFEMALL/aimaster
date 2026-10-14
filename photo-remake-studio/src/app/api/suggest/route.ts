import { NextResponse, type NextRequest } from "next/server";
import { guardAi, json, fail } from "@/lib/aiRoute";
import { validateRequest, InputError } from "@/lib/remake/validation";
import { readImage } from "@/lib/remake/imageProcessing";
import { generateSuggestion } from "@/lib/gemini";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 240;
export async function POST(request: NextRequest) {
  try { const g = await guardAi(request); if (g instanceof NextResponse) return g; const x = validateRequest(g.body); if (x.mode !== "compose") throw new InputError("사물 합성에서만 AI 제안을 사용할 수 있습니다."); await Promise.all([x.base, ...x.objects].map(readImage)); return json({ prompt: await generateSuggestion(g.apiKey, x) }); }
  catch (e) { return fail(e); }
}
