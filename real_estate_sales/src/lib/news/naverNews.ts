import "server-only";
import type { RawNews } from "./radarCore";

// 네이버 뉴스 검색(RQ-C, 2026-11-09). 호출 방식은 blog-keyword/src/lib/kw/naver.ts naverSearch와 같다:
// 2026-07-31부터 신규 키는 NAVER API HUB → HUB 먼저, 401·403·404면 옛 개발자센터 주소로 한 번 더. 회원 본인 키만(운영자 키 폴백 없음).
const HUB_NEWS = "https://naverapihub.apigw.ntruss.com/search/v1/news";
const LEGACY_NEWS = "https://openapi.naver.com/v1/search/news.json";
const FALLBACK = new Set([401, 403, 404]);
const TIMEOUT_MS = 10_000;

export interface NaverAuth { clientId: string; clientSecret: string }

export class NaverNewsError extends Error {
  constructor(public code: "auth" | "quota" | "http" | "network", message: string) { super(message); }
}

const stripHtml = (s: string | undefined) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

async function call(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    throw new NaverNewsError("network", "네이버 서버에 연결하지 못했습니다.");
  }
}

/** 최신순 뉴스 display건(최대 100). 실패하면 NaverNewsError */
export async function searchNaverNews(auth: NaverAuth, query: string, display = 20): Promise<RawNews[]> {
  const qs = `?query=${encodeURIComponent(query)}&display=${Math.min(100, Math.max(1, display))}&start=1&sort=date`;
  let r = await call(`${HUB_NEWS}${qs}`, { "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret });
  if (!r.ok && FALLBACK.has(r.status)) {
    r = await call(`${LEGACY_NEWS}${qs}`, { "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret });
  }
  if (r.status === 401 || r.status === 403) throw new NaverNewsError("auth", "네이버 검색 키 인증에 실패했습니다. 등록한 Client ID/Secret과 검색 API 사용 설정을 확인해 주세요.");
  if (r.status === 429) throw new NaverNewsError("quota", "네이버 검색 하루 한도를 넘었습니다.");
  if (!r.ok) throw new NaverNewsError("http", `네이버 뉴스 검색 실패(${r.status})`);
  let data: { items?: RawNews[] };
  try { data = JSON.parse(r.text); } catch { throw new NaverNewsError("http", "네이버 응답을 해석하지 못했습니다."); }
  return (data.items ?? []).map((it) => ({ ...it, title: stripHtml(it.title), description: stripHtml(it.description) }));
}
