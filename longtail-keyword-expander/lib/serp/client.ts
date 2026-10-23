import "server-only";
import type { SerpEngine } from "@/types/database.types";

/**
 * 이 도구는 개별 SERP 결과를 DB에 저장하지 않는다(경쟁사 키워드 분석과 다른 점) — GPT에게
 * "이 키워드로 검색하면 어떤 내용이 보이는지" 맥락을 넘겨주는 게 목적이라, 카테고리별
 * 제목/요약 텍스트만 뽑아서 프롬프트용 문자열로 정리한다. 원본 Make.com 시나리오가 Google
 * Docs에 <web_section>...</web_section> 식으로 쌓던 것과 같은 역할을 텍스트 블록으로 대체.
 */

interface RawCategoryItem {
  title?: string | null;
  snippet?: string | null;
  description?: string | null;
  query?: string | null;
  question?: string | null;
}

export interface SerpContext {
  searchId: string | null;
  contextText: string;
}

async function fetchSerpRaw(engine: SerpEngine, keyword: string, apiKey: string): Promise<any> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", engine);
  if (engine === "naver") {
    url.searchParams.set("query", keyword);
  } else {
    url.searchParams.set("q", keyword);
    url.searchParams.set("google_domain", "google.com");
    url.searchParams.set("hl", "ko");
    url.searchParams.set("num", "30");
  }
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SerpApi 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json();
}

function formatItems(label: string, items: RawCategoryItem[] | undefined): string {
  if (!items || items.length === 0) return "";
  const lines = items
    .slice(0, 20)
    .map((it) => {
      const title = it.title ?? it.question ?? it.query ?? "";
      const desc = it.snippet ?? it.description ?? "";
      return desc ? `- ${title} : ${desc}` : `- ${title}`;
    })
    .filter((line) => line !== "- ");
  if (lines.length === 0) return "";
  return `[${label}]\n${lines.join("\n")}\n`;
}

/** 네이버: 원본 시나리오가 수집하던 6개 카테고리(광고 제외)를 그대로 텍스트로 정리한다. */
function buildNaverContextText(json: any): string {
  return [
    formatItems("자연 검색결과", json.web_results),
    formatItems("연관검색어", json.related_results),
    formatItems("뉴스", json.news_results),
    formatItems("쇼핑", json.shopping_results),
    formatItems("동영상", json.inline_videos_results),
    formatItems("인플루언서", json.influencer_results),
  ]
    .filter(Boolean)
    .join("\n");
}

/** 구글: 네이버처럼 6종 세분류는 없어서, 자연 검색결과/PAA/연관검색어 3종으로 정리한다. */
function buildGoogleContextText(json: any): string {
  const relatedSearches: RawCategoryItem[] = (json.related_searches ?? []).map((r: any) => ({ title: r.query }));
  return [
    formatItems("자연 검색결과", json.organic_results),
    formatItems("사람들이 함께 묻는 질문", json.related_questions),
    formatItems("연관검색어", relatedSearches),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function fetchSerpContext(engine: SerpEngine, keyword: string, apiKey: string): Promise<SerpContext> {
  const json = await fetchSerpRaw(engine, keyword, apiKey);
  const contextText = engine === "naver" ? buildNaverContextText(json) : buildGoogleContextText(json);
  return {
    searchId: json.search_metadata?.id ?? null,
    contextText: contextText || "(검색결과를 찾지 못했습니다)",
  };
}
