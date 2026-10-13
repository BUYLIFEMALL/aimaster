import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { validateImage } from "@/lib/look/validate";
import { isAspectRatio } from "@/lib/look/aspect";
import { cleanSituation } from "@/lib/look/prompts";
import * as ai from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const base = validateImage(g.body.base);
  const item = validateImage(g.body.item);
  if (!base || !item) return json({ error: "사진 또는 아이템 이미지가 올바르지 않습니다." }, 400);
  const aspect = isAspectRatio(g.body.aspectRatio) ? g.body.aspectRatio : "1:1";
  const background = g.body.background === "match" ? "match" : "keep";
  const model = g.body.model === "pro" ? "pro" : "standard";
  const situation = cleanSituation(g.body.situation) || undefined;
  try {
    return json({ image: await ai.tryOn(g.apiKey, base, item, aspect, background, situation, model) });
  } catch (e) { return fail(e); }
}
