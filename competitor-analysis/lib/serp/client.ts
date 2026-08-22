import "server-only";

export interface SerpSearchParams {
  keyword: string;
  location: string;
  googleDomain: string;
  lang: string;
}

export interface SerpResultItem {
  position: number | null;
  resultType: "organic" | "ad" | "paa" | "local";
  title: string | null;
  link: string | null;
  snippet: string | null;
}

export interface SerpSearchResult {
  searchId: string | null;
  totalResults: number | null;
  items: SerpResultItem[];
}

/**
 * ^(?:https?:\/\/)?(?:www\.)?([^\/]+)(?:\/.*)?$ 와 동일한 동작을 하는 도메인 추출.
 * 원본 Make.com 시나리오의 정규식(도메인 추출) 모듈을 그대로 옮김.
 */
export function extractDomain(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)(?:\/.*)?$/);
  return match?.[1] ?? null;
}

/**
 * SerpApi(serpapi.com)의 Google Search 엔진을 호출한다. 원본 Make.com 시나리오는
 * organic_results만 실제로 처리했지만, 여기서는 ads/related_questions(PAA)도 함께
 * 분류해서 반환한다 — 광고는 자본을 들여 경쟁하는 곳, PAA는 콘텐츠 기회를 보여준다.
 */
export async function searchGoogle(params: SerpSearchParams, apiKey: string): Promise<SerpSearchResult> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", params.keyword);
  url.searchParams.set("location", params.location);
  url.searchParams.set("google_domain", params.googleDomain);
  url.searchParams.set("hl", params.lang);
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SerpApi 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();

  const items: SerpResultItem[] = [];

  for (const r of json.organic_results ?? []) {
    items.push({
      position: r.position ?? null,
      resultType: "organic",
      title: r.title ?? null,
      link: r.link ?? null,
      snippet: r.snippet ?? null,
    });
  }
  for (const r of json.ads ?? []) {
    items.push({
      position: r.position ?? null,
      resultType: "ad",
      title: r.title ?? null,
      link: r.link ?? null,
      snippet: r.description ?? null,
    });
  }
  for (const r of json.related_questions ?? []) {
    items.push({
      position: null,
      resultType: "paa",
      title: r.question ?? null,
      link: r.link ?? null,
      snippet: r.snippet ?? null,
    });
  }
  for (const r of json.local_results?.places ?? []) {
    items.push({
      position: r.position ?? null,
      resultType: "local",
      title: r.title ?? null,
      link: r.links?.website ?? null,
      snippet: r.address ?? null,
    });
  }

  return {
    searchId: json.search_metadata?.id ?? null,
    totalResults: json.search_information?.total_results ?? null,
    items,
  };
}
