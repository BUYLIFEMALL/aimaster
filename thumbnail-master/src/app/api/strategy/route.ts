import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import * as ai from "@/lib/gemini";
import { cleanDocText, cleanInputs, missingInputs } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

/** 전략(A/B 문구·이미지 프롬프트) 생성·다시 생성. 이전 메인 문구를 avoid로 보내면 다른 안을 만든다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const inputs = cleanInputs(g.body.inputs);
  const missing = missingInputs(inputs);
  if (missing) return json({ error: missing }, 400);
  const doc = cleanDocText(g.body.docText);
  const avoid = Array.isArray(g.body.avoid)
    ? g.body.avoid.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 60)).slice(0, 4)
    : undefined;
  try {
    return json({ strategy: await ai.makeStrategy(g.apiKey, inputs, doc.text, avoid), docTruncated: doc.truncated });
  } catch (e) { return fail(e); }
}
