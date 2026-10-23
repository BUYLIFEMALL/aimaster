// 네이버 연예·스포츠·경제 랭킹 글감 수집.
// 연예·스포츠는 네이버 화면이 쓰는 공개 JSON(비공식)을 고정 주소로만 읽는다.
// 기사 이미지는 저장·재사용하지 않고 제목·본문 텍스트만 글감 정리에 넘긴다.

export type RankingKind = "entertainment" | "sports" | "economy";

export const RANKING_SOURCES: Record<RankingKind, { label: string; listUrl: string }> = {
  entertainment: { label: "연예 많이 본 뉴스", listUrl: "https://api-gw.entertain.naver.com/ranking/most-viewed" },
  sports: { label: "스포츠 인기 뉴스", listUrl: "https://api-gw.sports.naver.com/news/articles/popular" },
  economy: { label: "경제 최신 뉴스", listUrl: "https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101" },
};

const ALLOWED_HOSTS = new Set(["api-gw.entertain.naver.com", "api-gw.sports.naver.com", "news.naver.com", "n.news.naver.com"]);
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export interface RankingArticle { title: string; url: string; text: string }
type FetchText = (url: string) => Promise<string>;

export function isRankingKind(value: unknown): value is RankingKind {
  return value === "entertainment" || value === "sports" || value === "economy";
}

const ID = /^\d{1,12}$/;

async function defaultFetchText(url: string): Promise<string> {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) throw new Error("허용되지 않은 랭킹 주소입니다.");
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://m.naver.com/" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`랭킹을 불러오지 못했습니다. (${res.status})`);
  return res.text();
}

export function htmlToText(html: string): string {
  return String(html || "")
    .replace(/<(script|style|figure|table)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/** 랭킹 목록 JSON에서 기사 식별자(언론사·기사 번호)와 제목을 순위대로 뽑는다. */
export function parseRankingList(kind: "entertainment" | "sports", json: unknown): { oid: string; aid: string; title: string }[] {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const rows = (kind === "entertainment" ? result.articles : result.newsList) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(rows)) throw new Error("랭킹 형식이 바뀌어 읽지 못했습니다.");
  return rows.map(row => ({
    oid: String(kind === "entertainment" ? row.officeId : row.oid ?? ""),
    aid: String(kind === "entertainment" ? row.articleId : row.aid ?? ""),
    title: String(row.title ?? "").trim(),
  })).filter(item => ID.test(item.oid) && ID.test(item.aid) && item.title);
}

/** 기사 JSON에서 제목·본문 텍스트만 꺼낸다(이미지 제외). */
export function parseArticleJson(json: unknown): { title: string; text: string } {
  const article = (json as { result?: { articleInfo?: { article?: Record<string, unknown> } } })?.result?.articleInfo?.article;
  if (!article) throw new Error("기사 형식이 바뀌어 읽지 못했습니다.");
  return { title: String(article.title ?? "").trim(), text: htmlToText(String(article.content ?? "")) };
}

/** 경제 목록 HTML에서 기사 주소를 위에서부터(최신순) 중복 없이 뽑는다. */
export function parseEconomyLinks(html: string): string[] {
  const seen = new Set<string>();
  for (const match of html.matchAll(/https:\/\/n\.news\.naver\.com\/mnews\/article\/(\d{1,12})\/(\d{1,12})/g)) {
    seen.add(`https://n.news.naver.com/mnews/article/${match[1]}/${match[2]}`);
  }
  return [...seen];
}

function extractNewsBody(html: string): { title: string; text: string } {
  const title = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "";
  const body = html.match(/<article[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? "";
  return { title: htmlToText(title), text: htmlToText(body) };
}

/** 랭킹 상위 기사 limit개(기본 5)의 제목·본문을 가져온다. 본문이 짧은 기사는 건너뛴다. */
export async function fetchRankingArticles(kind: RankingKind, limit = 5, fetchText: FetchText = defaultFetchText): Promise<RankingArticle[]> {
  const count = Math.max(1, Math.min(8, limit));
  const listRaw = await fetchText(RANKING_SOURCES[kind].listUrl);
  let targets: { url: string; read: () => Promise<{ title: string; text: string }> }[];

  if (kind === "economy") {
    targets = parseEconomyLinks(listRaw).slice(0, count * 2).map(url => ({ url, read: async () => extractNewsBody(await fetchText(url)) }));
  } else {
    const host = kind === "entertainment" ? "api-gw.entertain.naver.com" : "api-gw.sports.naver.com";
    targets = parseRankingList(kind, JSON.parse(listRaw)).slice(0, count * 2).map(item => ({
      url: `https://n.news.naver.com/article/${item.oid}/${item.aid}`,
      read: async () => parseArticleJson(JSON.parse(await fetchText(`https://${host}/news/article/${item.oid}/${item.aid}`))),
    }));
  }

  const articles: RankingArticle[] = [];
  for (const target of targets) {
    if (articles.length >= count) break;
    try {
      const { title, text } = await target.read();
      if (title && text.length >= 100) articles.push({ title, url: target.url, text: text.slice(0, 2500) });
    } catch {
      // 한 기사 실패는 건너뛰고 다음 기사를 읽는다.
    }
  }
  if (!articles.length) throw new Error(`${RANKING_SOURCES[kind].label}를 불러오지 못했습니다. 잠시 뒤 다시 시도하거나 URL 수집을 이용해 주세요.`);
  return articles;
}

export interface RankingHealth { kind: RankingKind; ok: boolean; count: number; error?: string }

/** 랭킹 목록만 읽어 정상 여부를 확인한다(기사 본문·AI 호출 없음, 무료). */
export async function checkRankingHealth(fetchText: FetchText = defaultFetchText): Promise<RankingHealth[]> {
  const kinds: RankingKind[] = ["entertainment", "sports", "economy"];
  return Promise.all(kinds.map(async (kind) => {
    try {
      const raw = await fetchText(RANKING_SOURCES[kind].listUrl);
      const count = kind === "economy" ? parseEconomyLinks(raw).length : parseRankingList(kind, JSON.parse(raw)).length;
      return count > 0 ? { kind, ok: true, count } : { kind, ok: false, count, error: "기사 목록이 비어 있습니다." };
    } catch (error) {
      return { kind, ok: false, count: 0, error: error instanceof Error ? error.message : "확인 실패" };
    }
  }));
}
