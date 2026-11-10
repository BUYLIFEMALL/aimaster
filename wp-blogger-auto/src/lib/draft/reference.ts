import "server-only";
// 참고 주소 읽기 — 회원이 넣은 주소만, 공용 safe-fetch로(내부·사설 주소 차단). 본문 글자만 뽑아 AI 참고 자료로 쓴다.
// 읽은 원문은 저장하지 않는다(원고 생성에만 쓰고 버림).
import sanitizeHtml from "sanitize-html";
import { safeFetch } from "../safeFetch";

export type Reference = { url: string; title: string; text: string } | { url: string; error: string };

const MAX_BYTES = 2_000_000;
const MAX_CHARS = 6000;

export function parseRefUrls(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(/\s+/);
  const out: string[] = [];
  for (const v of list) {
    const s = String(v ?? "").trim();
    if (!/^https?:\/\//i.test(s)) continue;
    try { out.push(new URL(s).toString()); } catch { /* 형식 오류는 건너뜀 */ }
    if (out.length >= 3) break;
  }
  return [...new Set(out)];
}

export function extractText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const body = html.replace(/<(head|script|style|noscript|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ");
  const text = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  return { title, text };
}

export async function readReference(url: string, fetchImpl?: (u: string) => Promise<Response>): Promise<Reference> {
  try {
    const res = fetchImpl ? await fetchImpl(url) : (await safeFetch(url, { headers: { Accept: "text/html,text/plain" }, signal: AbortSignal.timeout(15_000) })).response;
    if (!res.ok) return { url, error: `읽지 못함(${res.status})` };
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return { url, error: "글 페이지가 아님" };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return { url, error: "페이지가 너무 큼" };
    const { title, text } = extractText(new TextDecoder("utf-8").decode(buf));
    return text.length < 100 ? { url, error: "본문이 거의 없음" } : { url, title, text };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message.slice(0, 80) : "읽지 못함" };
  }
}
