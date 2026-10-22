// BLC-08a (2026-10-22): drafts/extract에서 그대로 옮긴 공개 주소 검사(SSRF 방어)·본문 추출 — 자료 수집(app/api/research)도 함께 쓴다.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_HTML_BYTES = 2_000_000;
export const MAX_TEXT_LENGTH = 20_000;

export function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [first, second] = address.split(".").map(Number);
    return first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd")
    || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
}

export async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!/^https?:$/.test(url.protocol) || (url.port && !["80", "443"].includes(url.port))) {
    throw new Error("http 또는 https의 일반 웹 주소만 사용할 수 있습니다.");
  }
  if (url.username || url.password || url.hostname === "localhost" || isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("공개 블로그 주소만 사용할 수 있습니다.");
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("공개 인터넷 주소만 가져올 수 있습니다.");
  }
  return url;
}

export async function readLimited(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_HTML_BYTES) throw new Error("가져올 글의 페이지 크기가 너무 큽니다.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("가져올 글의 페이지 크기가 너무 큽니다.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(output);
}

export function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function metaContent(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"));
  return tag?.[1] ? decodeHtml(tag[1].trim()) : "";
}

export function extractArticle(html: string) {
  const title = metaContent(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "가져온 블로그 글";
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const body = decodeHtml(withoutNoise)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  return { title: decodeHtml(title).replace(/\s+/g, " ").slice(0, 200), body };
}

export function findNaverMainFrame(html: string) {
  const frameTag = html.match(/<iframe\b[^>]*\bid=["']mainFrame["'][^>]*>/i)?.[0];
  const source = frameTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  return source ? decodeHtml(source) : null;
}

const UA = { "User-Agent": "AIMaster-SEO-Studio/1.0 (+https://www.buylife.xyz)" };

/** 공개 글 주소의 제목·본문을 읽는다(리디렉션 4회까지, 네이버 mainFrame 처리). drafts/extract와 같은 규칙. */
export async function fetchPublicArticle(rawUrl: string, timeoutMs = 12_000) {
  let url = await assertPublicUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  for (let redirects = 0; redirects < 4; redirects += 1) {
    const response = await fetch(url, { redirect: "manual", headers: UA, signal: AbortSignal.timeout(timeoutMs) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("리디렉션 주소를 확인할 수 없습니다.");
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`글을 가져오지 못했습니다. (${response.status})`);
    if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("HTML 글 주소만 가져올 수 있습니다.");
    const html = await readLimited(response);
    let article = extractArticle(html);
    if (article.body.length < 50) {
      const frameSource = findNaverMainFrame(html);
      if (frameSource) {
        const frameUrl = await assertPublicUrl(new URL(frameSource, url).toString());
        const frame = await fetch(frameUrl, { redirect: "manual", headers: UA, signal: AbortSignal.timeout(timeoutMs) });
        if (frame.ok && frame.headers.get("content-type")?.includes("text/html")) article = extractArticle(await readLimited(frame));
      }
    }
    return { ...article, url: url.toString() };
  }
  throw new Error("리디렉션이 너무 많습니다.");
}
