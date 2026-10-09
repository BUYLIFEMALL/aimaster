// Ported from threads-affiliate-poster/src/lib/coupang/links.ts.
// Shared by the paste form and server; never executes pasted HTML.
export const MAX_COUPANG_SHARE_LENGTH = 20_000;
export type CoupangLinkCheck = { ok: true } | { ok: false; reason: "invalid" | "not_coupang" | "plain_store_url" | "widget_url" };

export function checkCoupangAffiliateLink(raw: string): CoupangLinkCheck {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, reason: "invalid" }; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return { ok: false, reason: "invalid" };
  const host = url.hostname.toLowerCase();
  if (host === "link.coupang.com") return { ok: true };
  if (host === "coupa.ng") return { ok: false, reason: "widget_url" };
  if (host === "coupang.com" || host.endsWith(".coupang.com")) {
    return /^AF/i.test(url.searchParams.get("lptag") ?? "") ? { ok: true } : { ok: false, reason: "plain_store_url" };
  }
  return { ok: false, reason: "not_coupang" };
}

export const COUPANG_LINK_MESSAGES: Record<Exclude<CoupangLinkCheck, { ok: true }>["reason"], string> = {
  invalid: "올바른 링크 형식이 아닙니다. https:// 로 시작하는 전체 제휴 링크를 붙여넣어 주세요.",
  not_coupang: "쿠팡 링크가 아닙니다. 쿠팡 파트너스에서 만든 링크(link.coupang.com/...)를 넣어 주세요.",
  plain_store_url: "일반 쿠팡 쇼핑 주소는 등록되지 않습니다. 쿠팡 파트너스의 [링크 생성]에서 만든 제휴 링크를 넣어 주세요.",
  widget_url: "일반태그(iframe)는 읽을 수 없습니다. [이미지 + 텍스트]에서 블로그용 태그를 선택해 [HTML 복사]한 코드를 넣어 주세요.",
};

export function isCoupangImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && /(^|\.)coupangcdn\.com$/i.test(url.hostname);
  } catch { return false; }
}

export function isCoupangBannerUrl(value: string): boolean {
  return isCoupangImageUrl(value) && new URL(value).pathname.includes("/affiliate/banner/");
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:\d+|x[\da-f]+);/gi, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (entity[1] !== "#") return named[entity.toLowerCase()] ?? entity;
    const code = entity[2].toLowerCase() === "x" ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).trim();
}

export type ParsedCoupangShare = { url: string; name?: string; imageUrl?: string; bannerUrl?: string };

export function parseCoupangShareCode(text: string): ParsedCoupangShare | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_COUPANG_SHARE_LENGTH) return null;
  if (!trimmed.includes("<")) return { url: trimmed };
  const html = trimmed.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)];
  const anchor = anchors.find(([tag]) => {
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    return href && checkCoupangAffiliateLink(decodeEntities(href)).ok;
  }) ?? anchors[0];
  const href = anchor?.[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  // Preserve iframe URL only to give the specific blog-tag instruction.
  const widget = html.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!href) return widget ? { url: decodeEntities(widget) } : null;
  const body = html.slice(anchor!.index! + anchor![0].length).split(/<\/a\s*>/i)[0];
  const img = body.match(/<img\b[^>]*>/i)?.[0] ?? "";
  const image = img.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  const alt = img.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
  const title = anchor![0].match(/\btitle\s*=\s*["']([^"']*)["']/i)?.[1];
  const name = [alt, title, body.replace(/<[^>]*>/g, "")].map(v => decodeEntities(v ?? "")).find(v => v.length > 1);
  const imageUrl = image ? decodeEntities(image).replace(/^\/\//, "https://") : "";
  return {
    url: decodeEntities(href), name,
    ...(isCoupangBannerUrl(imageUrl) ? { bannerUrl: imageUrl } : isCoupangImageUrl(imageUrl) ? { imageUrl } : {}),
  };
}

export function readCoupangShare(text: string): ParsedCoupangShare {
  if (typeof text !== "string" || text.length > MAX_COUPANG_SHARE_LENGTH) throw new Error("HTML 코드는 20,000자 이내로 입력해 주세요.");
  const parsed = parseCoupangShareCode(text);
  if (!parsed) throw new Error("붙여넣은 내용에서 제휴 링크를 찾지 못했습니다.");
  const check = checkCoupangAffiliateLink(parsed.url);
  if (!check.ok) throw new Error(COUPANG_LINK_MESSAGES[check.reason]);
  if (parsed.url.length > 2000) throw new Error("제휴 링크는 2,000자 이내로 입력해 주세요.");
  return parsed;
}
