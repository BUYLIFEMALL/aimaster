import { NextResponse, type NextRequest } from "next/server";
import { fail, guardRoute, json } from "@/lib/aiRoute";
import { generateText } from "@/lib/gemini";
import { adsKeywords, naverSearch } from "@/lib/kw/naver";
import { PING } from "@/lib/kw/prompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 등록한 키가 실제로 동작하는지 가장 작은 호출 1회로 확인한다(본인 키 사용량 1회). */
export async function POST(request: NextRequest) {
  const g = await guardRoute(request);
  if (g instanceof NextResponse) return g;
  const { ctx, body } = g;
  const target = String(body.target ?? "");
  try {
    if (target === "gemini") {
      if (!ctx.gemini) return json({ ok: false, message: "Gemini 키가 아직 등록되지 않았습니다." }, 400);
      await generateText({ apiKey: ctx.gemini, system: PING.system, user: PING.user, schema: { type: "OBJECT", properties: { a: { type: "STRING" } } }, maxOutputTokens: 32 });
      return json({ ok: true, message: "Gemini 키가 정상 동작합니다." });
    }
    if (target === "naver") {
      if (!ctx.naver) return json({ ok: false, message: "네이버 Client ID/Secret을 모두 등록해 주세요." }, 400);
      const r = await naverSearch(ctx.naver, "blog", "블로그", { display: 1 });
      return json({ ok: true, message: `네이버 검색 API가 정상 동작합니다(예시 검색 문서 수 ${r.total.toLocaleString("ko-KR")}건).` });
    }
    if (target === "ads") {
      if (!ctx.ads) return json({ ok: false, message: "검색광고 ACCESS LICENSE·SECRET KEY·CUSTOMER ID를 모두 등록해 주세요." }, 400);
      const list = await adsKeywords(ctx.ads, "블로그");
      return json({ ok: true, message: `검색광고 키워드도구가 정상 동작합니다(연관 키워드 ${list.length}개 조회).` });
    }
    return json({ ok: false, message: "확인할 대상이 올바르지 않습니다." }, 400);
  } catch (e) {
    return fail(e);
  }
}
