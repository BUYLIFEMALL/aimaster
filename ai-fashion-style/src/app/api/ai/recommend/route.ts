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
  const situation = cleanSituation(g.body.situation);
  const kind = g.body.kind === "accessory" ? "accessory" : "outfit";
  const model = g.body.model === "pro" ? "pro" : "standard";
  if (!image) return json({ error: "인물 사진이 올바르지 않습니다. PNG·JPG·WEBP 사진을 다시 올려 주세요." }, 400);
  if (!situation) return json({ error: "어떤 상황(예: 면접, 주말 데이트)인지 입력해 주세요." }, 400);
  try {
    return json({ suggestions: await ai.recommend(g.apiKey, image, situation, kind, model) });
  } catch (e) { return fail(e); }
}
