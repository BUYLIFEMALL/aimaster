// threads-auto(boksajang/threads-auto, MIT, 커밋 bd2fec7)에서 옮김 —
//   src/main/services/naver-brand-link-input.ts(naver.me 링크 검사),
//   src/main/services/naver-brand-compliance.ts(쇼핑/여행 커넥트 고지 문구),
//   chrome-extension/content-script.js `currentNaverIdentity`·`normalizeNaverImage`(도착 주소·이미지 주소 검사).
// 서버에서 확장이 보낸 수집 결과를 다시 검사할 때도 같은 규칙을 쓴다(확장 결과를 그대로 믿지 않음).

export type NaverConnectKind = "SHOPPING" | "TRAVEL";

/** 네이버 브랜드커넥트에서 발급한 naver.me 링크인지(https, 계정·포트 없음, 경로 있음). */
export function isNaverBrandAffiliateUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "naver.me" && !url.username && !url.password && !url.port && url.pathname.length > 1;
  } catch {
    return false;
  }
}

/** 줄마다 하나씩 붙여 넣은 링크를 나눈다(빈 줄·중복 제거). naver.me가 아닌 줄은 따로 돌려준다. 최대 30개. */
export function parseNaverBrandLinks(text: string): { links: string[]; rejected: string[] } {
  const lines = [...new Set(String(text ?? "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean))];
  const links: string[] = [];
  const rejected: string[] = [];
  for (const line of lines) (isNaverBrandAffiliateUrl(line) ? links : rejected).push(line);
  return { links: links.slice(0, 30), rejected };
}

/** 원본 고지 문구 그대로 — 첫 줄에 항상 붙인다(쇼핑/여행 구분, 2026-11-16 주인님 결정 4). */
export const NAVER_SHOPPING_DISCLOSURE = "※ 이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다. ※";
export const NAVER_TRAVEL_DISCLOSURE = "※ 이 포스팅은 네이버 여행 커넥트 활동의 일환으로, 예약 발생 시 수수료를 제공받습니다. ※";

/** 실제 상품 페이지 주소로 쇼핑/여행과 상품 식별값을 판별한다. 허용 주소가 아니면 null(PRODUCT_IDENTITY_MISMATCH). */
export function naverProductIdentity(finalUrl: string): { kind: NaverConnectKind; productKey: string } | null {
  let url: URL;
  try { url = new URL(finalUrl); } catch { return null; }
  if (url.protocol !== "https:") return null;
  if (url.hostname === "pkgtour.naver.com") {
    const travel = /^\/products\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
    return travel ? { kind: "TRAVEL", productKey: `${url.hostname}:${travel[1]}:${travel[2]}` } : null;
  }
  const match = /\/products\/(\d+)/.exec(url.pathname);
  if (!match || !["brand.naver.com", "smartstore.naver.com", "shopping.naver.com"].includes(url.hostname)) return null;
  return { kind: "SHOPPING", productKey: `${url.hostname}:${match[1]}` };
}

/** 네이버 이미지 서버(pstatic.net) 주소만 https로 남긴다. */
export function normalizeNaverImage(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol) || !(host === "pstatic.net" || host.endsWith(".pstatic.net"))) return null;
    url.protocol = "https:"; url.username = ""; url.password = ""; url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const clip = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export interface CollectedNaverProduct {
  finalUrl: string;
  kind: NaverConnectKind;
  productName: string;
  imageUrls: string[];
  reviews: { text: string; rating?: number }[];
  facts: string[];
}

/** 확장이 보낸 수집 결과를 서버에서 다시 검사·정리한다. 상품 페이지가 아니거나 이름·이미지가 없으면 오류 문구. */
export function sanitizeCollected(raw: unknown): CollectedNaverProduct | { error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const finalUrl = clip(r.finalUrl, 1000);
  const identity = naverProductIdentity(finalUrl);
  if (!identity) return { error: "열린 페이지가 네이버 상품 페이지가 아닙니다(도착 주소 확인 필요)." };
  const productName = clip(r.title, 300);
  const imageUrls = [...new Set((Array.isArray(r.imageUrls) ? r.imageUrls : []).map(normalizeNaverImage).filter((v): v is string => Boolean(v)))].slice(0, 10);
  const reviews = (Array.isArray(r.reviews) ? r.reviews : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const text = clip(o.text, 600);
      const rating = Number(o.rating);
      return text.length >= 10 ? { text, ...(rating >= 1 && rating <= 5 ? { rating } : {}) } : null;
    })
    .filter((v): v is { text: string; rating?: number } => Boolean(v))
    .slice(0, 8);
  const facts = (Array.isArray(r.facts) ? r.facts : []).map((f) => clip(f, 300)).filter(Boolean).slice(0, 30);
  if (!productName) return { error: "상품명을 찾지 못했습니다." };
  if (!imageUrls.length) return { error: "상품 이미지를 찾지 못했습니다." };
  return { finalUrl, kind: identity.kind, productName, imageUrls, reviews, facts };
}

/** 글 생성에 넘길 근거 묶음(수집한 사실·후기 원문만, 지어내기 금지 안내 포함). */
export function evidenceText(c: { facts: string[]; reviews: { text: string; rating?: number }[] }): string {
  const parts: string[] = [];
  if (c.facts.length) parts.push(`상품 페이지 정보: ${c.facts.slice(0, 12).join(" / ")}`);
  if (c.reviews.length) {
    parts.push(`실제 구매 후기(원문 일부): ${c.reviews.map((x) => `${x.rating ? `[평점 ${x.rating}] ` : ""}${x.text.slice(0, 200)}`).join(" | ")}`);
  }
  parts.push("작성 규칙: 위 정보와 후기에 없는 효능·수치·후기는 지어내지 말고, 후기를 내 경험처럼 쓰지 말 것. 과장 표현 금지.");
  return parts.join("\n");
}
