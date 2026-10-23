// 2026-10-23 v2.16 후보 — 블로그 병합 A-2(BLOG → 에이전트): 주제로 최근 뉴스 자동 근거.
// BLOG `collect24HourNews`처럼 구글 뉴스 RSS 검색으로 최근 기사 제목·언론사·날짜를 근거 자료에 넣는다.
// BLOG의 socialMentionScore(언론사 수로 만든 추정 점수)는 가져오지 않는다. 읽기는 호출하는 쪽이 collector.fetchPublicHtml로 한다.
import * as cheerio from "cheerio";

export const NEWS_WINDOW_HOURS = 72;
export const MAX_NEWS_ITEMS = 8;
export interface TopicNewsItem { title: string; url: string; source: string; publishedAt: string }

export function topicNewsFeedUrl(topic: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(topic.trim().slice(0, 100))}&hl=ko&gl=KR&ceid=KR:ko`;
}

/** 구글 뉴스 RSS XML에서 최근 72시간 기사만 최신순 최대 8건 고른다. 외부 요청은 하지 않는다. */
export function parseTopicNews(xml: string, now = Date.now()): TopicNewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: TopicNewsItem[] = [];
  $("item").each((_, element) => {
    const item = $(element);
    const source = item.find("source").first().text().replace(/\s+/g, " ").trim().slice(0, 60);
    let title = item.find("title").first().text().replace(/\s+/g, " ").trim();
    while (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const url = item.find("link").first().text().trim();
    const at = Date.parse(item.find("pubDate").first().text().trim());
    if (!title || !/^https:\/\//.test(url) || !Number.isFinite(at)) return;
    if (at > now + 3600_000 || now - at > NEWS_WINDOW_HOURS * 3600_000) return;
    if (items.some((entry) => entry.title === title)) return;
    items.push({ title: title.slice(0, 200), url, source, publishedAt: new Date(at).toISOString() });
  });
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, MAX_NEWS_ITEMS);
}

/** 근거 자료에 붙일 뉴스 블록. 기사가 없으면 빈 문자열. 날짜는 한국 시간 날짜로. */
export function buildTopicNewsMaterial(items: TopicNewsItem[]): string {
  if (!items.length) return "";
  const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  return `[주제 최근 뉴스 — 최근 ${NEWS_WINDOW_HOURS}시간 기사 제목]\n` + items.map((item) => `- ${item.title} (${item.source || "언론사 미상"}, ${day(item.publishedAt)})`).join("\n");
}
