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
  if (!image) return json({ error: "이미지가 올바르지 않습니다." }, 400);
  try {
    return json({ name: await ai.itemName(g.apiKey, image) });
  } catch (e) { return fail(e); }
}
