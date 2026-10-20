import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { makeSeoStrategies } from "@/lib/seo/seoStrategy";
import { cleanDocText } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

/** 2026-10-20 병합 D: 대본·아이디어 → A/B/C SEO 전략(제목·설명·해시태그·스튜디오 태그·고정 댓글). 로그인·권한·회원 본인 키는 guardAi. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const doc = cleanDocText(g.body.script);
  if (doc.text.length < 10) return json({ error: "대본이나 영상 아이디어를 10자 이상 입력해 주세요." }, 400);
  try {
    return json({ result: await makeSeoStrategies(g.apiKey, doc.text), truncated: doc.truncated });
  } catch (e) {
    return fail(e);
  }
}
