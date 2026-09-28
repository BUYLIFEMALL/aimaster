import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_LENGTH = 20_000;

function isPrivateAddress(address: string) {
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

async function assertPublicUrl(rawUrl: string) {
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

async function readLimited(response: Response) {
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

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metaContent(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"));
  return tag?.[1] ? decodeHtml(tag[1].trim()) : "";
}

function extractArticle(html: string) {
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

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { url?: string; confirmedRights?: boolean } | null;
  if (!input?.confirmedRights) return NextResponse.json({ error: "재가공 권한이 있는 글인지 확인해주세요." }, { status: 400 });
  if (!input.url?.trim() || input.url.trim().length > 2_000) return NextResponse.json({ error: "가져올 블로그 주소를 입력해주세요." }, { status: 400 });

  try {
    let url = await assertPublicUrl(input.url.trim());
    for (let redirects = 0; redirects < 4; redirects += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "AIMaster-SEO-Studio/1.0 (+https://www.buylife.xyz)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("리디렉션 주소를 확인할 수 없습니다.");
        url = await assertPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error(`글을 가져오지 못했습니다. (${response.status})`);
      if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("HTML 블로그 글 주소만 가져올 수 있습니다.");
      const article = extractArticle(await readLimited(response));
      if (article.body.length < 50) throw new Error("본문을 충분히 찾지 못했습니다. 글을 직접 붙여넣어주세요.");
      return NextResponse.json({ article: { ...article, url: url.toString() } });
    }
    throw new Error("리디렉션이 너무 많습니다.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "글을 가져오는 중 오류가 발생했습니다." }, { status: 400 });
  }
}
