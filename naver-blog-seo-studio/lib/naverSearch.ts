import "server-only";

// BLC-08a (2026-10-22): 네이버 블로그·뉴스 검색 — blog-workroom/src/lib/naver.ts의 naverSearch 사본(블로그·뉴스만).
// 회원 본인 Client ID/Secret만 쓴다. API HUB를 먼저 시도하고 인증/미가입류(401/403/404)일 때만 구방식으로 폴백한다.
const HUB_SEARCH = "https://naverapihub.apigw.ntruss.com/search/v1";
const LEGACY_SEARCH = "https://openapi.naver.com/v1/search";
const FALLBACK = new Set([401, 403, 404]);
const TIMEOUT_MS = 12_000;

export interface NaverAuth { clientId: string; clientSecret: string }
export interface NaverItem { title: string; link: string; description: string; pubDate?: string; bloggername?: string; originallink?: string }

const stripHtml = (value: unknown) => String(value ?? "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();

async function call(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    throw new Error("네이버 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function naverSearch(auth: NaverAuth, type: "blog" | "news", query: string, display = 10): Promise<NaverItem[]> {
  const qs = `?query=${encodeURIComponent(query)}&display=${Math.min(100, Math.max(1, display))}&start=1&sort=sim`;
  let r = await call(`${HUB_SEARCH}/${type}${qs}`, { "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret });
  if (!r.ok && FALLBACK.has(r.status)) r = await call(`${LEGACY_SEARCH}/${type}.json${qs}`, { "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret });
  const what = type === "blog" ? "네이버 블로그 검색" : "네이버 뉴스 검색";
  if (r.status === 401 || r.status === 403) throw new Error(`${what} 인증에 실패했습니다. 등록한 네이버 Client ID/Secret과 사용 API 설정(검색)을 확인해 주세요.`);
  if (r.status === 429) throw new Error(`${what} 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.`);
  if (!r.ok) throw new Error(`${what} 호출에 실패했습니다(${r.status}).`);
  let data: { items?: NaverItem[] };
  try { data = JSON.parse(r.text); } catch { throw new Error("네이버 응답을 해석하지 못했습니다."); }
  return (data.items ?? []).map((it) => ({ ...it, title: stripHtml(it.title), description: stripHtml(it.description), bloggername: stripHtml(it.bloggername) }));
}
