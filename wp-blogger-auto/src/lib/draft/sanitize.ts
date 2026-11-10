// 원고 본문 HTML 정리 — 블로그에 올려도 안전한 태그만 남긴다(스크립트·이벤트 속성·iframe 제거).
// AI 결과와 회원 편집 결과 모두 저장 전에 거친다.
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["h2", "h3", "h4", "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "blockquote", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "hr", "code", "pre"],
  allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "width", "height"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  transformTags: {
    h1: "h2",
    a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, rel: "noopener nofollow", ...(attribs.target ? { target: "_blank" } : {}) } }),
  },
};

export function sanitizeBody(html: string): string {
  return sanitizeHtml(String(html ?? ""), OPTIONS).trim();
}

/** 글자 수(태그 제외) — 분량 확인용 */
export function textLength(html: string): number {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, "").length;
}

/** 주소 이름: 영문 소문자·숫자·하이픈, 60자 이내 */
export function cleanSlug(raw: string): string {
  return String(raw ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
}

/** 태그: 앞뒤 공백·# 제거, 중복 제거, 최대 10개·각 30자 */
export function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const t of tags) {
    const v = String(t ?? "").replace(/^#+/, "").replace(/[,<>]/g, " ").trim().slice(0, 30);
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
    if (out.length >= 10) break;
  }
  return out;
}
