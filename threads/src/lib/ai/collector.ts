import "server-only";
import * as cheerio from "cheerio";

export interface ThreadsCandidateDraft {
  title: string;
  content: string;
  keywords: string[];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 응답 인코딩을 Content-Type 헤더(없으면 <meta charset>)로 감지해서 디코딩한다. */
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIMaster-Threads/1.0)" },
  });
  if (!response.ok) {
    throw new Error(`페이지를 가져오지 못했습니다. (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "";
  let charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  if (!charset) {
    const head = new TextDecoder("utf-8").decode(buffer.slice(0, 2000));
    charset = head.match(/<meta[^>]+charset=["']?([a-zA-Z0-9-]+)/i)?.[1]?.toLowerCase();
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/**
 * 네이버 뉴스처럼 카테고리 페이지가 JS로 렌더링돼서 정적 HTML에 게시글 링크가
 * 없는 경우, 서버가 직접 목록을 렌더링해주는 구버전 URL로 우회한다.
 * 해당하지 않는 사이트는 원래 URL을 그대로 반환한다.
 */
export function rewriteToScrapableListingUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "news.naver.com" || u.hostname === "n.news.naver.com") {
      const m = u.pathname.match(/^\/(?:breakingnews\/)?section\/(\d+)(?:\/(\d+))?$/);
      if (m) {
        const legacy = new URL("https://news.naver.com/main/list.naver");
        legacy.searchParams.set("mode", "LSD");
        legacy.searchParams.set("mid", "sec");
        legacy.searchParams.set("sid1", m[1]);
        if (m[2]) legacy.searchParams.set("sid2", m[2]);
        return legacy.toString();
      }
    }
  } catch {
    // URL 파싱 실패 시 원본 그대로 진행
  }
  return rawUrl;
}

// 뉴스/블로그 사이트에서 흔히 쓰이는 본문 컨테이너들. 순서대로 시도해서
// 내비게이션/광고 등 잡음 없이 실제 기사 본문만 뽑아낸다.
const MAIN_CONTENT_SELECTORS = [
  "#dic_area", // 네이버 뉴스
  "#articeBody",
  "#article_body",
  '[itemprop="articleBody"]',
  "article",
  ".article-body",
  ".article_body",
  ".post-content",
  ".entry-content",
];

/** HTTP 방식: 주어진 URL의 페이지 본문 텍스트를 추출한다. */
export async function fetchUrlText(url: string, maxChars = 8000): Promise<string> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside").remove();

  let text = "";
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 100) {
      text = el.text();
      break;
    }
  }
  if (!text) text = $("body").text();

  return text.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export interface ArticleLink {
  url: string;
  title: string;
}

const NON_ARTICLE_EXT = /\.(css|js|jpe?g|png|gif|svg|ico|webp|woff2?|mp4|pdf|zip)(\?|$)/i;

// 목록 페이지에 흔히 섞여 있는 필터/탭 링크(실제 게시글이 아님)를 걸러낸다.
const NON_ARTICLE_LINK_TEXT = /^(신문게재기사만|동영상기사|전체기사|더보기|이전|다음|맨위로)$/;

// 뉴스 사이트는 목록 페이지(news.naver.com)와 기사 페이지(n.news.naver.com)의
// 서브도메인이 다른 경우가 흔해서, 서브도메인이 아니라 등록 도메인 단위로 비교한다.
function registrableDomain(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}

/**
 * 카테고리/목록 페이지(예: 네이버 뉴스 섹션)의 HTML에서 개별 게시글로 보이는
 * 링크를 뽑아낸다. 기사 URL은 대체로 경로에 긴 숫자(기사 ID)를 포함한다는
 * 점을 휴리스틱으로 사용한다 — 완벽하진 않지만 뉴스/블로그형 목록 페이지에는 대체로 잘 맞는다.
 */
export function extractArticleLinks(html: string, pageUrl: string, maxLinks = 30): ArticleLink[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: ArticleLink[] = [];

  $("a[href]").each((_, el) => {
    if (results.length >= maxLinks) return;
    const rawHref = $(el).attr("href");
    if (!rawHref || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("#")) {
      return;
    }

    let absolute: string;
    try {
      absolute = new URL(rawHref, pageUrl).toString();
    } catch {
      return;
    }
    if (absolute === pageUrl || seen.has(absolute)) return;

    let u: URL;
    try {
      u = new URL(absolute);
    } catch {
      return;
    }
    if (registrableDomain(u.hostname) !== registrableDomain(base.hostname)) return;
    if (NON_ARTICLE_EXT.test(u.pathname)) return;
    if (!/\d{5,}/.test(u.pathname)) return;

    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    if (linkText.length < 4 || NON_ARTICLE_LINK_TEXT.test(linkText)) return;

    seen.add(absolute);
    results.push({ url: absolute, title: linkText.slice(0, 200) });
  });

  return results;
}

export function pickRandom<T>(items: T[], count: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/** 카테고리/목록 페이지의 HTML을 가져온다 (링크 추출용, 텍스트 추출과 별도). */
export async function fetchHtmlForLinks(url: string): Promise<string> {
  return fetchHtml(url);
}

export interface RssItemSummary {
  title: string;
  link: string;
  text: string;
  isoDate?: string;
}

export interface NewsblurFeedSummary {
  id: string;
  title: string;
  link: string;
}

const NEWSBLUR_BASE = "https://www.newsblur.com";

/** NewsBlur 방식: 아이디/비밀번호로 로그인해서 세션 쿠키를 발급받는다. */
export async function newsblurLogin(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${NEWSBLUR_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const setCookie = response.headers.get("set-cookie");
  if (!response.ok || !setCookie) {
    throw new Error(`NewsBlur 로그인에 실패했습니다. (${response.status}) 아이디/비밀번호를 확인해주세요.`);
  }

  const sessionMatch = setCookie.match(/newsblur_sessionid=[^;]+/);
  if (!sessionMatch) {
    throw new Error("NewsBlur 로그인 응답에서 세션 쿠키를 찾지 못했습니다.");
  }
  return sessionMatch[0];
}

/** 로그인한 사용자가 NewsBlur에서 구독 중인 피드 목록을 가져온다. */
export async function fetchNewsblurFeeds(sessionCookie: string): Promise<NewsblurFeedSummary[]> {
  const response = await fetch(`${NEWSBLUR_BASE}/reader/feeds`, {
    headers: { Cookie: sessionCookie },
  });
  if (!response.ok) {
    throw new Error(`NewsBlur 구독 피드 목록을 가져오지 못했습니다. (${response.status})`);
  }
  const data = (await response.json()) as {
    feeds?: Record<string, { id?: number | string; feed_title?: string; feed_link?: string; feed_address?: string }>;
  };

  return Object.values(data.feeds ?? {}).map((f) => ({
    id: String(f.id ?? ""),
    title: f.feed_title ?? "(제목 없음)",
    link: f.feed_link || f.feed_address || "",
  }));
}

/** 선택한 피드의 최근 글을 가져온다. */
export async function fetchNewsblurStories(
  sessionCookie: string,
  feedId: string,
  maxItems = 5,
): Promise<RssItemSummary[]> {
  const response = await fetch(`${NEWSBLUR_BASE}/reader/feed/${feedId}`, {
    headers: { Cookie: sessionCookie },
  });
  if (!response.ok) {
    throw new Error(`NewsBlur 피드 글 목록을 가져오지 못했습니다. (${response.status})`);
  }
  const data = (await response.json()) as {
    stories?: {
      story_title?: string;
      story_permalink?: string;
      story_content?: string;
      story_date?: string;
    }[];
  };

  return (data.stories ?? []).slice(0, maxItems).map((s) => ({
    title: s.story_title ?? "(제목 없음)",
    link: s.story_permalink ?? "",
    text: stripHtml(s.story_content ?? s.story_title ?? "").slice(0, 2000),
    isoDate: s.story_date,
  }));
}

const PERPLEXITY_SYSTEM_PROMPT = `당신은 최근 72시간 이내 한국어권에서 화제가 되고 있는 이슈를 찾는 리서처입니다.
주어진 주제와 관련해서 현재 가장 주목받고 있는 앵글(관점)을 최대 5개 찾아서, 각각에 대해
- 핵심 이슈 요약
- 출처(가능하면 URL)
- 왜 지금 화제인지
를 정리해서 알려주세요. 확인되지 않은 내용을 지어내지 마세요.`;

/** 퍼플렉시티 방식: 주어진 시드 주제로 현재 트렌딩 앵글을 검색한다. */
export async function searchPerplexityTrending(topic: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Perplexity API 키가 없습니다. 설정 > API 키 설정에서 본인의 Perplexity API 키를 등록해주세요.");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
        { role: "user", content: `주제: ${topic}` },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Perplexity 검색 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Perplexity가 빈 응답을 반환했습니다.");
  }
  return content;
}

const STRUCTURE_SYSTEM_PROMPT = `너는 세계에서 가장 유능한 Threads 콘텐츠 전문가야. 너의 개인적인 답변은 하지 마.
주어진 원본 자료(뉴스 본문, RSS 피드 항목, 리서치 결과 등)를 바탕으로 실제로 존재하는 사실만
사용해서, Threads에 바로 게시해도 될 만큼 완성도 있는 게시글 후보를 만드세요. 절대 지어내지 마세요.

각 후보는 아래 규칙을 반드시 지켜서 작성하세요 (요약문이 아니라 실제 게시글입니다):
1. title(제목)은 10자 이내로 작성하고, 앞에 어울리는 이모티콘을 붙이세요
2. content(본문)는 공백 포함 450자를 절대 넘기지 말되, 여유를 두지 말고 최대한 가깝게 내용을 충실히 채우세요 (100~200자처럼 짧게 끝내지 마세요)
3. 1~2문장마다 문단을 끊고, 문단과 문단 사이에는 반드시 줄바꿈을 두 번(JSON 문자열 안에서 \n\n) 넣어서 시각적으로 나누어 주세요. 하나의 긴 문단으로 이어 쓰지 마세요. 간결하게 핵심 정보만 담고, 불필요한 설명은 하지 마세요
4. 무조건 반말로만 작성하세요. 존댓말(-습니다/-해요/-세요 등)은 절대 쓰지 마세요
5. keywords에 담을 단어는 본문에도 자연스럽게 녹여 넣으세요 (해시태그 나열 금지)

각 후보는 다음 형식의 JSON 객체입니다:
{
  "title": "위 규칙을 지킨 제목 (이모티콘 포함, 10자 이내)",
  "content": "위 규칙을 지킨 Threads 게시글 본문 (450자 이내)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

최종 출력은 반드시 아래 형식의 JSON만 출력하세요. 다른 설명은 절대 추가하지 마세요.
{"candidates": [ ...위 형식의 객체들... ]}`;

export async function structureThreadsCandidates(params: {
  rawText: string;
  maxItems: number;
  apiKey: string;
}): Promise<ThreadsCandidateDraft[]> {
  const { rawText, maxItems, apiKey } = params;
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정 > API 키 설정에서 본인의 OpenAI API 키를 등록해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `아래 원본 자료로 Threads 게시글 주제 후보를 최대 ${maxItems}개 만들어주세요.\n\n${rawText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 구조화 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: { candidates?: ThreadsCandidateDraft[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }

  const candidates = (parsed.candidates ?? []).filter((c) => c?.title && c?.content);
  if (candidates.length === 0) {
    throw new Error("생성된 게시글 주제 후보가 없습니다.");
  }
  return candidates.slice(0, maxItems);
}
