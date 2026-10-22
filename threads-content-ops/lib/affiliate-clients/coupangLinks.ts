// 공용 기준 코드 `affiliate-clients` — 쿠팡 파트너스 제휴 링크 판정·붙여넣은 HTML 해석(순수 함수, 브라우저·서버 공용).
// 기준: threads-affiliate-poster/src/lib/affiliate-clients/ · 사본: threads-content-ops/lib/affiliate-clients/
// 사본은 직접 고치지 않는다 — 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
// 2026-10-23 두 프로그램의 손 복사본을 합침(붙여넣은 HTML은 실행하지 않음, 길이 제한·스크립트 제거·쿠팡 이미지 주소만 허용).
//
// 쿠팡 파트너스는 추적 링크로만 수수료를 준다. 일반 쇼핑 주소(www.coupang.com/vp/products/...)는 수수료가 0이라 거부한다.
//   허용: link.coupang.com/a/...(링크 생성기), link.coupang.com/re/AFFSDP?...(검색 API),
//         *.coupang.com/...?lptag=AF...(제휴 링크가 이동한 최종 주소)

export const MAX_COUPANG_SHARE_LENGTH = 20_000;

export type CoupangLinkCheck = { ok: true } | { ok: false; reason: "invalid" | "not_coupang" | "plain_store_url" | "widget_url" };

export function checkCoupangAffiliateLink(raw: string): CoupangLinkCheck {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, reason: "invalid" }; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return { ok: false, reason: "invalid" };
  const host = url.hostname.toLowerCase();
  if (host === "link.coupang.com") return { ok: true };
  // coupa.ng/...는 「이미지+텍스트」 위젯(iframe) 주소라 그대로 올릴 링크가 아니다.
  if (host === "coupa.ng") return { ok: false, reason: "widget_url" };
  if (host === "coupang.com" || host.endsWith(".coupang.com")) {
    return /^AF/i.test(url.searchParams.get("lptag") ?? "") ? { ok: true } : { ok: false, reason: "plain_store_url" };
  }
  return { ok: false, reason: "not_coupang" };
}

export const COUPANG_LINK_MESSAGES: Record<Exclude<CoupangLinkCheck, { ok: true }>["reason"], string> = {
  invalid: "올바른 링크 형식이 아닙니다. https:// 로 시작하는 전체 제휴 링크를 붙여넣어 주세요.",
  not_coupang: "쿠팡 링크가 아닙니다. 쿠팡 파트너스에서 만든 링크(link.coupang.com/...)를 넣어 주세요.",
  plain_store_url:
    "⚠️ 일반 쿠팡 쇼핑 주소라서 수수료가 잡히지 않습니다. 쿠팡 파트너스 사이트(partners.coupang.com)의 [링크 생성]에서 만든 링크(link.coupang.com/a/...)를 넣어 주세요.",
  widget_url:
    "\"일반태그\"(iframe) 코드는 쿠팡이 서버 접속을 막아 읽을 수 없습니다. [이미지 + 텍스트]에서 \"블로그용 태그\"를 선택해 [HTML 복사]한 코드를 넣어 주세요.",
};

export function isCoupangImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && /(^|\.)coupangcdn\.com$/i.test(url.hostname);
  } catch { return false; }
}

/** 「블로그용 태그」 배너(로고+사진+버튼, 240x480), 예: https://img3a.coupangcdn.com/image/affiliate/banner/<hash>@2x.jpg */
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

/**
 * 링크 생성기가 복사해 주는 일반 주소 또는 HTML(<a href="https://link.coupang.com/a/..."><img src="..." alt="상품명"></a>)을 읽는다.
 * 쿠팡은 서버의 상품 페이지 접속을 막아서(403) 사진·이름은 이 HTML에서만 얻는다. 링크가 없으면 null.
 * 블로그용 태그의 <img>는 상품 사진이 아니라 배너라 bannerUrl로 돌려주고, 사진은 서버가 잘라 낸다(coupangBanner.ts).
 */
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
  // iframe 주소는 「블로그용 태그를 쓰세요」 안내를 주려고만 남긴다.
  const widget = html.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!href) return widget ? { url: decodeEntities(widget) } : null;
  const body = html.slice(anchor!.index! + anchor![0].length).split(/<\/a\s*>/i)[0];
  const img = body.match(/<img\b[^>]*>/i)?.[0] ?? "";
  const image = img.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  const alt = img.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
  const title = anchor![0].match(/\btitle\s*=\s*["']([^"']*)["']/i)?.[1];
  const name = [alt, title, body.replace(/<[^>]*>/g, "")].map((v) => decodeEntities(v ?? "")).find((v) => v.length > 1);
  const imageUrl = image ? decodeEntities(image).replace(/^\/\//, "https://") : "";
  return {
    url: decodeEntities(href), name,
    ...(isCoupangBannerUrl(imageUrl) ? { bannerUrl: imageUrl } : isCoupangImageUrl(imageUrl) ? { imageUrl } : {}),
  };
}

/** 붙여넣은 내용을 읽고 제휴 링크인지까지 확인한다. 문제가 있으면 회원에게 보여 줄 문장으로 오류를 던진다. */
export function readCoupangShare(text: string): ParsedCoupangShare {
  if (typeof text !== "string" || text.length > MAX_COUPANG_SHARE_LENGTH) throw new Error("HTML 코드는 20,000자 이내로 입력해 주세요.");
  const parsed = parseCoupangShareCode(text);
  if (!parsed) throw new Error("붙여넣은 내용에서 제휴 링크를 찾지 못했습니다.");
  const check = checkCoupangAffiliateLink(parsed.url);
  if (!check.ok) throw new Error(COUPANG_LINK_MESSAGES[check.reason]);
  if (parsed.url.length > 2000) throw new Error("제휴 링크는 2,000자 이내로 입력해 주세요.");
  return parsed;
}

/** 「이미지 + 텍스트」 HTML 안의 위젯 주소(https://coupa.ng/xxxx) 또는 그 주소만 붙여넣은 경우. */
export function extractCoupaNgUrl(text: string): string | null {
  const match = text.match(/https?:\/\/coupa\.ng\/[A-Za-z0-9_-]+/i);
  return match ? match[0] : null;
}

// coupa.ng는 ads-partners.coupang.com/iframe/product?link=...&title=...&image=...로 301 이동한다(2026-09-30 확인).
// image는 CDN 경로이고, 그 492x492 썸네일이 상품 사진으로 쓰기 좋다.
export function parseCoupangWidgetRedirect(location: string): ParsedCoupangShare | null {
  let target: URL;
  try { target = new URL(location); } catch { return null; }
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
