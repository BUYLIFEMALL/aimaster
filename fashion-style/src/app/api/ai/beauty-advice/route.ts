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
  const image = validateImage(g.body.image);
  if (!image) return json({ error: "사진이 올바르지 않습니다." }, 400);
  const model = g.body.model === "pro" ? "pro" : "standard";
  const lang = g.body.lang === "en" ? "en" : "ko";
  try {
    return json({ advice: await ai.beautyAdvice(g.apiKey, image, lang, model) });
  } catch (e) { return fail(e); }
}
