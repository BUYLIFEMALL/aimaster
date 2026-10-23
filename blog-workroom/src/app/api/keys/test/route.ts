import { NextResponse, type NextRequest } from "next/server";
import { adsAuth, fail, guard, json, loadSettings, naverAuth } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { testKey } from "@/lib/ai";
import { adsKeywords, naverSearch } from "@/lib/naver";
import { DEFAULT_MODEL } from "@/lib/models";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

// 연결 확인: 회원 본인 키로 가장 작은 요청 한 번
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const target = g.body.target;
    if (target === "openai" || target === "gemini") {
      const key = (await getUserApiKeys(g.userId, [target]))[target];
      if (!key) throw new UserError(400, "먼저 키를 등록해 주세요.");
      const s = await loadSettings(g.userId);
      const model = s.provider === target ? s.model : DEFAULT_MODEL[target];
      await testKey(target, key, model);
      return json({ ok: true, message: `본인 ${target === "openai" ? "OpenAI" : "Gemini"} 키로 ${model} 모델 연결을 확인했습니다.` });
    }
    if (target === "naver") {
      const r = await naverSearch(await naverAuth(g.userId), "blog", "블로그", { display: 1 });
      return json({ ok: true, message: `네이버 검색 API 연결을 확인했습니다(블로그 문서 ${r.total.toLocaleString("ko-KR")}건 조회).` });
    }
    if (target === "ads") {
      const r = await adsKeywords(await adsAuth(g.userId), "블로그");
      return json({ ok: true, message: `네이버 검색광고 API 연결을 확인했습니다(연관 검색어 ${r.length}개 조회).` });
    }
    throw new UserError(400, "확인할 연결을 선택해 주세요.");
  } catch (e) { return fail(e); }
}
