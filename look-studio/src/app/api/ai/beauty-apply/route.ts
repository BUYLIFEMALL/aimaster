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
  const description = typeof g.body.description === "string" ? g.body.description.trim() : "";
  if (!image || description.length < 3) return json({ error: "사진 또는 스타일 설명이 올바르지 않습니다." }, 400);
  const type = g.body.type === "hair" ? "hair" : "makeup";
  const aspect = isAspectRatio(g.body.aspectRatio) ? g.body.aspectRatio : "1:1";
  const model = g.body.model === "pro" ? "pro" : "standard";
  try {
    return json({ image: await ai.beautyApply(g.apiKey, image, type, description, aspect, model) });
  } catch (e) { return fail(e); }
}
