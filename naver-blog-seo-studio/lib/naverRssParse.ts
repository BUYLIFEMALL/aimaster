// BLC-08b (2026-10-22): 네이버 블로그 공개 RSS 해석 — 순수 함수(시험에서 바로 import).
export interface RssPost { title: string; link: string; summary: string }

const decode = (value: string) => value
  .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

const tag = (item: string, name: string) => decode(item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "");

export function parseNaverRss(xml: string, max = 10): { name: string; posts: RssPost[] } {
  const channel = xml.split(/<item>/i)[0] ?? "";
  const name = tag(channel, "title");
  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => ({ title: tag(m[1], "title"), link: tag(m[1], "link"), summary: tag(m[1], "description") }))
    .filter((p) => p.title && /^https:\/\/(m\.)?blog\.naver\.com\//.test(p.link))
    .slice(0, max);
  return { name, posts };
}
