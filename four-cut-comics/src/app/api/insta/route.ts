import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { AiError, generateText } from "@/lib/gemini";
import { buildInstaPrompt } from "@/lib/comic/prompt";
import { extractJson } from "@/lib/comic/script";
import { normalizeInsta } from "@/lib/comic/extras";
import { parseInstaRequest } from "@/lib/comic/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const INSTA_SCHEMA = {
  type: "OBJECT",
  properties: { caption: { type: "STRING" }, hashtags: { type: "ARRAY", minItems: 5, maxItems: 10, items: { type: "STRING" } } },
  required: ["caption", "hashtags"],
};

/** 완성된 대본으로 인스타그램 게시 문구·해시태그. 본인 Gemini 키 1회 호출, 저장하지 않는다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, 60_000);
  if (g instanceof NextResponse) return g;
  const parsed = parseInstaRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  try {
    const prompt = buildInstaPrompt({ ...parsed.value, year: new Date().getFullYear() });
    const text = await generateText({ apiKey: g.apiKey, prompt, json: true, schema: INSTA_SCHEMA });
    const copy = normalizeInsta(extractJson(text));
    if (!copy) throw new AiError("badjson");
    return json({ copy });
  } catch (e) {
    return fail(e);
  }
}
