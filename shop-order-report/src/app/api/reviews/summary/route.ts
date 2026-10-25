import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// 권한 확인 결과가 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODEL = "gemini-3.5-flash-lite"; // 요약만 하므로 가장 저렴한 글 모델
const MAX_CHARS = 12000;

/** 내 상품 리뷰 요약 — 회원 본인 Gemini 키만 쓴다(운영자 키 폴백 없음). 리뷰 글은 저장하지 않는다. */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as { reviews?: { rating: number | null; text: string }[] } | null;
  const reviews = (body?.reviews ?? []).filter((r) => typeof r?.text === "string" && r.text.trim()).slice(0, 400);
  if (!reviews.length) return NextResponse.json({ error: "요약할 리뷰가 없습니다." }, { status: 400 });

  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", access.user.id)
    .eq("provider", "gemini")
    .maybeSingle();
  const key = (data as { api_key?: string } | null)?.api_key;
  if (!key) return NextResponse.json({ error: "Gemini API 키가 없습니다. 메인 사이트 「API키등록·플랫폼연동」에서 본인 키를 등록해 주세요.", needKey: true }, { status: 400 });

  let text = "";
  for (const r of reviews) {
    const line = `- ${r.rating != null ? `[별점 ${r.rating}] ` : ""}${r.text.replace(/\s+/g, " ").slice(0, 300)}\n`;
    if (text.length + line.length > MAX_CHARS) break;
    text += line;
  }
  const year = new Date().getFullYear();
  const prompt = `기준 연도: ${year}년. 아래는 판매자 본인 상품의 구매 리뷰입니다. 판매자가 바로 고칠 수 있게 한국어로 정리하세요.
형식(제목 그대로, 각 3줄 이내, 리뷰에 없는 내용은 지어내지 말 것):
1. 좋다는 점
2. 불만·개선할 점(많이 나온 순)
3. 상세페이지·포장·응대에서 바꿀 것 제안
리뷰:
${text}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const status = res.status;
      const msg = status === 400 || status === 403 ? "Gemini 키가 올바르지 않거나 사용이 막혀 있습니다." : status === 429 ? "Gemini 사용 한도에 걸렸습니다. 잠시 뒤 다시 해 주세요." : `Gemini 호출 실패(${status})`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const json = await res.json();
    const summary = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    if (!summary) return NextResponse.json({ error: "요약 결과가 비어 있습니다. 다시 시도해 주세요." }, { status: 502 });
    return NextResponse.json({ summary, model: MODEL, used: reviews.length });
  } catch {
    return NextResponse.json({ error: "Gemini 응답이 늦어 멈췄습니다. 리뷰 수를 줄여 다시 해 주세요." }, { status: 504 });
  }
}
