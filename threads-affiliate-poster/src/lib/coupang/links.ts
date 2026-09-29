// Coupang Partners pays commission only through its tracking links. A plain shopping URL
// (www.coupang.com/vp/products/...) copied from the store earns nothing, so it is refused.
//
// Accepted:
// - link.coupang.com/a/...           short link made on partners.coupang.com (link generator)
// - link.coupang.com/re/AFFSDP?...   link returned by the Partners search API
// - coupang.com/...?...lptag=AF...   where a partner link lands after redirecting (still tracked)

export type CoupangLinkCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not_coupang" | "plain_store_url" | "widget_url" };

export function checkCoupangAffiliateLink(raw: string): CoupangLinkCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const host = url.hostname.toLowerCase();
  if (host === "link.coupang.com") return { ok: true };
  // coupa.ng/... is the "이미지+텍스트" widget (iframe) address, not a link to post — it must be
  // resolved to its link.coupang.com link first (lookupCoupangWidgetAction).
  if (host === "coupa.ng") return { ok: false, reason: "widget_url" };
  if (host === "coupang.com" || host.endsWith(".coupang.com")) {
    const lptag = url.searchParams.get("lptag") ?? "";
    return /^AF/i.test(lptag) ? { ok: true } : { ok: false, reason: "plain_store_url" };
  }
  return { ok: false, reason: "not_coupang" };
}

export interface ParsedCoupangShare {
  url: string;
  imageUrl?: string;
  name?: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * The Partners link generator can copy a link as a plain URL or as an HTML snippet
 * (<a href="https://link.coupang.com/a/..."><img src="..." alt="상품명"></a>). Coupang blocks
 * server-side page fetches (403), so the snippet is the only way to get the photo/name
 * without scraping. Returns null when the text holds no link.
 */
export function parseCoupangShareCode(text: string): ParsedCoupangShare | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("<")) return { url: trimmed };

  const hrefs = [...trimmed.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map((m) => decodeEntities(m[1]));
  const url = hrefs.find((h) => checkCoupangAffiliateLink(h).ok) ?? hrefs.find((h) => /^https?:\/\//i.test(h));
  if (!url) return null;

  const img = trimmed.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  const alt = trimmed.match(/<img\b[^>]*\balt\s*=\s*["']([^"']*)["']/i)?.[1];
  const title = trimmed.match(/<a\b[^>]*\btitle\s*=\s*["']([^"']*)["']/i)?.[1];
  const anchorText = trimmed.match(/<a\b[^>]*>([^<]+)<\/a>/i)?.[1];
  const name = [alt, title, anchorText].map((v) => (v ? decodeEntities(v) : "")).find((v) => v.length > 1);

  // The blog tag's <img> is a 120x240 banner (Coupang logo + photo + "쇼핑하기" button), not a product
  // photo, so it is not used; the general tag (iframe) gives the clean photo via lookupCoupangWidgetAction.
  const imageUrl = img ? decodeEntities(img).replace(/^\/\//, "https://") : undefined;
  return {
    url,
    imageUrl: imageUrl && !/\/affiliate\/banner\//i.test(imageUrl) ? imageUrl : undefined,
    name: name || undefined,
  };
}

export const COUPANG_LINK_MESSAGES: Record<Exclude<CoupangLinkCheck, { ok: true }>["reason"], string> = {
  invalid: "올바른 링크 형식이 아닙니다. https:// 로 시작하는 전체 링크를 붙여넣어 주세요.",
  not_coupang: "쿠팡 링크가 아닙니다. 쿠팡파트너스에서 만든 링크(link.coupang.com/...)를 넣어주세요.",
  plain_store_url:
    "⚠️ 일반 쿠팡 쇼핑 주소라서 수수료가 잡히지 않습니다. 쿠팡파트너스 사이트(partners.coupang.com)의 [링크 생성]에서 만든 링크(link.coupang.com/a/...)를 넣어주세요.",
  widget_url:
    "HTML 코드의 상품 정보를 읽지 못했습니다. 잠시 후 다시 시도하거나, 같은 화면의 [단축 URL](link.coupang.com/a/...)을 복사해 넣어주세요.",
};

/** The widget address (https://coupa.ng/xxxx) inside the "이미지 + 텍스트" HTML code, or a pasted bare one. */
export function extractCoupaNgUrl(text: string): string | null {
  const match = text.match(/https?:\/\/coupa\.ng\/[A-Za-z0-9_-]+/i);
  return match ? match[0] : null;
}

// coupa.ng answers with a 301 to ads-partners.coupang.com/iframe/product?link=...&title=...&image=...
// (checked 2026-09-30). `image` is a CDN path; the 492x492 thumbnail of it is a good product photo.
export function parseCoupangWidgetRedirect(location: string): ParsedCoupangShare | null {
  let target: URL;
  try {
    target = new URL(location);
  } catch {
    return null;
  }
  const link = target.searchParams.get("link") ?? "";
  const longLink = target.searchParams.get("linkUrl") ?? "";
  const url = [link, longLink].find((candidate) => candidate && checkCoupangAffiliateLink(candidate).ok);
  if (!url) return null;

  const title = target.searchParams.get("title")?.trim();
  const imagePath = target.searchParams.get("image")?.trim().replace(/^\/+/, "");
  return {
    url,
    name: title || undefined,
    imageUrl: imagePath ? `https://thumbnail7.coupangcdn.com/thumbnails/remote/492x492ex/image/${imagePath}` : undefined,
  };
}
