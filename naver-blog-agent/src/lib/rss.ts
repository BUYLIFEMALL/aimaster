import * as cheerio from "cheerio";
import { sourceUrl } from "./sourceBundle";

/** XML만 해석한다. 외부 엔티티·기사/이미지 주소를 추가 요청하지 않는다. */
export function readFeed(xml: string, feedUrl: string) {
  const $ = cheerio.load(xml, {xmlMode: true});
  if (!$("rss, feed, RDF, rdf\\:RDF").length) throw new Error("RSS 또는 Atom 피드 주소를 입력해 주세요.");
  const items: {title: string; url: string; text: string}[] = [];
  $("item, entry").each((_, element) => {
    if (items.length >= 5) return;
    const item = $(element);
    const clean = (html: string) => { const doc = cheerio.load(html); doc("script,style").remove(); return doc.text().replace(/\s+/g, " ").trim(); };
    const title = clean(item.find("title").first().text()).slice(0, 200);
    const rawLink = item.find('link[rel="alternate"]').attr("href") || item.find("link[href]").attr("href") || item.find("link").first().text();
    let url: string | null = null;
    try { url = sourceUrl(new URL(rawLink.trim(), feedUrl).href); } catch {}
    const content = item.find("content\\:encoded").first().text() || item.find("content").first().text() || item.find("description, summary").first().text();
    const text = clean(content).slice(0, 3000);
    if (title && rawLink.trim() && url && text.length >= 30 && !items.some(entry => entry.url === url)) items.push({title, url, text});
  });
  if (!items.length) throw new Error("원문이 있는 피드 항목을 찾지 못했습니다. 제목만 있는 피드는 글감으로 저장하지 않습니다.");
  return items;
}
