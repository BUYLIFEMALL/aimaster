import { NextResponse, type NextRequest } from "next/server";
import { guardAi, json, fail } from "@/lib/aiRoute";
import { validateRequest } from "@/lib/remake/validation";
import { readImage, prepareResult } from "@/lib/remake/imageProcessing";
import { generateRemake } from "@/lib/gemini";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 240;
export async function POST(request: NextRequest) {
  try {
    const g = await guardAi(request); if (g instanceof NextResponse) return g;
    const x = validateRequest(g.body); await Promise.all([x.base, ...x.objects].map(readImage));
    const bytes = await generateRemake(g.apiKey, x);
    const result = await prepareResult(bytes, x.mode === "restore" ? x.options.upscale : 1);
    return json({ ...result, mode: x.mode, model: x.model, createdAt: Date.now() });
  } catch (e) { return fail(e); }
}
