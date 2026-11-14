"use server";

// E2-1 등록 정보 도우미 — 연관 키워드·월간 검색수(회원 본인 네이버 검색광고 키, 무료·계정 한도 있음).
// 운영자 키로 대신 부르지 않는다. 키가 없으면 설정 안내만 돌려준다.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getRelatedKeywords, sanitizeSeedKeyword, type RelatedKeyword } from "@/lib/naver/searchAd";
import { DRAFT_MODEL, draftListing, type DraftInput } from "@/lib/ai/claude";
import { cleanTags, cleanText } from "@/lib/listingRules";

export type DraftResult = { titles: string[]; tags: string[]; reason: string; model: string };

const LIMIT = 20;

export async function relatedKeywordsAction(seed: string): Promise<{ keywords?: RelatedKeyword[]; error?: string; needsKey?: boolean }> {
  const user = await requireProgramAccess();
  const cleanSeed = sanitizeSeedKeyword(String(seed ?? "").slice(0, 40));
  if (!cleanSeed) return { error: "기준 키워드를 입력해 주세요." };

  const supabase = await createClient();
  const [apiKey, secretKey, customerId] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_ads_api_key"),
    resolveApiKey(supabase, user.id, "naver_ads_secret_key"),
    resolveApiKey(supabase, user.id, "naver_ads_customer_id"),
  ]);
  if (!apiKey || !secretKey || !customerId) {
    return { needsKey: true, error: "네이버 검색광고 API 키가 없습니다. 설정 화면에서 본인 키 3개를 등록해 주세요." };
  }

  try {
    const related = await getRelatedKeywords({ apiKey, secretKey, customerId }, cleanSeed);
    const keywords = related
      .filter((r) => r.keyword && r.totalMonthlySearches > 0)
      .sort((a, b) => b.totalMonthlySearches - a.totalMonthlySearches)
      .slice(0, LIMIT);
    return { keywords };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "네이버 검색광고 API 호출에 실패했습니다." };
  }
}

// E2-2 상품명·태그 초안 — 회원 본인 Claude 키(provider `anthropic`)로 회원이 누를 때 1번. 운영자 키·다른 제공자로 대신하지 않는다.
export async function draftListingAction(raw: DraftInput): Promise<{ draft?: DraftResult; error?: string; needsKey?: boolean }> {
  const user = await requireProgramAccess();
  const input: DraftInput = {
    market: raw?.market === "naver" ? "naver" : "coupang",
    keyword: cleanText(String(raw?.keyword ?? "")).slice(0, 40),
    topWords: (Array.isArray(raw?.topWords) ? raw.topWords : []).map((w) => cleanText(String(w)).slice(0, 30)).slice(0, 20),
    related: (Array.isArray(raw?.related) ? raw.related : []).slice(0, 20).map((r) => ({
      keyword: cleanText(String(r?.keyword ?? "")).slice(0, 40),
      searches: Math.max(0, Math.round(Number(r?.searches) || 0)),
      usedInSample: Math.max(0, Math.round(Number(r?.usedInSample) || 0)),
    })),
    priceMedian: Number.isFinite(Number(raw?.priceMedian)) && Number(raw?.priceMedian) > 0 ? Math.round(Number(raw?.priceMedian)) : null,
    sampleNames: (Array.isArray(raw?.sampleNames) ? raw.sampleNames : []).map((n) => cleanText(String(n)).slice(0, 120)).filter(Boolean).slice(0, 30),
    note: cleanText(String(raw?.note ?? "")).slice(0, 200),
  };
  if (!input.keyword) return { error: "기준 키워드를 입력해 주세요." };
  if (!input.sampleNames.length) return { error: "표본 상품이 없습니다. 검색 기록을 먼저 열어 주세요." };

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, user.id, "anthropic");
  if (!apiKey) {
    return { needsKey: true, error: "Claude API 키가 없습니다. 메인 사이트 API 설정에서 본인 Claude 키를 한 번 등록하면 모든 프로그램에서 함께 씁니다." };
  }
  try {
    const out = await draftListing(apiKey, input);
    const titles = out.titles.map(cleanText).filter(Boolean);
    if (!titles.length) return { error: "AI가 상품명 초안을 만들지 못했습니다. 다시 시도해 주세요." };
    return { draft: { titles, tags: cleanTags(out.tags), reason: cleanText(out.reason), model: DRAFT_MODEL } };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401) return { needsKey: true, error: "Claude API 키가 올바르지 않습니다. 메인 사이트 API 설정에서 키를 확인해 주세요." };
    if (status === 429) return { error: "Claude 호출 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요." };
    if (status === 402 || status === 400) return { error: "Claude 계정의 크레딧이나 설정을 확인해 주세요(Anthropic 콘솔)." };
    return { error: "AI 초안을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}
