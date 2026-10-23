import "server-only";
import { parseNaverRss } from "./naverRssParse";
import { fetchPublicArticle } from "./safeFetch";
import type { StylePost } from "./style";

// BLC-08b (2026-10-22): 회원이 입력한 블로그 ID의 공개 RSS(고정 주소)에서 최신 글 N개와 본문을 읽는다. 로그인이 필요한 글은 읽지 않는다.
export async function fetchBlogStylePosts(blogId: string, depth: number): Promise<{ name: string; posts: StylePost[] }> {
  let response: Response;
  try {
    response = await fetch(`https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`, { headers: { "User-Agent": "AIMaster-SEO-Studio/1.0 (+https://www.buylife.xyz)" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
  } catch {
    throw new Error("블로그 공개 글 목록(RSS)에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!response.ok) throw new Error("블로그 공개 글 목록(RSS)을 읽지 못했습니다. 블로그 ID와 공개 설정을 확인하거나 글 표본을 붙여 넣어주세요.");
  const { name, posts } = parseNaverRss(await response.text(), depth);
  if (!posts.length) throw new Error("블로그에서 공개 글을 찾지 못했습니다. 글 표본을 붙여 넣어주세요.");
  const texts = await Promise.all(posts.map((p) => fetchPublicArticle(p.link).then((a) => a.body).catch(() => "")));
  return { name: name || blogId, posts: posts.map((p, i) => ({ title: p.title, link: p.link, text: (texts[i] || p.summary).slice(0, 4_000) })) };
}
