import "server-only";
import { decodeEntities, parseBlogId, parsePostRef } from "@/lib/blogParse";

// 네이버 블로그 공개 글만 읽는다. 주소는 아래 고정 호스트만 만들고(임의 주소 프록시 없음), 로그인·차단 우회는 하지 않는다.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

export interface FeedPost { title: string; link: string; logNo: string; date: string; category: string; summary: string }

async function getText(url: string, timeoutMs = 12_000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const cdata = (s: string) => decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();

/** 공개 RSS(최신 글 최대 50개) */
export async function fetchFeed(blogId: string): Promise<{ name: string; posts: FeedPost[] } | null> {
  const xml = await getText(`https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`);
  if (!xml || !xml.includes("<rss")) return null;
  const head = xml.split("<item>")[0];
  const name = cdata(head.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? blogId);
  const posts: FeedPost[] = [];
  for (const chunk of xml.split("<item>").slice(1)) {
    const pick = (tag: string) => cdata(chunk.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    const link = pick("guid") || pick("link");
    const ref = parsePostRef(link);
    if (!ref) continue;
    const summary = pick("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    const d = new Date(pick("pubDate"));
    posts.push({ title: pick("title"), link: `https://blog.naver.com/${ref.blogId}/${ref.logNo}`, logNo: ref.logNo, date: Number.isNaN(d.getTime()) ? "" : d.toISOString(), category: pick("category"), summary });
  }
  return { name, posts };
}

/** 글 본문 텍스트(스마트에디터 문단 단위). 실패하면 null */
export async function fetchPostText(blogId: string, logNo: string, maxChars = 6000): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(blogId) || !/^\d{6,20}$/.test(logNo)) return null;
  const html = await getText(`https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`);
  if (!html) return null;
  const start = html.indexOf("se-main-container");
  const seg = start >= 0 ? html.slice(start) : html;
  const paras = [...seg.matchAll(/<p class="se-text-paragraph[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decodeEntities(m[1].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).replace(/​/g, "").trim()).filter(Boolean);
  let text = paras.join("\n");
  if (!text) {
    // 예전 에디터 글: postViewArea 안의 텍스트
    const old = html.match(/id="postViewArea"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1];
    if (old) text = decodeEntities(old.replace(/<br\s*\/?>/g, "\n").replace(/<\/p>/g, "\n").replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
  }
  return text ? text.slice(0, maxChars) : null;
}

/** 네이버 블로그 글 주소면 본문을 읽는다(검색 결과의 상위 글 등). 블로그 글이 아니면 null */
export async function fetchBlogUrlText(url: string, maxChars = 6000): Promise<string | null> {
  const ref = parsePostRef(url);
  return ref ? fetchPostText(ref.blogId, ref.logNo, maxChars) : null;
}

/** 일정 개수씩 나눠 병렬로 처리한다(네이버에 한꺼번에 많이 요청하지 않도록) */
export async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export { parseBlogId, parsePostRef };
