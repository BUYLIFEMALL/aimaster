import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import * as ai from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const topic = typeof g.body.topic === "string" ? g.body.topic.trim().slice(0, 200) : "";
  if (!topic) return json({ error: "주제를 먼저 입력해 주세요." }, 400);
  try {
    return json(await ai.suggest(g.apiKey, topic));
  } catch (e) { return fail(e); }
}
