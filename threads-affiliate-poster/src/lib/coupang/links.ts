// Coupang Partners pays commission only through its tracking links. A plain shopping URL
// (www.coupang.com/vp/products/...) copied from the store earns nothing, so it is refused.
//
// Accepted:
// - link.coupang.com/a/...           short link made on partners.coupang.com (link generator)
// - link.coupang.com/re/AFFSDP?...   link returned by the Partners search API
// - coupang.com/...?...lptag=AF...   where a partner link lands after redirecting (still tracked)

export type CoupangLinkCheck = { ok: true } | { ok: false; reason: "invalid" | "not_coupang" | "plain_store_url" };

export function checkCoupangAffiliateLink(raw: string): CoupangLinkCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const host = url.hostname.toLowerCase();
  if (host === "link.coupang.com") return { ok: true };
  if (host === "coupang.com" || host.endsWith(".coupang.com")) {
    const lptag = url.searchParams.get("lptag") ?? "";
    return /^AF/i.test(lptag) ? { ok: true } : { ok: false, reason: "plain_store_url" };
  }
  return { ok: false, reason: "not_coupang" };
}

export const COUPANG_LINK_MESSAGES: Record<Exclude<CoupangLinkCheck, { ok: true }>["reason"], string> = {
  invalid: "올바른 링크 형식이 아닙니다. https:// 로 시작하는 전체 링크를 붙여넣어 주세요.",
  not_coupang: "쿠팡 링크가 아닙니다. 쿠팡파트너스에서 만든 링크(link.coupang.com/...)를 넣어주세요.",
  plain_store_url:
    "⚠️ 일반 쿠팡 쇼핑 주소라서 수수료가 잡히지 않습니다. 쿠팡파트너스 사이트(partners.coupang.com)의 [링크 생성]에서 만든 링크(link.coupang.com/a/...)를 넣어주세요.",
};
