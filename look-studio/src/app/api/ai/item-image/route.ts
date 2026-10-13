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
  const prompt = typeof g.body.prompt === "string" ? g.body.prompt.trim() : "";
  if (prompt.length < 3) return json({ error: "아이템 설명이 비어 있습니다." }, 400);
  try {
    return json({ image: await ai.itemImage(g.apiKey, prompt) });
  } catch (e) { return fail(e); }
}
